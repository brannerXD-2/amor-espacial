import { COLORS, JOURNEY } from '../../config.js';
import { drawGlow, drawLine, drawPoint } from '../../engine/sprites.js';
import { NODE_MODULES } from '../nodes/index.js';
import { clamp, invLerp, rgba, smoothstep, TAU } from '../../util/math.js';

const HIDDEN_FLOOR = 0.2; // how visible a thought stays once it has been found

/**
 * Everything that lives on the trip itself: the ideas as stars (locked, active,
 * finished as small constellations), the faint thread between finished ones,
 * and the hidden thoughts that only show when you pass close.
 */
export class WorldActor {
  constructor(app, journey) {
    this.app = app;
    this.journey = journey;
    this.alpha = 1;
    this.activeIndex = -1;
    this.engagedIndex = -1;
    this.states = journey.nodes.map(() => ({ done: false, glyph: 0 }));
    this.bReached = false;
    this.phraseFade = 1;
    this.z = 4;
  }

  setActive(index) {
    this.activeIndex = index;
  }

  engage(index) {
    this.engagedIndex = index;
  }

  complete(index) {
    this.states[index].done = true;
    this.engagedIndex = -1;
    if (this.activeIndex === index) this.activeIndex = -1;
  }

  completeAll() {
    this.states.forEach((s) => {
      s.done = true;
      s.glyph = 1;
    });
    this.engagedIndex = -1;
    this.activeIndex = -1;
    this.bReached = true;
  }

  update(dt, t, stage) {
    this.phraseFade += ((this.engagedIndex >= 0 ? 0 : 1) - this.phraseFade) * Math.min(1, dt * 3);
    for (const s of this.states) {
      if (s.done && s.glyph < 1) s.glyph = Math.min(1, s.glyph + dt / 2.4);
    }

    const { camera } = stage;
    const [far, near] = JOURNEY.hiddenReveal;
    for (const phrase of this.journey.phrases) {
      const d = Math.hypot(camera.x - phrase.x, camera.y - phrase.y);
      const target = smoothstep(0, 1, invLerp(far, near, d));
      phrase.reveal += (target - phrase.reveal) * Math.min(1, dt * 3);
      if (!phrase.found && phrase.reveal > 0.62) {
        phrase.seen += dt;
        if (phrase.seen > 1.2) {
          phrase.found = true;
          this.app.state.found.add(phrase.index);
          this.app.events.emit('found', phrase.index);
        }
      }
    }
  }

  draw(ctx, stage, t) {
    const { camera } = stage;
    const alpha = this.alpha;
    if (alpha <= 0.004) return;
    const zoomScale = clamp(camera.zoom, 0.3, 1);

    this.#drawLinks(ctx, stage, alpha);
    this.#drawPhrases(ctx, stage, t, alpha);
    this.journey.nodes.forEach((node, i) => this.#drawNode(ctx, stage, node, i, t, alpha, zoomScale));
  }

  #drawLinks(ctx, stage, alpha) {
    const { path } = this.journey;
    const count = this.states.length;
    for (let k = 0; k < path.length - 1; k++) {
      // path[0] is Branner's point, path[1..count] the ideas, path[count + 1] Camila's point.
      const startDone = k === 0 || this.states[k - 1].done;
      const endDone = k < count ? this.states[k].done : this.bReached;
      if (!startDone || !endDone) continue;
      const glyph = k < count ? this.states[k].glyph : 1;
      const [x0, y0] = stage.camera.toScreen(path[k].x, path[k].y);
      const [x1, y1] = stage.camera.toScreen(path[k + 1].x, path[k + 1].y);
      // A trail of tiny steps rather than a road.
      ctx.setLineDash([1.5, 9]);
      drawLine(ctx, x0, y0, x1, y1, { a: alpha * glyph * (stage.camera.zoom < 0.5 ? 0.3 : 0.16), rgb: COLORS.thread });
      ctx.setLineDash([]);
    }
  }

  #drawNode(ctx, stage, node, i, t, alpha, zoomScale) {
    const [x, y] = stage.camera.toScreen(node.x, node.y);
    if (x < -160 || x > stage.w + 160 || y < -160 || y > stage.h + 160) return;
    if (this.engagedIndex === i) return;
    const state = this.states[i];

    if (state.done) {
      NODE_MODULES[node.id].glyph(ctx, x, y, { alpha: alpha * state.glyph * 0.85, scale: zoomScale, t });
      return;
    }

    if (this.activeIndex === i) {
      const pulse = 0.8 + 0.2 * Math.sin(t * 2.2);
      const d = Math.hypot(stage.camera.x - node.x, stage.camera.y - node.y);
      const near = 1 - smoothstep(110, 460, d);
      drawGlow(ctx, x, y, 60 + near * 40, alpha * (0.1 + near * 0.16), COLORS.warm);
      drawPoint(ctx, x, y, { r: 3.4, a: alpha * (0.8 + near * 0.2) * pulse, rgb: COLORS.warm, halo: 9, flare: true });
      if (near > 0.02) {
        ctx.globalAlpha = alpha * near * 0.6 * pulse;
        ctx.strokeStyle = rgba(COLORS.warm, 1);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 20 + 4 * Math.sin(t * 2.2), 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      return;
    }

    drawPoint(ctx, x, y, { r: 1.7, a: alpha * 0.32, rgb: COLORS.white, halo: 5 });
  }

  #drawPhrases(ctx, stage, t, alpha) {
    for (const phrase of this.journey.phrases) {
      const [x, y] = stage.camera.toScreen(phrase.x, phrase.y);
      if (x < -220 || x > stage.w + 220 || y < -120 || y > stage.h + 120) continue;

      const twinkle = 0.75 + 0.25 * Math.sin(t * 1.3 + phrase.index * 2.1);
      const speck = phrase.found ? 0.2 : 0.42 * twinkle;
      drawPoint(ctx, x, y, { r: 1.3, a: alpha * speck, rgb: COLORS.white, halo: 5 });

      const visible = Math.max(phrase.reveal, phrase.found ? HIDDEN_FLOOR : 0) * this.phraseFade;
      if (visible < 0.02) continue;
      ctx.globalAlpha = alpha * visible * 0.92;
      ctx.fillStyle = 'rgb(236,232,223)';
      ctx.font = 'italic 400 19px "Instrument Serif", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      // Keep the words on screen even when the speck itself is near an edge.
      const half = Math.max(...phrase.lines.map((line) => ctx.measureText(line).width)) / 2;
      const tx = clamp(x, half + 16, stage.w - half - 16);
      phrase.lines.forEach((line, k) => ctx.fillText(line, tx, y + 30 + k * 23));
      ctx.globalAlpha = 1;
    }
  }
}
