import { COLORS } from '../config.js';
import { CONTENT } from '../content.js';
import { drawGlow, drawPoint } from '../engine/sprites.js';
import { sleep, tween, until } from '../util/async.js';
import { clamp, easeInOut, easeOut, smoothstep, TAU } from '../util/math.js';

const HOLD_SECONDS = 1.8;

/** The first thing on screen: a quiet point that fills with light while you hold it. */
class EntryPoint {
  constructor(app) {
    this.app = app;
    this.alpha = 0;
    this.progress = 0;
    this.burst = 0;
    this.z = 8;
  }

  update(dt) {
    const { input, stage, sound } = this.app;
    if (this.progress < 1) {
      const pressing = input.state.down && this.alpha > 0.6;
      this.progress = clamp(this.progress + (pressing ? dt / HOLD_SECONDS : -dt / 1.5));
    }
    if (this.progress >= 1) return; // from here on the scene drives the arrival
    const eased = smoothstep(0.12, 1, this.progress);
    if (!this.app.reduced) stage.starfield.warp = eased * 0.85;
    sound.setLevel(eased * 0.55);
  }

  draw(ctx, stage, t) {
    const x = stage.w / 2;
    const y = stage.h * 0.66;
    const a = this.alpha;
    const breath = 0.85 + 0.15 * Math.sin(t * 1.4);
    const p = this.progress;

    drawGlow(ctx, x, y, 90 + p * 110, a * (0.12 + p * 0.35) * breath, COLORS.warm);
    drawPoint(ctx, x, y, { r: 3 + p * 2.5, a: a * (0.75 + p * 0.25), rgb: COLORS.warm, halo: 8 + p * 4, flare: true });

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(236,232,223,1)';
    ctx.globalAlpha = a * 0.16;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, TAU);
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

export async function runUmbral(app) {
  const { stage, sound } = app;
  const root = document.getElementById('umbral');
  const title = document.getElementById('umbral-title');
  const hint = document.getElementById('umbral-hint');
  const soundBtn = document.getElementById('umbral-sound');
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

  // Start fetching the music now (if wanted) so the first gesture can play it instantly.
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

  await until(() => entry.progress >= 1);

  root.classList.add('is-leaving');
  words.forEach((w) => w.classList.remove('is-in'));
  words.forEach((w) => w.classList.add('is-out'));

  // Arrival: light floods in, then the streaks relax into a still sky.
  tween(1300, (e) => (entry.burst = e < 0.4 ? e / 0.4 : 1 - (e - 0.4) / 0.6));
  sound.setLevel(0.55);
  await sleep(800);
  await tween(1700, (e) => {
    stage.starfield.warp = (1 - e) * 0.85;
    entry.alpha = 1 - e;
  }, easeInOut);
  stage.starfield.warp = 0;
  stage.remove(entry);
  root.hidden = true;
  stage.setBackdropBrightness(1);
}
