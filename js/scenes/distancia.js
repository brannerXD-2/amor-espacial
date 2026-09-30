import { COLORS } from '../config.js';
import { CONTENT } from '../content.js';
import { drawGlow, drawLine } from '../engine/sprites.js';
import { sleep, tween, until } from '../util/async.js';
import { clamp, easeInOut, easeOut, lerp } from '../util/math.js';
import { mapView } from './journey.js';
import { tweenProp } from './nodes/shared.js';

const HOLD_SECONDS = 3.4;
const PULSE_SECONDS = 3;

/**
 * The map view: a ruler that counts, and a hairline drawn from both ends while you
 * hold. Once joined, small lights start travelling along it, back and forth.
 */
export class DistanceLine {
  constructor(app, a, b) {
    this.app = app;
    this.a = a;
    this.b = b;
    this.alpha = 1;
    this.ruler = 0;
    this.progress = 0;
    this.interactive = false;
    this.pulses = [];
    this.nextPulse = 0;
    this.direction = 1;
    this.z = 6;
  }

  get joined() {
    return this.progress >= 1;
  }

  update(dt) {
    if (this.interactive && !this.joined) {
      const pressing = this.app.input.state.down;
      this.progress = clamp(this.progress + (pressing ? dt / HOLD_SECONDS : -dt / 16));
    }
    if (this.joined) {
      this.nextPulse -= dt;
      if (this.nextPulse <= 0) {
        this.pulses.push({ t: 0, dir: this.direction });
        this.direction *= -1;
        this.nextPulse = 2.4;
      }
    }
    for (const p of this.pulses) p.t += dt / PULSE_SECONDS;
    this.pulses = this.pulses.filter((p) => p.t < 1);
  }

  draw(ctx, stage) {
    const [ax, ay] = this.a.position(stage);
    const [bx, by] = this.b.position(stage);
    const length = Math.hypot(bx - ax, by - ay);
    if (length < 4) return;
    const a = this.alpha;

    // Ruler ticks: one every 100 world units, revealed from A toward B like a count.
    if (this.ruler > 0.005) {
      const step = Math.max(100 * stage.camera.zoom, 5);
      const total = Math.floor(length / step);
      const shown = Math.floor(total * this.ruler);
      const nx = -(by - ay) / length;
      const ny = (bx - ax) / length;
      ctx.strokeStyle = 'rgba(201,211,255,1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < shown; i++) {
        const t = (i * step) / length;
        const x = lerp(ax, bx, t);
        const y = lerp(ay, by, t);
        const size = i % 5 === 0 ? 5 : 2.5;
        ctx.moveTo(x - nx * size, y - ny * size);
        ctx.lineTo(x + nx * size, y + ny * size);
      }
      ctx.globalAlpha = a * 0.28;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // The thread, growing from both ends toward the middle.
    if (this.progress > 0.002) {
      const reach = this.progress * 0.5;
      const mx1 = lerp(ax, bx, reach);
      const my1 = lerp(ay, by, reach);
      const mx2 = lerp(bx, ax, reach);
      const my2 = lerp(by, ay, reach);
      const strength = 0.3 + 0.35 * this.progress;
      drawLine(ctx, ax, ay, mx1, my1, { a: a * strength, rgb: COLORS.gold });
      drawLine(ctx, bx, by, mx2, my2, { a: a * strength, rgb: COLORS.ice });
      if (!this.joined) {
        drawGlow(ctx, mx1, my1, 16, a * 0.7, COLORS.gold);
        drawGlow(ctx, mx2, my2, 16, a * 0.7, COLORS.ice);
      } else {
        drawLine(ctx, mx1, my1, mx2, my2, { a: a * strength, rgb: COLORS.thread });
      }
    }

    for (const pulse of this.pulses) {
      const e = easeInOut(pulse.t);
      const t = pulse.dir > 0 ? e : 1 - e;
      const x = lerp(ax, bx, t);
      const y = lerp(ay, by, t);
      const fade = Math.sin(Math.PI * pulse.t);
      drawGlow(ctx, x, y, 22, a * fade * 0.9, pulse.dir > 0 ? COLORS.gold : COLORS.ice);
    }
  }
}

export async function runDistancia(app, journey) {
  const { stage, fragments, hud, points } = app;
  const { camera } = stage;
  const { first, ruler, line, dive } = CONTENT.distancia;

  camera.set(mapView(stage, journey));
  hud.setLabel(CONTENT.distancia.label);
  const thread = stage.add(new DistanceLine(app, points.a, points.b));

  await sleep(app.debug ? 300 : 500);
  await tweenProp(points.a, 'alpha', 1, 1700);
  await sleep(app.debug ? 300 : 800);
  await tweenProp(points.b, 'alpha', 1, 1700);
  await sleep(app.debug ? 300 : 1500);

  await fragments.play(first);
  tween(3800, (e) => (thread.ruler = e), easeInOut);
  await fragments.play(ruler);

  // Hold to draw the thread.
  await sleep(600);
  hud.hint(CONTENT.distancia.holdHint);
  thread.interactive = true;
  await until(() => thread.joined);
  hud.hint('');
  await sleep(1600);

  await fragments.play(line);
  hud.setLabel('');

  // Down from the map into the journey. The tap that follows "Ven" is the cue: the same
  // instant the flight begins, the hypnotic loop is cut and the synthesizers hit — whatever
  // pace the reader took to get here. The flight launches fast, as if the sound threw it.
  let flight = Promise.resolve();
  await fragments.play(dive, {
    onAdvance: () => {
      app.sound.cue('drop', { instant: true });
      app.sound.setLevel(0.7);
      tween(2600, (e) => {
        thread.ruler = 1 - e;
        thread.alpha = 1 - e;
      });
      if (!app.reduced) pulseWarp(stage);
      flight = camera.flyTo(
        { x: journey.a.x, y: journey.a.y, zoom: 1, anchorY: 0.5 },
        app.reduced ? 700 : 3800,
        easeOut,
      );
    },
  });
  await flight;
  stage.remove(thread);
  return thread;
}

/** One quick surge of starlight, timed to the moment the synthesizers hit. */
async function pulseWarp(stage) {
  await sleep(300);
  await tween(1400, (e) => (stage.starfield.warp = Math.sin(Math.PI * e) * 0.5));
  stage.starfield.warp = 0;
}
