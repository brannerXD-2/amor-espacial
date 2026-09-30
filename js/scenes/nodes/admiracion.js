import { COLORS } from '../../config.js';
import { CONTENT } from '../../content.js';
import { drawGlow, drawLine, drawPoint } from '../../engine/sprites.js';
import { sleep, until } from '../../util/async.js';
import { clamp, easeOut, lerp, rgba, smoothstep, TAU } from '../../util/math.js';
import { playNodeText, tweenProp, withActor } from './shared.js';

const RING_STARS = 9;

/** A star out of focus: it only becomes sharp — and shows its halo — if you stay. */
class FocusStar {
  constructor(app) {
    this.app = app;
    this.focus = 0;
    this.alpha = 0;
    this.locked = false;
    this.ghosts = Array.from({ length: 9 }, (_, i) => ({
      angle: (i / 9) * TAU,
      speed: 0.25 + (i % 3) * 0.12,
      reach: 0.55 + (i % 4) * 0.16,
    }));
    this.z = 5;
  }

  update(dt) {
    const pressing = this.app.input.state.down;
    if (!this.locked) {
      this.focus = clamp(this.focus + (pressing ? dt / 2.8 : -dt / 6.5));
    } else {
      this.focus = 1;
    }
  }

  draw(ctx, stage, t) {
    const { x, y, r } = stage.arena;
    const sharp = easeOut(this.focus);
    const blur = 1 - sharp;
    const rgb = COLORS.warm;

    // Out of focus, one light is many soft discs that drift apart; focus draws them together.
    for (const g of this.ghosts) {
      const angle = g.angle + t * g.speed;
      const offset = blur * 30 * g.reach;
      const gx = x + Math.cos(angle) * offset;
      const gy = y + Math.sin(angle) * offset;
      const radius = 4 + blur * (14 + g.reach * 8);
      ctx.globalAlpha = this.alpha * blur * 0.085;
      ctx.fillStyle = rgba(rgb, 1);
      ctx.beginPath();
      ctx.arc(gx, gy, radius, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = this.alpha * blur * 0.16;
      ctx.strokeStyle = rgba(rgb, 1);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    drawGlow(ctx, x, y, 34 + blur * 40, this.alpha * (0.16 + 0.1 * sharp), rgb);

    drawPoint(ctx, x, y, {
      r: lerp(2, 3.4, sharp),
      a: this.alpha * (0.3 + 0.7 * sharp),
      rgb,
      halo: lerp(10, 6, sharp),
      flare: sharp > 0.55,
    });

    const ringAlpha = smoothstep(0.5, 1, this.focus) * this.alpha;
    if (ringAlpha > 0.01) drawHalo(ctx, x, y, r * 0.5, ringAlpha, t);
  }
}

function drawHalo(ctx, x, y, radius, alpha, t, spin = 0.1) {
  const pts = Array.from({ length: RING_STARS }, (_, i) => {
    const angle = t * spin + (i / RING_STARS) * TAU;
    return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius];
  });
  pts.forEach(([px, py], i) => {
    const [qx, qy] = pts[(i + 1) % RING_STARS];
    drawLine(ctx, px, py, qx, qy, { a: alpha * 0.28, rgb: COLORS.thread });
    drawPoint(ctx, px, py, { r: 1.5 + (i % 3) * 0.35, a: alpha * 0.9, rgb: COLORS.warm, halo: 5 });
  });
}

export const admiracion = {
  id: 'admiracion',

  glyph(ctx, x, y, { alpha, scale, t }) {
    drawHalo(ctx, x, y, 26 * scale, alpha, t, 0.05);
    drawPoint(ctx, x, y, { r: 2.6 * scale + 0.6, a: alpha, rgb: COLORS.warm, halo: 6 });
  },

  async run(app) {
    const star = new FocusStar(app);
    await withActor(app, star, async () => {
      await tweenProp(star, 'alpha', 1, 1600);
      await sleep(900);
      app.hud.hint(CONTENT.nodes.admiracion.hint);
      await until(() => star.focus >= 1);
      star.locked = true;
      app.hud.hint('');
      await sleep(1500);
      await playNodeText(app, 'admiracion');
      await tweenProp(star, 'alpha', 0, 1400);
    });
  },
};
