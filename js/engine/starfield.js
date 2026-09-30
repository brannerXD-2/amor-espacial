import { COLORS, STARFIELD } from '../config.js';
import { clamp, createRng, mod, rangeOf, TAU } from '../util/math.js';
import { drawFlare } from './sprites.js';

const FLARE_TINTS = [COLORS.white, COLORS.warm, [190, 210, 255]];

/**
 * Three parallax layers of stars plus a handful of flares. Each layer lives in a
 * wrapping tile a bit larger than the screen, so the sky never runs out.
 */
export class Starfield {
  constructor(seed = 7) {
    const rng = createRng(seed);
    this.layers = STARFIELD.layers.map((cfg) => this.#buildLayer(cfg, rng));
    this.density = 1;
    this.warp = 0; // 0..1 → streaks and outward flow
    this.warpPhase = 0;
    this.calm = 0; // 0..1 → less twinkle
    this.agitation = 0; // px of jitter
    this.brightness = 1;
    this.reveal = 1; // 0..1 → stars ignite outward from the centre (entrance animation)
  }

  #buildLayer(cfg, rng) {
    const stars = [];
    for (let i = 0; i < cfg.count; i++) {
      stars.push({
        x: rng(),
        y: rng(),
        size: rangeOf(rng, cfg.size),
        alpha: rangeOf(rng, cfg.alpha),
        phase: rng() * TAU,
        speed: 0.5 + rng() * 1.6,
        tint: Math.floor(rng() * STARFIELD.tints.length),
        flareTint: Math.floor(rng() * FLARE_TINTS.length),
      });
    }
    stars.sort((a, b) => a.tint - b.tint);
    return { ...cfg, stars };
  }

  update(dt) {
    if (this.warp > 0.001) this.warpPhase += dt * this.warp * 0.85;
  }

  draw(ctx, stage, t) {
    const { w, h, camera, parallax, pointer } = stage;
    const tileW = w * STARFIELD.tileScale;
    const tileH = h * STARFIELD.tileScale;
    const padX = (tileW - w) / 2;
    const padY = (tileH - h) / 2;
    const cx = w / 2;
    const cy = h / 2;
    const zoomK = clamp(camera.zoom, 0.25, 1);
    const amp = 0.5 * (1 - this.calm * 0.85);
    const warping = this.warp > 0.02;
    const radius = STARFIELD.pointerRadius;
    const radius2 = radius * radius;
    const jitter = this.agitation;
    const bright = this.brightness;
    if (bright <= 0.003) return;
    const revealing = this.reveal < 0.999;
    const revealRadius = this.reveal * Math.hypot(cx, cy) * 1.25;

    for (const layer of this.layers) {
      const d = layer.depth;
      const ox = -camera.x * d * zoomK + parallax.x * d * STARFIELD.pointerParallax;
      const oy = -camera.y * d * zoomK + parallax.y * d * STARFIELD.pointerParallax;
      const scale = 1 + (camera.zoom - 1) * d * 0.22;
      const count = Math.floor(layer.stars.length * (layer.flare ? 1 : this.density));
      let lastTint = -1;

      for (let i = 0; i < count; i++) {
        const s = layer.stars[i];
        let x = mod(s.x * tileW + ox, tileW) - padX;
        let y = mod(s.y * tileH + oy, tileH) - padY;
        let boost = 1;

        if (warping) {
          const k = 1 + ((s.phase / TAU + this.warpPhase * (0.35 + d)) % 1) * 1.7;
          x = cx + (x - cx) * k;
          y = cy + (y - cy) * k;
        } else if (scale !== 1) {
          x = cx + (x - cx) * scale;
          y = cy + (y - cy) * scale;
        }

        if (x < -30 || x > w + 30 || y < -30 || y > h + 30) continue;

        let ignition = 1;
        if (revealing) {
          ignition = clamp((revealRadius - Math.hypot(x - cx, y - cy)) / 140);
          if (ignition <= 0) continue;
        }

        if (jitter > 0.01) {
          x += Math.sin(t * 9 + s.phase * 7) * jitter * (0.4 + d);
          y += Math.cos(t * 8 + s.phase * 5) * jitter * (0.4 + d);
        }

        if (layer.react > 0 && pointer.active > 0.01) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < radius2) {
            const dist = Math.sqrt(d2) + 0.001;
            const f = 1 - dist / radius;
            const push = f * f * 10 * layer.react * pointer.active;
            x += (dx / dist) * push;
            y += (dy / dist) * push;
            boost += f * 0.9 * pointer.active;
          }
        }

        const twinkle = 1 - amp + amp * Math.sin(t * s.speed + s.phase);
        const alpha = Math.min(1, s.alpha * twinkle * boost) * bright * ignition;

        if (layer.flare) {
          drawFlare(ctx, x, y, s.size * 9, alpha * 0.9, FLARE_TINTS[s.flareTint]);
          continue;
        }

        if (s.tint !== lastTint) {
          ctx.fillStyle = STARFIELD.tints[s.tint];
          ctx.strokeStyle = STARFIELD.tints[s.tint];
          lastTint = s.tint;
        }
        ctx.globalAlpha = alpha;

        if (warping) {
          const dxc = x - cx;
          const dyc = y - cy;
          const len = Math.hypot(dxc, dyc) + 0.001;
          const tail = this.warp * (10 + d * 220);
          ctx.lineWidth = Math.max(0.6, s.size * 0.8);
          ctx.beginPath();
          ctx.moveTo(x - (dxc / len) * tail, y - (dyc / len) * tail);
          ctx.lineTo(x, y);
          ctx.stroke();
        } else if (s.size < 1.3) {
          ctx.fillRect(x - s.size / 2, y - s.size / 2, s.size, s.size);
        } else {
          ctx.beginPath();
          ctx.arc(x, y, s.size / 2, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}
