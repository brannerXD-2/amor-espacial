import { drawPoint, drawSpacedText } from '../../engine/sprites.js';
import { rgba } from '../../util/math.js';

/**
 * One of the two luminous points. It lives in world space by default; scenes can
 * pin it to a screen position (`screen`) when it needs to leave the map.
 */
export class PointStar {
  constructor({ name, rgb, world, phase = 0 }) {
    this.name = name;
    this.rgb = rgb;
    this.world = world;
    this.screen = null;
    this.alpha = 0;
    this.scale = 1;
    this.labelAlpha = 0;
    this.phase = phase;
    this.z = 20;
  }

  position(stage) {
    return this.screen ? [this.screen.x, this.screen.y] : stage.camera.toScreen(this.world.x, this.world.y);
  }

  draw(ctx, stage, t) {
    if (this.alpha <= 0.004) return;
    const [x, y] = this.position(stage);
    if (x < -80 || x > stage.w + 80 || y < -80 || y > stage.h + 80) return;

    const breath = 0.88 + 0.12 * Math.sin(t * 1.1 + this.phase);
    drawPoint(ctx, x, y, {
      r: 3.2 * this.scale,
      a: this.alpha,
      rgb: this.rgb,
      halo: 9 * breath,
      flare: true,
    });

    if (this.labelAlpha > 0.01) {
      ctx.font = '400 10px "Geist Mono", ui-monospace, monospace';
      ctx.fillStyle = rgba(this.rgb, this.labelAlpha * 0.85);
      drawSpacedText(ctx, this.name.toUpperCase(), x, y + 30 * this.scale + 4, 2.6);
    }
  }
}
