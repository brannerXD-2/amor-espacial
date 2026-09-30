import { COLORS } from '../../config.js';
import { CONTENT } from '../../content.js';
import { drawGlow, drawLine, drawPoint } from '../../engine/sprites.js';
import { sleep, until } from '../../util/async.js';
import { damp, dist, lerp, TAU } from '../../util/math.js';
import { onPointer, playNodeText, tweenProp, withActor } from './shared.js';

const COUNT = 8;
const TURNS = 1.25;
const START_ANGLE = -1.2;

/** Points of a widening spiral, centred on (cx, cy) and reaching `radius`. */
function spiralPoints(cx, cy, radius, spin = 0, inner = 26) {
  return Array.from({ length: COUNT }, (_, i) => {
    const t = i / (COUNT - 1);
    const angle = START_ANGLE + spin + t * TAU * TURNS;
    const r = lerp(inner, radius, Math.pow(t, 0.85));
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  });
}

/** Stars to be joined one after another; the spiral widens the way a person does. */
class Spiral {
  constructor(app) {
    this.app = app;
    this.alpha = 0;
    this.linked = 1; // stars already part of the chain (the first one is free)
    this.lit = Array(COUNT).fill(0);
    this.lit[0] = 1;
    this.growth = 1; // draw progress of the newest link
    this.complete = false;
    this.spin = 0;
    this.bloom = 0;
    this.z = 5;
  }

  points(stage) {
    const { x, y, r } = stage.arena;
    return spiralPoints(x, y, Math.min(r * 0.86, 132), this.spin);
  }

  probe({ x, y }) {
    if (this.complete || this.alpha < 0.8) return;
    const next = this.linked;
    if (next >= COUNT) return;
    const [px, py] = this.points(this.app.stage)[next];
    if (dist(x, y, px, py) < 40) {
      this.linked++;
      this.growth = 0;
      navigator.vibrate?.(8);
      if (this.linked === COUNT) this.complete = true;
    }
  }

  update(dt) {
    this.growth = Math.min(1, this.growth + dt * 2.4);
    for (let i = 0; i < COUNT; i++) {
      const target = i < this.linked ? 1 : 0;
      this.lit[i] = damp(this.lit[i], target, 5, dt);
    }
    if (this.complete) {
      this.spin += dt * 0.12;
      this.bloom = damp(this.bloom, 1, 1.4, dt);
    }
  }

  draw(ctx, stage, t) {
    const pts = this.points(stage);
    const a = this.alpha;

    for (let i = 1; i < this.linked; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const p = i === this.linked - 1 ? this.growth : 1;
      drawLine(ctx, x0, y0, lerp(x0, x1, p), lerp(y0, y1, p), {
        a: a * (0.42 + 0.3 * this.bloom),
        rgb: COLORS.thread,
      });
    }

    const next = this.linked;
    pts.forEach(([x, y], i) => {
      const lit = this.lit[i];
      const isNext = i === next && !this.complete;
      const pulse = isNext ? 0.75 + 0.25 * Math.sin(t * 3.2) : 1;
      drawPoint(ctx, x, y, {
        r: 2 + lit * 1.2 + (i === COUNT - 1 ? 0.8 : 0),
        a: a * (0.32 + 0.68 * lit) * pulse,
        rgb: i % 3 === 2 ? COLORS.warm : COLORS.white,
        halo: 6 + lit * 2 + this.bloom * 2,
      });
      if (isNext) {
        ctx.globalAlpha = a * 0.5 * (0.5 + 0.5 * Math.sin(t * 3.2));
        ctx.strokeStyle = 'rgba(230,236,255,1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 11 + 2 * Math.sin(t * 3.2), 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });

    if (this.bloom > 0.01) {
      const [cx, cy] = [stage.arena.x, stage.arena.y];
      drawGlow(ctx, cx, cy, 130, a * this.bloom * 0.12, COLORS.warm);
    }
  }
}

export const crecimiento = {
  id: 'crecimiento',

  glyph(ctx, x, y, { alpha, scale }) {
    const pts = spiralPoints(x, y, 34 * scale, 0, 6 * scale);
    pts.forEach(([px, py], i) => {
      if (i > 0) drawLine(ctx, pts[i - 1][0], pts[i - 1][1], px, py, { a: alpha * 0.4, rgb: COLORS.thread });
      drawPoint(ctx, px, py, { r: 1.3 * scale + 0.4, a: alpha * 0.9, rgb: COLORS.white, halo: 5 });
    });
  },

  async run(app) {
    const spiral = new Spiral(app);
    await withActor(app, spiral, async () => {
      const stopProbing = onPointer(app.input, (p) => spiral.probe(p));
      await tweenProp(spiral, 'alpha', 1, 1600);
      await sleep(700);
      app.hud.hint(CONTENT.nodes.crecimiento.hint);
      await until(() => spiral.complete);
      stopProbing();
      app.hud.hint('');
      await sleep(2200);
      await playNodeText(app, 'crecimiento');
      await tweenProp(spiral, 'alpha', 0, 1400);
    });
  },
};
