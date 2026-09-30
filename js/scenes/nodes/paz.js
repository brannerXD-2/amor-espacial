import { COLORS } from '../../config.js';
import { CONTENT } from '../../content.js';
import { drawGlow, drawPoint } from '../../engine/sprites.js';
import { sleep, until } from '../../util/async.js';
import { clamp, createRng, damp, TAU } from '../../util/math.js';
import { playNodeText, tweenProp, withActor } from './shared.js';

const PARTICLES = 34;

function ringPoints(cx, cy, radius, count = PARTICLES, spin = 0) {
  return Array.from({ length: count }, (_, i) => {
    const angle = spin + (i / count) * TAU;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });
}

/**
 * A restless swarm that settles into a quiet ring — but only if you stop touching.
 * Any movement brings the noise back, so the calm has to be earned by stillness.
 */
class Stillness {
  constructor(app) {
    const rng = createRng(5);
    this.app = app;
    this.alpha = 0;
    this.calm = 0;
    this.done = false;
    this.ripple = -1;
    this.spin = 0;
    this.seeds = Array.from({ length: PARTICLES }, () => ({
      a: rng() * TAU,
      b: rng() * TAU,
      speed: 2 + rng() * 2.5,
      // where the restless particle wanders around
      rx: (rng() - 0.5) * 2,
      ry: (rng() - 0.5) * 2,
    }));
    this.z = 5;
  }

  update(dt) {
    const { input, stage } = this.app;
    if (!this.done) {
      const target = clamp((input.idleSeconds - 0.7) / 4.4);
      this.calm = target > this.calm ? this.calm + Math.min(target - this.calm, dt * 0.33) : damp(this.calm, target, 3.2, dt);
      if (this.calm >= 0.995) {
        this.done = true;
        this.ripple = 0;
      }
    } else {
      this.calm = 1;
    }
    if (this.ripple >= 0 && this.ripple < 1) this.ripple = Math.min(1, this.ripple + dt / 3.2);

    this.spin += dt * (0.05 + this.calm * 0.05);
    stage.starfield.calm = this.calm * this.alpha;
    stage.starfield.agitation = (1 - this.calm) * 1.4 * this.alpha;
  }

  draw(ctx, stage, t) {
    const { x, y, r } = stage.arena;
    const a = this.alpha;
    const radius = r * 0.82;
    const ring = ringPoints(x, y, radius, PARTICLES, this.spin);
    const noise = Math.pow(1 - this.calm, 1.4);
    const settle = this.calm * this.calm;

    this.seeds.forEach((s, i) => {
      const jx = Math.sin(t * s.speed + s.a) * 15 * noise;
      const jy = Math.cos(t * (s.speed * 0.9) + s.b) * 15 * noise;
      const wanderX = x + s.rx * r * 0.85;
      const wanderY = y + s.ry * r * 0.85;
      const px = wanderX + (ring[i][0] - wanderX) * settle + jx;
      const py = wanderY + (ring[i][1] - wanderY) * settle + jy;
      const flicker = 1 - noise * 0.45 * (0.5 + 0.5 * Math.sin(t * s.speed * 3 + s.a));
      drawPoint(ctx, px, py, {
        r: 1.5 + (i % 3) * 0.3,
        a: a * (0.5 + 0.4 * settle) * flicker,
        rgb: i % 5 === 0 ? COLORS.warm : COLORS.white,
        halo: 5,
      });
    });

    // A slow breath appears once things start to quiet down.
    if (this.calm > 0.25) {
      const breath = 0.5 + 0.5 * Math.sin(t * 1.25);
      drawGlow(ctx, x, y, radius * (0.9 + 0.1 * breath) * 1.25, a * this.calm * 0.05 * (0.6 + 0.4 * breath), COLORS.ice);
    }

    if (this.ripple >= 0 && this.ripple < 1) {
      const p = this.ripple;
      ctx.globalAlpha = a * (1 - p) * 0.4;
      ctx.strokeStyle = 'rgba(201,211,255,1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, radius * (0.9 + p * 1.5), 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

export const paz = {
  id: 'paz',

  glyph(ctx, x, y, { alpha, scale }) {
    ringPoints(x, y, 24 * scale, 16).forEach(([px, py], i) => {
      drawPoint(ctx, px, py, { r: 1.2 * scale + 0.3, a: alpha * 0.85, rgb: i % 4 === 0 ? COLORS.warm : COLORS.white, halo: 5 });
    });
    drawGlow(ctx, x, y, 34 * scale, alpha * 0.08, COLORS.ice);
  },

  async run(app) {
    const field = new Stillness(app);
    await withActor(app, field, async () => {
      await tweenProp(field, 'alpha', 1, 1600);
      await sleep(600);
      app.hud.hint(CONTENT.nodes.paz.hint);
      await until(() => field.done);
      app.hud.hint('');
      await sleep(2000);
      await playNodeText(app, 'paz');
      await tweenProp(field, 'alpha', 0, 1400);
      app.stage.starfield.calm = 0;
      app.stage.starfield.agitation = 0;
    });
  },
};
