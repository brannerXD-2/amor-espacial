import { COLORS } from '../config.js';
import { CONTENT } from '../content.js';
import { drawLine, drawPoint } from '../engine/sprites.js';
import { sleep, tween } from '../util/async.js';
import { easeInOut, lerp, mixRgb } from '../util/math.js';
import { finalLayout } from './futuro.js';
import { tweenProp } from './nodes/shared.js';

const FINAL_BACKDROP = 0.07;

/** The five or six stars that appear between the two points, joined one by one. */
class FinalConstellation {
  constructor() {
    this.lit = 0; // how many stars are lit (fractional while one is appearing)
    this.alpha = 1;
    this.z = 12;
  }

  stars(stage) {
    const { p1, p2 } = finalLayout(stage.w, stage.h);
    const bulge = Math.min(stage.w, stage.h) * 0.07;
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;
    const arc = [0.3, 0.4, 0.5, 0.6, 0.7].map((t) => {
      const k = Math.sin(Math.PI * ((t - 0.3) / 0.4)) * bulge;
      return { x: lerp(p1.x, p2.x, t) + nx * k, y: lerp(p1.y, p2.y, t) + ny * k, r: 1.6 };
    });
    arc[2].r = 2.4;
    const spur = { x: mx - nx * bulge * 1.5, y: my - ny * bulge * 1.5, r: 1.4 };
    return { arc, spur };
  }

  draw(ctx, stage, t) {
    if (this.lit <= 0 || this.alpha <= 0.004) return;
    const { arc, spur } = this.stars(stage);
    const all = [...arc, spur];
    const rgb = COLORS.white;

    const segments = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [2, 5],
    ];
    segments.forEach(([i, j]) => {
      const reveal = Math.min(1, Math.max(0, this.lit - Math.max(i, j) + 1));
      if (reveal <= 0) return;
      const a = all[i];
      const b = all[j];
      drawLine(ctx, a.x, a.y, lerp(a.x, b.x, reveal), lerp(a.y, b.y, reveal), {
        a: this.alpha * 0.4,
        rgb: COLORS.thread,
      });
    });

    all.forEach((s, i) => {
      const show = Math.min(1, Math.max(0, this.lit - i));
      if (show <= 0) return;
      const twinkle = 0.8 + 0.2 * Math.sin(t * 1.2 + i * 1.9);
      drawPoint(ctx, s.x, s.y, {
        r: s.r,
        a: this.alpha * show * twinkle,
        rgb: i === 2 ? mixRgb(COLORS.gold, COLORS.ice, 0.5) : rgb,
        halo: i === 2 ? 8 : 6,
        flare: i === 2,
      });
    });
  }
}

const els = () => ({
  line: document.getElementById('finale-line'),
  name: document.getElementById('finale-name'),
  love: document.getElementById('finale-love'),
  sign: document.getElementById('finale-sign'),
  footer: document.getElementById('footer'),
});

function fillTexts() {
  const { line, name, love, sign } = els();
  const c = CONTENT.finale;
  line.textContent = c.line;
  name.textContent = c.name;
  love.textContent = c.love;
  sign.textContent = c.sign;
  document.getElementById('footer-made').textContent = c.footer;
  document.getElementById('again-btn').textContent = c.again;
  document.getElementById('credits-btn').textContent = c.credits;
}

/**
 * The ending: the universe dims until one light is left, then a second one appears.
 * They stay apart. A small constellation forms between them and three short lines follow.
 */
export async function runFinale(app, system) {
  const { stage, hud, sound, points, world } = app;
  fillTexts();
  const { line, name, love, sign, footer } = els();

  hud.hint('');
  hud.setLabel('');
  hud.showMap(false);
  sound.cue('calm'); // the ending belongs to the hypnotic loop
  sound.setLevel(0.3);

  const worldStart = world.alpha;
  const dimming = tween(
    9500,
    (e) => {
      stage.setBackdropBrightness(lerp(1, FINAL_BACKDROP, e));
      world.alpha = worldStart * (1 - e);
      points.a.labelAlpha = points.b.labelAlpha = 1 - Math.min(1, e * 3);
    },
    easeInOut,
  );

  await sleep(1400);
  tween(2600, (e) => (system.trailAlpha = 1 - e));
  await sleep(2200);
  system.startRelease(7);
  await sleep(3400);
  await tweenProp(points.b, 'alpha', 0, 2600); // only Branner's light is left
  await dimming;
  await sleep(3200);
  await tweenProp(points.b, 'alpha', 1, 4200); // and then, far away, another one
  await sleep(2400);

  const constellation = stage.add(new FinalConstellation());
  await tween(5200, (e) => (constellation.lit = e * 6));
  await sleep(2200);

  line.classList.add('is-in');
  await sleep(5200);
  name.classList.add('is-in');
  await sleep(4200);
  love.classList.add('is-in');
  await sleep(4600);
  sign.classList.add('is-in');
  await sleep(3000);
  footer.classList.add('is-visible');

  return { constellation, system };
}

/** Puts the ending back on screen (used when returning from free exploration). */
export async function showFinalTableau(app, tableau, ms = 2400) {
  const { stage, points, world } = app;
  const { line, name, love, sign, footer } = els();
  const { constellation, system } = tableau;
  system.mode = 'final';
  system.trailAlpha = 0;
  points.a.alpha = 1;
  points.b.alpha = 1;
  points.a.labelAlpha = 0;
  points.b.labelAlpha = 0;
  await tween(ms, (e) => {
    stage.setBackdropBrightness(lerp(1, FINAL_BACKDROP, e));
    world.alpha = 1 - e;
    constellation.alpha = e;
  }, easeInOut);
  [line, name, love, sign].forEach((el) => el.classList.add('is-in'));
  footer.classList.add('is-visible');
}

/** Clears the ending so the sky can be explored again. */
export async function hideFinalTableau(app, tableau, ms = 2000) {
  const { stage, world } = app;
  const { line, name, love, sign, footer } = els();
  const { constellation } = tableau;
  [line, name, love, sign].forEach((el) => el.classList.remove('is-in'));
  footer.classList.remove('is-visible');
  await tween(ms, (e) => {
    stage.setBackdropBrightness(lerp(FINAL_BACKDROP, 1, e));
    world.alpha = e;
    constellation.alpha = 1 - e;
  }, easeInOut);
}
