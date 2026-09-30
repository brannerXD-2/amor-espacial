import { COLORS } from '../config.js';
import { CONTENT } from '../content.js';
import { drawGlow, drawPoint } from '../engine/sprites.js';
import { sleep, tween } from '../util/async.js';
import { clamp, damp, easeInOut, easeOut, smoothstep, TAU } from '../util/math.js';

const RAMP_SECONDS = 0.9;

/**
 * The first thing on screen: a quiet point of light. One tap on it and the sky rushes open.
 *
 * It is a real tap (a <button>, so the browser delivers a proper `click`) rather than a press
 * and hold: on iPhone that is the only gesture Safari reliably accepts for starting music.
 */
class EntryPoint {
  constructor(app) {
    this.app = app;
    this.alpha = 0;
    this.progress = 0;
    this.burst = 0;
    this.triggered = false;
    this.pressing = false; // finger or pointer is down on the button
    this.pressed = 0; // smoothed, for a little feedback under the finger
    this.z = 8;
  }

  trigger() {
    this.triggered = true;
  }

  update(dt) {
    const { stage, sound } = this.app;
    this.pressed = damp(this.pressed, this.pressing ? 1 : 0, 14, dt);
    if (!this.triggered || this.progress >= 1) return; // after that the scene drives the arrival

    this.progress = clamp(this.progress + dt / RAMP_SECONDS);
    const eased = smoothstep(0, 1, this.progress);
    if (!this.app.reduced) stage.starfield.warp = eased * 0.85;
    sound.setLevel(eased * 0.55);
  }

  draw(ctx, stage, t) {
    const x = stage.w / 2;
    const y = stage.h * 0.66;
    const a = this.alpha;
    const breath = 0.85 + 0.15 * Math.sin(t * 1.4);
    const p = this.progress;
    const press = this.pressed;

    drawGlow(ctx, x, y, 90 + p * 110 + press * 14, a * (0.12 + p * 0.35 + press * 0.12) * breath, COLORS.warm);
    drawPoint(ctx, x, y, { r: 3 + p * 2.5 + press * 0.8, a: a * (0.75 + p * 0.25), rgb: COLORS.warm, halo: 8 + p * 4, flare: true });

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(236,232,223,1)';
    // A slow breathing ring invites the tap; it tightens under the finger and fills once tapped.
    ctx.globalAlpha = a * (0.16 + 0.1 * (0.5 + 0.5 * Math.sin(t * 2)) * (1 - p) + press * 0.2);
    ctx.beginPath();
    ctx.arc(x, y, 30 - press * 3, 0, TAU);
    ctx.stroke();
    if (p > 0.005) {
      ctx.globalAlpha = a * 0.8;
      ctx.beginPath();
      ctx.arc(x, y, 30, -Math.PI / 2, -Math.PI / 2 + p * TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (this.burst > 0.005) drawGlow(ctx, x, y, Math.max(stage.w, stage.h) * (0.4 + this.burst * 0.7), this.burst * 0.6, COLORS.warm);
  }
}

/**
 * The very first second: one point of light appears in the middle of the dark,
 * sends out a single soft ring and fades — the stars catch fire outward from it.
 */
class Ignition {
  constructor(reduced) {
    this.reduced = reduced;
    this.t = 0;
    this.z = 9;
  }

  update(dt) {
    this.t += dt;
  }

  draw(ctx, stage) {
    const { t } = this;
    const x = stage.w / 2;
    const y = stage.h * 0.5;
    const presence = smoothstep(0, 0.6, t) * (1 - smoothstep(1.7, 2.6, t));
    const swell = smoothstep(0.2, 1.1, t);

    drawGlow(ctx, x, y, 34 + swell * 60, presence * 0.55, COLORS.warm);
    drawPoint(ctx, x, y, { r: 1.6 + swell * 2.4, a: presence, rgb: COLORS.warm, halo: 8, flare: true });
    if (this.reduced) return;

    const reach = Math.hypot(stage.w, stage.h) * 0.6;
    ctx.strokeStyle = 'rgba(255,228,196,1)';
    for (const [delay, width, strength] of [
      [0.55, 1.2, 0.34],
      [0.85, 0.8, 0.18],
    ]) {
      const p = clamp((t - delay) / 2);
      if (p <= 0 || p >= 1) continue;
      ctx.globalAlpha = (1 - p) * strength;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.arc(x, y, easeOut(p) * reach, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function writeWords(el, text) {
  const words = text.split(' ');
  el.replaceChildren(
    ...words.flatMap((word, i) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = word;
      return i < words.length - 1 ? [span, document.createTextNode(' ')] : [span];
    }),
  );
  return [...el.querySelectorAll('.word')];
}

/** Resolves on the tap (click) that opens the experience; also feeds the little press feedback. */
function waitForEntry(button, entry, sound) {
  return new Promise((resolve) => {
    const release = () => (entry.pressing = false);
    button.addEventListener('pointerdown', () => (entry.pressing = true));
    for (const type of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(type, release);
    button.addEventListener(
      'click',
      () => {
        // The music is started right here, inside the click itself, where every browser
        // (iPhone Safari included) accepts it. No timer, no promise before it.
        sound.prime({ force: true });
        entry.trigger();
        button.disabled = true;
        resolve();
      },
      { once: true },
    );
  });
}

export async function runUmbral(app) {
  const { stage, sound, hud } = app;
  const root = document.getElementById('umbral');
  const title = document.getElementById('umbral-title');
  const hint = document.getElementById('umbral-hint');
  const soundBtn = document.getElementById('umbral-sound');
  const enterBtn = document.getElementById('umbral-enter');
  const words = writeWords(title, CONTENT.umbral.title);
  hint.textContent = CONTENT.umbral.hint;

  const syncSoundLabel = () => {
    soundBtn.textContent = sound.wanted ? CONTENT.umbral.soundOn : CONTENT.umbral.soundOff;
    soundBtn.setAttribute('aria-pressed', String(sound.wanted));
  };
  syncSoundLabel();
  soundBtn.addEventListener('click', () => {
    sound.toggle();
    syncSoundLabel();
  });

  // Start fetching the music now (if wanted) so the first tap can play it instantly.
  sound.warmUp();

  stage.setBackdropBrightness(0);
  const entry = stage.add(new EntryPoint(app));

  // The sky wakes up in silence: a point of light, one ring, stars igniting outward.
  const ignition = stage.add(new Ignition(app.reduced));
  if (!app.reduced) stage.starfield.reveal = 0;
  tween(2200, (e) => stage.setBackdropBrightness(0.85 * e), easeInOut);
  tween(3000, (e) => (stage.starfield.reveal = app.reduced ? 1 : e), easeInOut);
  sleep(2800).then(() => stage.remove(ignition));
  app.veil.classList.add('is-clear');
  await sleep(1300);

  for (const word of words) {
    word.classList.add('is-in');
    await sleep(240);
  }
  await sleep(1300);

  tween(1500, (e) => (entry.alpha = e), easeInOut);
  await sleep(700);
  hint.classList.add('is-visible');
  soundBtn.classList.add('is-visible');
  enterBtn.disabled = false;
  enterBtn.focus({ preventScroll: true }); // Space / Enter also open it

  await waitForEntry(enterBtn, entry, sound);
  hud.showControls(); // the sound icon is there from now on, in case the browser blocked the music

  root.classList.add('is-leaving');
  words.forEach((w) => w.classList.remove('is-in'));
  words.forEach((w) => w.classList.add('is-out'));

  // Arrival: the streaks build up, light floods in, then everything relaxes into a still sky.
  await sleep(RAMP_SECONDS * 1000);
  tween(1300, (e) => (entry.burst = e < 0.4 ? e / 0.4 : 1 - (e - 0.4) / 0.6));
  sound.setLevel(0.55);
  await sleep(500);
  await tween(1700, (e) => {
    stage.starfield.warp = (1 - e) * 0.85;
    entry.alpha = 1 - e;
  }, easeInOut);
  stage.starfield.warp = 0;
  stage.remove(entry);
  root.hidden = true;
  stage.setBackdropBrightness(1);
}
