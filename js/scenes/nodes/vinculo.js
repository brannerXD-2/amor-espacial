import { COLORS } from '../../config.js';
import { CONTENT } from '../../content.js';
import { drawGlow, drawLine, drawPoint } from '../../engine/sprites.js';
import { sleep, until } from '../../util/async.js';
import { damp, dist, easeInOut, lerp, TAU } from '../../util/math.js';
import { onPointer, playNodeText, tweenProp, withActor } from './shared.js';

const EXCHANGES = 3;
const TRAVEL = 1.7;
const REPLY_DELAY = 1.1;

/**
 * You touch your star. A moment later, far away, another one answers.
 * The delay is the point: the answer is not instant, but it always arrives.
 */
class Echo {
  constructor(app) {
    this.app = app;
    this.alpha = 0;
    this.pulses = [];
    this.replyIn = -1;
    this.exchanges = 0;
    this.ripples = [];
    this.glow = { near: 0, far: 0 };
    this.z = 5;
  }

  get done() {
    return this.exchanges >= EXCHANGES && this.pulses.length === 0 && this.replyIn < 0;
  }

  get idle() {
    return this.pulses.length === 0 && this.replyIn < 0 && this.exchanges < EXCHANGES;
  }

  ends(stage) {
    const { x, y, r } = stage.arena;
    const d = r * 0.85;
    return { near: [x, y + d], far: [x, y - d] };
  }

  probe({ x, y }) {
    if (this.alpha < 0.8 || !this.idle) return;
    const [nx, ny] = this.ends(this.app.stage).near;
    if (dist(x, y, nx, ny) < 90) {
      this.pulses.push({ from: 'near', t: 0 });
      this.ripples.push({ at: 'near', t: 0 });
      navigator.vibrate?.(10);
    }
  }

  update(dt) {
    for (const pulse of this.pulses) pulse.t += dt / TRAVEL;

    const arrived = this.pulses.filter((p) => p.t >= 1);
    for (const pulse of arrived) {
      const side = pulse.from === 'near' ? 'far' : 'near';
      this.ripples.push({ at: side, t: 0 });
      if (pulse.from === 'near') {
        this.replyIn = REPLY_DELAY;
      } else {
        this.exchanges++;
        if (this.exchanges === 1) this.app.hud.hint(CONTENT.nodes.vinculo.hintAgain);
        if (this.exchanges >= EXCHANGES) this.app.hud.hint('');
      }
    }
    if (arrived.length) this.pulses = this.pulses.filter((p) => p.t < 1);

    if (this.replyIn >= 0) {
      this.replyIn -= dt;
      if (this.replyIn < 0) {
        this.pulses.push({ from: 'far', t: 0 });
        this.ripples.push({ at: 'far', t: 0 });
      }
    }

    for (const ripple of this.ripples) ripple.t += dt / 2.2;
    this.ripples = this.ripples.filter((r) => r.t < 1);

    const warmth = this.exchanges / EXCHANGES;
    this.glow.near = damp(this.glow.near, warmth, 1.5, dt);
    this.glow.far = damp(this.glow.far, warmth, 1.5, dt);
  }

  draw(ctx, stage, t) {
    const a = this.alpha;
    const { near, far } = this.ends(stage);
    const line = 0.16 + 0.2 * (this.exchanges / EXCHANGES);
    drawLine(ctx, near[0], near[1], far[0], far[1], { a: a * line, rgb: COLORS.thread });

    for (const pulse of this.pulses) {
      const e = easeInOut(Math.min(pulse.t, 1));
      const from = pulse.from === 'near' ? near : far;
      const to = pulse.from === 'near' ? far : near;
      const px = lerp(from[0], to[0], e);
      const py = lerp(from[1], to[1], e);
      const rgb = pulse.from === 'near' ? COLORS.gold : COLORS.ice;
      drawGlow(ctx, px, py, 24, a * 0.8, rgb);
      drawPoint(ctx, px, py, { r: 2, a, rgb, halo: 4 });
    }

    for (const ripple of this.ripples) {
      const [rx, ry] = ripple.at === 'near' ? near : far;
      const rgb = ripple.at === 'near' ? COLORS.gold : COLORS.ice;
      ctx.globalAlpha = a * (1 - ripple.t) * 0.5;
      ctx.strokeStyle = `rgba(${rgb.join(',')},1)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(rx, ry, 10 + ripple.t * 46, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const cue = this.idle ? 0.75 + 0.25 * Math.sin(t * 3) : 1;
    drawPoint(ctx, near[0], near[1], {
      r: 3.6,
      a: a * cue,
      rgb: COLORS.gold,
      halo: 8 + this.glow.near * 4,
      flare: true,
    });
    drawPoint(ctx, far[0], far[1], {
      r: 3.6,
      a,
      rgb: COLORS.ice,
      halo: 8 + this.glow.far * 4,
      flare: true,
    });
  }
}

export const vinculo = {
  id: 'vinculo',

  glyph(ctx, x, y, { alpha, scale, t }) {
    const d = 22 * scale;
    drawLine(ctx, x, y + d, x, y - d, { a: alpha * 0.3, rgb: COLORS.thread });
    drawPoint(ctx, x, y + d, { r: 2 * scale + 0.5, a: alpha, rgb: COLORS.gold, halo: 6 });
    drawPoint(ctx, x, y - d, { r: 2 * scale + 0.5, a: alpha, rgb: COLORS.ice, halo: 6 });
    const p = (t * 0.35) % 1;
    drawGlow(ctx, x, y + d - 2 * d * p, 8 * scale + 4, alpha * 0.6 * Math.sin(Math.PI * p), COLORS.thread);
  },

  async run(app) {
    const echo = new Echo(app);
    await withActor(app, echo, async () => {
      const stopProbing = onPointer(app.input, (p) => echo.probe(p));
      await tweenProp(echo, 'alpha', 1, 1800);
      await sleep(800);
      app.hud.hint(CONTENT.nodes.vinculo.hint);
      await until(() => echo.done);
      stopProbing();
      app.hud.hint('');
      await sleep(2000);
      await playNodeText(app, 'vinculo');
      await tweenProp(echo, 'alpha', 0, 1400);
    });
  },
};
