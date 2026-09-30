import { COLORS } from '../../config.js';
import { CONTENT } from '../../content.js';
import { drawGlow, drawLine, drawPoint } from '../../engine/sprites.js';
import { sleep, until } from '../../util/async.js';
import { clamp, damp, easeInOut, lerp, smoothstep } from '../../util/math.js';
import { playNodeText, tweenProp, withActor } from './shared.js';

/** Ψ, the symbol of psychology, as eleven stars (unit coordinates). */
const PSI = [
  [-1.0, -0.95],
  [-0.86, -0.15],
  [-0.5, 0.5],
  [0.0, 0.78],
  [0.5, 0.5],
  [0.86, -0.15],
  [1.0, -0.95],
  [0.0, -1.4],
  [0.0, -0.3],
  [0.0, 1.4],
  [0.0, 1.1],
];

const EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
  [7, 8], [8, 3], [3, 10], [10, 9],
];

/** The same stars, same links, other shape: the form unfolds into an open, turning spiral. */
const OPEN = (() => {
  const centre = [0, 0.15];
  const raw = PSI.map(([x, y]) => {
    const vx = x - centre[0];
    const vy = y - centre[1];
    const r = Math.hypot(vx, vy);
    const twist = 1.1 * smoothstep(0, 1.7, r) + 0.15;
    const scale = 0.85 + 0.2 * smoothstep(0, 1.7, r);
    const cos = Math.cos(twist);
    const sin = Math.sin(twist);
    return [centre[0] + (vx * cos - vy * sin) * scale, centre[1] + (vx * sin + vy * cos) * scale];
  });
  // Re-centre so the open form sits in the same frame as the Ψ.
  const xs = raw.map((p) => p[0]);
  const ys = raw.map((p) => p[1]);
  const dx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const dy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return raw.map(([x, y]) => [x - dx, y - dy]);
})();

function formAt(t, unit, cx, cy) {
  const e = easeInOut(t);
  const wobble = Math.sin(t * Math.PI) * 0.09;
  return PSI.map(([ax, ay], i) => {
    const [bx, by] = OPEN[i];
    const mx = lerp(ax, bx, e);
    const my = lerp(ay, by, e);
    const wx = Math.sin(i * 1.7) * wobble;
    const wy = Math.cos(i * 2.3) * wobble;
    return [cx + (mx + wx) * unit, cy + (my + wy) * unit];
  });
}

/** A dream drawn with stars. Drag slowly and its shape changes; its light does not. */
class DreamForm {
  constructor(app) {
    this.app = app;
    this.alpha = 0;
    this.target = 0;
    this.shape = 0;
    this.lastPath = 0;
    this.wasDown = false;
    this.z = 5;
  }

  get done() {
    return this.shape > 0.985;
  }

  update(dt) {
    const state = this.app.input.state;
    const { stage } = this.app;
    if (state.down) {
      if (!this.wasDown) this.lastPath = state.path;
      const moved = state.path - this.lastPath;
      this.lastPath = state.path;
      this.target += moved / (Math.min(stage.w, stage.h) * 1.5);
      if (!state.dragging) this.target += dt * 0.07; // holding still works too, just slower
    }
    this.wasDown = state.down;
    this.target = clamp(this.target);
    this.shape = damp(this.shape, this.target, 2.6, dt);
  }

  draw(ctx, stage, t) {
    const { x, y, r } = stage.arena;
    const unit = r * 0.62;
    const pts = formAt(this.shape, unit, x, y + unit * 0.05);
    const a = this.alpha;

    drawGlow(ctx, x, y, r * 1.1, a * 0.07 * (0.6 + 0.4 * this.shape), COLORS.ice);

    for (const [i, j] of EDGES) {
      drawLine(ctx, pts[i][0], pts[i][1], pts[j][0], pts[j][1], { a: a * 0.5, rgb: COLORS.thread });
    }
    pts.forEach(([px, py], i) => {
      const twinkle = 0.82 + 0.18 * Math.sin(t * 1.4 + i);
      drawPoint(ctx, px, py, {
        r: i === 3 ? 3.4 : 2.1,
        a: a * twinkle,
        rgb: i === 3 ? COLORS.warm : COLORS.white,
        halo: i === 3 ? 8 : 6,
        flare: i === 3,
      });
    });
  }
}

export const suenos = {
  id: 'suenos',

  glyph(ctx, x, y, { alpha, scale }) {
    const pts = formAt(1, 24 * scale, x, y);
    for (const [i, j] of EDGES) {
      drawLine(ctx, pts[i][0], pts[i][1], pts[j][0], pts[j][1], { a: alpha * 0.4, rgb: COLORS.thread });
    }
    pts.forEach(([px, py], i) => {
      drawPoint(ctx, px, py, {
        r: (i === 3 ? 2 : 1.2) * scale + 0.3,
        a: alpha * 0.9,
        rgb: i === 3 ? COLORS.warm : COLORS.white,
        halo: 5,
      });
    });
  },

  async run(app) {
    const dream = new DreamForm(app);
    await withActor(app, dream, async () => {
      await tweenProp(dream, 'alpha', 1, 1800);
      await sleep(1600);
      app.hud.hint(CONTENT.nodes.suenos.hint);
      await until(() => dream.done);
      app.hud.hint('');
      await sleep(2000);
      await playNodeText(app, 'suenos');
      await tweenProp(dream, 'alpha', 0, 1400);
    });
  },
};
