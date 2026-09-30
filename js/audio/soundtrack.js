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
 * the file itself already begins and ends softly.
 */
export class Soundtrack {
  constructor(src) {
    this.el = new Audio();
    this.el.src = src;
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
        this.#emit();
      },
      () => {
        // Refused or interrupted: stay quiet and try again on the next gesture.
        this.starting = false;
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
    const target = this.wanted ? this.level : 0;
    this.current = damp(this.current, target, 0.7, dt);
    this.el.volume = clamp(this.current);
    if (!this.wanted && this.current < 0.004) {
      this.#stop();
      this.#emit();
    }
  }
}
