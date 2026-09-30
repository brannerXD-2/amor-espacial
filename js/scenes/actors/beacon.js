import { COLORS } from '../../config.js';
import { drawGlow, drawPoint } from '../../engine/sprites.js';
import { damp, TAU } from '../../util/math.js';

/**
 * A white light at the centre of the shared orbit. It is the last thing the reader
 * has to touch: the ending only begins once it is chosen.
 */
export class Beacon {
  constructor() {
    this.alpha = 0;
    this.burst = 0; // 0 → 1 after it is touched
    this.touched = false;
    this.z = 18;
  }

  /** Centre of the orbit, in screen space (matches BinarySystem). */
  center(stage) {
    return [stage.w / 2, stage.h * 0.36];
  }

  hitRadius(stage) {
    return Math.max(64, Math.min(stage.w, stage.h) * 0.17);
  }

  touch() {
    this.touched = true;
  }

  update(dt) {
    if (this.touched) this.burst = damp(this.burst, 1, 1.6, dt);
  }

  draw(ctx, stage, t) {
    if (this.alpha <= 0.004) return;
    const [x, y] = this.center(stage);
    const a = this.alpha;
    const breath = 0.5 + 0.5 * Math.sin(t * 2);

    drawGlow(ctx, x, y, 60 + breath * 14 + this.burst * 240, a * (0.22 + this.burst * 0.5), COLORS.white);
    drawPoint(ctx, x, y, { r: 4 + this.burst * 3, a, rgb: COLORS.white, halo: 9, flare: true });

    ctx.globalAlpha = a * (1 - this.burst) * (0.25 + 0.3 * breath);
    ctx.strokeStyle = 'rgba(230,236,255,1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 16 + breath * 8, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
