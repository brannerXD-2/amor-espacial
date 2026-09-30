import { COLORS } from '../../config.js';
import { CONTENT } from '../../content.js';
import { drawGlow, drawLine, drawPoint } from '../../engine/sprites.js';
import { sleep, until } from '../../util/async.js';
import { damp, TAU } from '../../util/math.js';
import { playNodeText, tweenProp, withActor } from './shared.js';

const TRAIL_STEPS = 14;

/**
 * Two orbits around the same quiet centre. Press and hold and time slows down until it
 * stops; for a moment the two paths are visible at once, joined by a single line.
 */
class Orbits {
  constructor(app) {
    this.app = app;
    this.alpha = 0;
    this.timeScale = 1;
    this.frozen = false;
    this.holdTime = 0;
    this.link = 0;
    this.planets = [
      { angle: 1.1, speed: 0.95, radius: 0.55, rgb: COLORS.ice, size: 3.4 },
      { angle: 3.9, speed: 0.52, radius: 0.94, rgb: COLORS.gold, size: 3.8 },
    ];
    this.z = 5;
  }

  update(dt) {
    const pressing = this.app.input.state.down;
    if (!this.frozen) {
      this.timeScale = damp(this.timeScale, pressing ? 0 : 1, 2.2, dt);
      this.holdTime = pressing ? this.holdTime + dt : 0;
      if (this.timeScale < 0.05 && this.holdTime > 1.6) this.frozen = true;
    } else {
      this.timeScale = damp(this.timeScale, 0, 5, dt);
    }
    for (const p of this.planets) p.angle += p.speed * dt * this.timeScale;
    this.link = damp(this.link, this.frozen ? 1 : 0, 2, dt);
  }

  release() {
    this.frozen = false;
    this.holdTime = 0;
  }

  draw(ctx, stage, t) {
    const { x, y, r } = stage.arena;
    const a = this.alpha;

    drawPoint(ctx, x, y, { r: 3, a: a * 0.9, rgb: COLORS.warm, halo: 9 });

    const positions = this.planets.map((p) => {
      const radius = r * p.radius;
      ctx.globalAlpha = a * 0.16;
      ctx.strokeStyle = 'rgba(201,211,255,1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return [x + Math.cos(p.angle) * radius, y + Math.sin(p.angle) * radius, radius];
    });

    // Trails shorten as time slows, so stillness reads as stillness.
    const trail = 0.15 + 0.85 * Math.min(1, this.timeScale);
    this.planets.forEach((p, i) => {
      const [, , radius] = positions[i];
      let prev = positions[i];
      for (let k = 1; k <= TRAIL_STEPS; k++) {
        const angle = p.angle - k * 0.06 * trail;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        drawLine(ctx, prev[0], prev[1], px, py, {
          a: a * 0.5 * (1 - k / TRAIL_STEPS),
          rgb: p.rgb,
          width: 1.4,
        });
        prev = [px, py];
      }
    });

    if (this.link > 0.01) {
      drawLine(ctx, positions[0][0], positions[0][1], positions[1][0], positions[1][1], {
        a: a * this.link * 0.55,
        rgb: COLORS.thread,
      });
    }

    this.planets.forEach((p, i) => {
      drawPoint(ctx, positions[i][0], positions[i][1], { r: p.size, a, rgb: p.rgb, halo: 7, flare: this.frozen });
    });

    if (this.link > 0.01) {
      drawGlow(ctx, x, y, r * 1.2, a * this.link * 0.05, COLORS.thread);
    }
  }
}

export const tiempo = {
  id: 'tiempo',

  glyph(ctx, x, y, { alpha, scale, t }) {
    for (const [radius, speed, rgb] of [
      [15, 0.45, COLORS.ice],
      [27, 0.26, COLORS.gold],
    ]) {
      ctx.globalAlpha = alpha * 0.2;
      ctx.strokeStyle = 'rgba(201,211,255,1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, radius * scale, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
      const angle = t * speed + radius;
      drawPoint(ctx, x + Math.cos(angle) * radius * scale, y + Math.sin(angle) * radius * scale, {
        r: 1.6 * scale + 0.4,
        a: alpha,
        rgb,
        halo: 5,
      });
    }
    drawPoint(ctx, x, y, { r: 1.4 * scale + 0.3, a: alpha * 0.9, rgb: COLORS.warm, halo: 5 });
  },

  async run(app) {
    const orbits = new Orbits(app);
    await withActor(app, orbits, async () => {
      await tweenProp(orbits, 'alpha', 1, 1800);
      await sleep(1600);
      app.hud.hint(CONTENT.nodes.tiempo.hint);
      await until(() => orbits.frozen);
      app.hud.hint('');
      await sleep(1600);
      await playNodeText(app, 'tiempo');
      orbits.release();
      await sleep(1600);
      await tweenProp(orbits, 'alpha', 0, 1400);
    });
  },
};
