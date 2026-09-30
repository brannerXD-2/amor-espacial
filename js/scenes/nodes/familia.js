import { COLORS } from '../../config.js';
import { CONTENT } from '../../content.js';
import { drawGlow, drawPoint } from '../../engine/sprites.js';
import { sleep, until } from '../../util/async.js';
import { damp, dist, TAU } from '../../util/math.js';
import { onPointer, playNodeText, tweenProp, withActor } from './shared.js';

const COUNT = 4;
const INNER = 30;

/** Four warm stars, far apart. Each tap brings one home to the same small orbit. */
class Homecoming {
  constructor(app) {
    this.app = app;
    this.alpha = 0;
    this.warmth = 0;
    this.stars = Array.from({ length: COUNT }, (_, i) => ({
      base: -0.7 + (i / COUNT) * TAU,
      angle: -0.7 + (i / COUNT) * TAU,
      radius: 1, // fraction of the outer radius until it joins
      joined: false,
      glint: 0,
    }));
    this.z = 5;
  }

  get done() {
    return this.stars.every((s) => s.joined);
  }

  probe({ x, y }) {
    if (this.alpha < 0.8) return;
    const positions = this.positions(this.app.stage);
    let best = -1;
    let bestDist = 64;
    positions.forEach(([px, py], i) => {
      const d = dist(x, y, px, py);
      if (!this.stars[i].joined && d < bestDist) {
        best = i;
        bestDist = d;
      }
    });
    if (best >= 0) {
      this.stars[best].joined = true;
      this.stars[best].glint = 1;
      navigator.vibrate?.(8);
    }
  }

  positions(stage) {
    const { x, y, r } = stage.arena;
    return this.stars.map((s) => {
      const home = INNER + this.stars.indexOf(s) * 7;
      const radius = home + (r * 0.95 - home) * s.radius;
      return [x + Math.cos(s.angle) * radius, y + Math.sin(s.angle) * radius];
    });
  }

  update(dt) {
    for (const s of this.stars) {
      s.radius = damp(s.radius, s.joined ? 0 : 1, 2.1, dt);
      s.angle += dt * (s.joined ? 0.62 : 0.05);
      s.glint = Math.max(0, s.glint - dt * 0.8);
    }
    this.warmth = damp(this.warmth, this.done ? 1 : this.stars.filter((s) => s.joined).length / (COUNT * 2.4), 1.6, dt);
  }

  draw(ctx, stage, t) {
    const { x, y } = stage.arena;
    const a = this.alpha;
    drawGlow(ctx, x, y, 70 + this.warmth * 60, a * this.warmth * 0.32, COLORS.home);

    this.positions(stage).forEach(([px, py], i) => {
      const s = this.stars[i];
      const pulse = s.joined ? 1 : 0.7 + 0.3 * Math.sin(t * 2.4 + i * 1.7);
      drawPoint(ctx, px, py, {
        r: 3 + (s.joined ? 0.6 : 0),
        a: a * pulse,
        rgb: COLORS.home,
        halo: 7 + s.glint * 5,
        flare: s.joined,
      });
      if (!s.joined) {
        ctx.globalAlpha = a * 0.28 * pulse;
        ctx.strokeStyle = 'rgba(244,184,150,1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, 14 + 2 * Math.sin(t * 2.4 + i), 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
  }
}

export const familia = {
  id: 'familia',

  glyph(ctx, x, y, { alpha, scale, t }) {
    drawGlow(ctx, x, y, 44 * scale, alpha * 0.28, COLORS.home);
    for (let i = 0; i < COUNT; i++) {
      const angle = t * 0.3 + (i / COUNT) * TAU;
      drawPoint(ctx, x + Math.cos(angle) * 15 * scale, y + Math.sin(angle) * 15 * scale, {
        r: 1.7 * scale + 0.4,
        a: alpha,
        rgb: COLORS.home,
        halo: 6,
      });
    }
  },

  async run(app) {
    const home = new Homecoming(app);
    await withActor(app, home, async () => {
      const stopProbing = onPointer(app.input, (p) => home.probe(p));
      await tweenProp(home, 'alpha', 1, 1600);
      await sleep(700);
      app.hud.hint(CONTENT.nodes.familia.hint);
      await until(() => home.done);
      stopProbing();
      app.hud.hint('');
      await sleep(2600);
      await playNodeText(app, 'familia');
      await tweenProp(home, 'alpha', 0, 1400);
    });
  },
};
