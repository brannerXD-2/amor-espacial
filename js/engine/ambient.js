import { COLORS, DUST } from '../config.js';
import { createRng, mod, rangeOf, TAU } from '../util/math.js';
import { drawGlow } from './sprites.js';

const DUST_TINTS = [COLORS.white, [150, 170, 230], COLORS.warm];

/** Big, soft, out-of-focus specks that drift in front of everything. */
export class Dust {
  constructor(seed = 21) {
    const rng = createRng(seed);
    this.specks = Array.from({ length: DUST.count }, () => ({
      x: rng(),
      y: rng(),
      r: rangeOf(rng, DUST.radius),
      alpha: rangeOf(rng, DUST.alpha),
      drift: (rng() - 0.5) * 6,
      rise: 2 + rng() * 5,
      phase: rng() * TAU,
      tint: DUST_TINTS[Math.floor(rng() * DUST_TINTS.length)],
    }));
    this.density = 1;
    this.brightness = 1;
  }

  draw(ctx, stage, t) {
    if (this.density <= 0 || this.brightness <= 0.003) return;
    const { w, h, camera, parallax } = stage;
    const tileW = w * 1.4;
    const tileH = h * 1.4;
    const count = Math.floor(this.specks.length * this.density);

    for (let i = 0; i < count; i++) {
      const s = this.specks[i];
      const x = mod(s.x * tileW - camera.x * DUST.depth * 0.6 + s.drift * t + parallax.x * 22, tileW) - (tileW - w) / 2;
      const y = mod(s.y * tileH - camera.y * DUST.depth * 0.6 - s.rise * t + parallax.y * 22, tileH) - (tileH - h) / 2;
      const breathe = 0.7 + 0.3 * Math.sin(t * 0.3 + s.phase);
      drawGlow(ctx, x, y, s.r, s.alpha * breathe * this.brightness, s.tint);
    }
  }
}

/** A rare, quiet meteor. Off by default; scenes switch it on when the sky is idle. */
export class ShootingStars {
  constructor() {
    this.enabled = false;
    this.meteor = null;
    this.timer = 14 + Math.random() * 14;
  }

  update(dt, stage) {
    if (this.meteor) {
      this.meteor.age += dt;
      if (this.meteor.age >= this.meteor.life) this.meteor = null;
      return;
    }
    if (!this.enabled) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      const angle = Math.PI * (0.12 + Math.random() * 0.14);
      this.meteor = {
        x: stage.w * (0.1 + Math.random() * 0.7),
        y: stage.h * (0.05 + Math.random() * 0.3),
        angle,
        speed: 620 + Math.random() * 260,
        length: 110 + Math.random() * 90,
        age: 0,
        life: 0.9,
      };
      this.timer = 24 + Math.random() * 28;
    }
  }

  draw(ctx) {
    const m = this.meteor;
    if (!m) return;
    const p = m.age / m.life;
    const fade = Math.sin(Math.PI * p);
    const dx = Math.cos(m.angle);
    const dy = Math.sin(m.angle);
    const hx = m.x + dx * m.speed * m.age;
    const hy = m.y + dy * m.speed * m.age;
    const tx = hx - dx * m.length;
    const ty = hy - dy * m.length;
    const grad = ctx.createLinearGradient(tx, ty, hx, hy);
    grad.addColorStop(0, 'rgba(210,220,255,0)');
    grad.addColorStop(1, `rgba(235,240,255,${0.75 * fade})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(hx, hy);
    ctx.stroke();
  }
}
