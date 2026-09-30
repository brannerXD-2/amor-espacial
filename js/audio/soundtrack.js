import { clamp, damp } from '../util/math.js';

const STORAGE_KEY = 'dos-puntos:sonido';

/**
 * Background music with three rules: it never starts on its own, it fades whenever the
 * browser lets it, and it follows the tab (silent while the page is hidden).
 *
 * Starting is the delicate part. Browsers only allow `play()` inside a real gesture, and
 * touch screens only count the *release* of a tap (pointerup), not the press. So `prime()`
 * is safe to call on every gesture: it does nothing once the music is running, and simply
 * tries again after a refusal.
 *
 * Some phones (iOS Safari) ignore `audio.volume`. There the music can only be on or off;
 * the files themselves already begin and end softly.
 *
 * The song is split in two so its big moment lands where the story wants it, whatever the
 * reader's pace: `calm` is the hypnotic opening as a seamless loop, `drop` is everything from
 * just before the synthesizers enter. `cue('drop')` moves from one to the other; when `drop`
 * ends the calm loop comes back. One <audio> element is reused (its `src` swaps), because
 * iOS lets an element that was started by a gesture keep playing later without one.
 */
export class Soundtrack {
  constructor(tracks) {
    this.tracks = tracks; // { calm: url, drop: url }
    this.track = 'calm'; // what the element currently holds
    this.wantedTrack = 'calm';
    this.swap = null; // { to, busy } while changing track
    this.prefetched = false;

    this.el = new Audio();
    this.el.src = tracks.calm;
    this.el.loop = true;
    this.el.preload = 'none';
    this.el.setAttribute('playsinline', '');
    this.el.setAttribute('aria-hidden', 'true');
    this.el.hidden = true;
    document.body.append(this.el); // old Safari behaves better with audio that lives in the page

    this.canFade = this.#detectVolumeSupport();
    this.wanted = this.#readPreference();
    this.level = 0; // scene loudness 0..1
    this.current = 0;
    this.started = false; // audio is really playing (or resuming)
    this.starting = false; // play() requested, browser has not answered yet
    this.suspended = false; // paused only because the tab is hidden
    this.expectPause = false;
    this.announced = false;
    this.listeners = new Set();

    // Something else paused us (phone call, headphones unplugged): show it and allow a restart.
    this.el.addEventListener('pause', () => {
      if (this.el.ended) return; // reached the end of the synth section: not an interruption
      if (this.expectPause) {
        this.expectPause = false;
        return;
      }
      if (this.started) {
        this.started = false;
        this.#emit();
      }
    });
    this.el.addEventListener('error', () => {
      console.warn('[sonido] no se pudo cargar la música', this.el.error?.code);
    });
    // The synth section plays once; afterwards the hypnotic loop returns.
    this.el.addEventListener('ended', () => {
      if (this.track === 'drop') this.cue('calm');
    });

    // Every event a browser may count as "a real gesture". Safari only accepts touchend / click,
    // Chrome accepts pointerdown for mice, keyboards use keydown. Priming is idempotent.
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
      document.addEventListener(type, () => this.prime(), { capture: true, passive: true });
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.started) {
          this.suspended = true;
          this.expectPause = true;
          this.el.pause();
        }
      } else if (this.suspended) {
        this.suspended = false;
        this.#resume();
      }
    });
  }

  #detectVolumeSupport() {
    const probe = new Audio();
    probe.volume = 0.5;
    return probe.volume === 0.5;
  }

  #readPreference() {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'off';
    } catch {
      return true;
    }
  }

  /** True when music is wanted and actually playing. */
  get active() {
    return this.wanted && this.started;
  }

  onChange(fn) {
    this.listeners.add(fn);
  }

  #emit() {
    this.listeners.forEach((fn) => fn());
  }

  /** Starts downloading early so the first gesture can play instantly. */
  warmUp() {
    if (!this.wanted || this.el.preload === 'auto') return;
    this.el.preload = 'auto';
    this.el.load();
  }

  /** Must run inside a user gesture. Safe to call as often as you like. */
  prime() {
    if (!this.wanted || this.started || this.starting) return;
    this.#play();
  }

  #play() {
    const { el } = this;
    this.starting = true;
    if (this.canFade) {
      el.volume = 0;
      this.current = 0;
    }
    let request;
    try {
      request = el.play();
    } catch {
      request = Promise.reject(new Error('play() threw'));
    }
    Promise.resolve(request).then(
      () => {
        this.starting = false;
        this.started = true;
        this.#announce();
        this.#prefetchDrop();
        this.#emit();
        if (this.track !== this.wantedTrack) this.cue(this.wantedTrack);
      },
      () => {
        // Refused or interrupted: stay quiet and try again on the next gesture.
        this.starting = false;
      },
    );
  }

  /** Warms the HTTP cache with the second file so the switch happens without a wait. */
  #prefetchDrop() {
    if (this.prefetched) return;
    this.prefetched = true;
    fetch(this.tracks.drop).catch(() => {});
  }

  /**
   * Switches between 'calm' (hypnotic loop) and 'drop' (the synthesizers). Safe to call any
   * time; if the music is not playing yet the choice is simply remembered.
   */
  cue(name) {
    this.wantedTrack = name;
    if (name === this.track && !this.swap) return;
    if (!this.started) {
      if (!this.starting) this.#load(name);
      return;
    }
    if (this.swap) {
      if (!this.swap.busy) this.swap.to = name;
      return;
    }
    if (!this.canFade) {
      this.swap = { to: name, busy: true };
      this.#swapTrack(name);
      return;
    }
    this.swap = { to: name, busy: false }; // update() fades out, then swaps
  }

  /** Points the element at a track without playing it. */
  #load(name) {
    if (!this.el.paused) this.expectPause = true; // changing src stops playback by itself
    this.track = name;
    this.el.src = this.tracks[name];
    this.el.loop = name === 'calm';
  }

  #swapTrack(name) {
    const { el } = this;
    this.#load(name);
    if (this.canFade) {
      el.volume = 0;
      this.current = 0;
    }
    Promise.resolve(el.play()).then(
      () => {
        this.swap = null;
        this.expectPause = false;
        if (this.track !== this.wantedTrack) this.cue(this.wantedTrack);
      },
      () => {
        // Refused (a browser that wants a fresh gesture): the next gesture restarts it.
        this.swap = null;
        this.started = false;
        this.#emit();
      },
    );
  }

  /** Lock-screen / headset controls: a proper title instead of "unknown", and play/pause that work. */
  #announce() {
    if (this.announced || !('mediaSession' in navigator)) return;
    this.announced = true;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Dos puntos en el mismo universo',
        artist: 'Alexander Nakarada',
      });
      navigator.mediaSession.setActionHandler('play', () => this.setWanted(true));
      navigator.mediaSession.setActionHandler('pause', () => this.setWanted(false));
    } catch {
      /* not supported: nothing lost */
    }
  }

  #resume() {
    Promise.resolve(this.el.play()).catch(() => {
      this.started = false;
      this.#emit();
    });
  }

  setWanted(value) {
    this.wanted = value;
    try {
      localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
    } catch {
      /* private mode: the preference just won't persist */
    }
    if (value) {
      this.prime();
    } else if (!this.canFade && this.started) {
      this.#stop();
    }
    this.#emit();
  }

  toggle() {
    this.setWanted(!this.wanted);
    return this.wanted;
  }

  #stop() {
    this.expectPause = true;
    this.el.pause();
    this.started = false;
  }

  /** Target loudness for the current scene (0 = silence, 1 = full). */
  setLevel(level) {
    this.level = level;
  }

  update(dt) {
    if (!this.started || !this.canFade || this.suspended) return;

    // Changing track: fade the current one out, swap, and let the new one rise from silence.
    if (this.swap && !this.swap.busy) {
      this.current = damp(this.current, 0, 6, dt);
      this.el.volume = clamp(this.current);
      if (this.current < 0.03) {
        this.swap.busy = true;
        this.#swapTrack(this.swap.to);
      }
      return;
    }

    const target = this.wanted ? this.level : 0;
    this.current = damp(this.current, target, 0.7, dt);
    this.el.volume = clamp(this.current);
    if (!this.wanted && this.current < 0.004) {
      this.#stop();
      this.#emit();
    }
  }
}
