import { COLORS } from '../config.js';
import { CONTENT } from '../content.js';
import { sleep, until } from '../util/async.js';
import { clamp, damp, dist, easeInOut, lerp, rgba } from '../util/math.js';
import { Beacon } from './actors/beacon.js';
import { DistanceLine } from './distancia.js';
import { tweenProp } from './nodes/shared.js';

const TRAIL_MAX = 240;
const TRAIL_CHUNKS = 10;

/**
 * Two points that begin far apart and end sharing one orbit around a common centre.
 * They never merge — they simply end up travelling the same path.
 * `progress` (0..1) drives separation and angular speed; the trail keeps the history.
 */
export class BinarySystem {
  constructor(app) {
    const { stage, points } = app;
    this.app = app;
    this.a = points.a;
    this.b = points.b;
    const [ax, ay] = this.a.position(stage);
    const [bx, by] = this.b.position(stage);
    this.start = { x: (ax + bx) / 2, y: (ay + by) / 2 };
    this.distance0 = Math.hypot(bx - ax, by - ay);
    this.phi = Math.atan2(by - ay, bx - ax);
    this.progress = 0;
    this.mode = 'orbit'; // orbit → release → final
    this.trailA = [];
    this.trailB = [];
    this.trailAlpha = 1;
    this.release = null;
    this.z = 15;
  }

  /** Called by the finale: send both points to their resting places. */
  startRelease(seconds) {
    this.mode = 'release';
    this.release = {
      t: 0,
      seconds,
      fromA: { x: this.a.screen.x, y: this.a.screen.y },
      fromB: { x: this.b.screen.x, y: this.b.screen.y },
    };
  }

  update(dt, t, stage) {
    if (this.mode === 'off') return;
    if (this.mode === 'orbit') this.#orbit(dt, stage);
    else if (this.mode === 'release') this.#release(dt, stage);
    else this.#settle(stage);
    this.#record();
  }

  #orbit(dt, stage) {
    const p = this.progress;
    const { w, h } = stage;
    const radius = Math.min(w, h) * 0.17;
    const centre = {
      x: lerp(this.start.x, w / 2, easeInOut(p)),
      y: lerp(this.start.y, h * 0.36, easeInOut(p)),
    };
    const separation = lerp(this.distance0, radius * 2, easeInOut(p));
    this.phi += lerp(0.05, 0.85, Math.pow(p, 1.3)) * dt;
    // While they are still far apart the pair turns inside an ellipse, so neither leaves the screen.
    let dx = (Math.cos(this.phi) * separation) / 2;
    let dy = (Math.sin(this.phi) * separation) / 2;
    const fit = Math.max(1, Math.hypot(dx / (w / 2 - 44), dy / (h / 2 - 96)));
    dx /= fit;
    dy /= fit;
    this.a.screen = { x: centre.x - dx, y: centre.y - dy };
    this.b.screen = { x: centre.x + dx, y: centre.y + dy };
  }

  #release(dt, stage) {
    const r = this.release;
    r.t = Math.min(1, r.t + dt / r.seconds);
    const e = easeInOut(r.t);
    const layout = this.layout(stage);
    this.a.screen = { x: lerp(r.fromA.x, layout.p1.x, e), y: lerp(r.fromA.y, layout.p1.y, e) };
    this.b.screen = { x: lerp(r.fromB.x, layout.p2.x, e), y: lerp(r.fromB.y, layout.p2.y, e) };
    if (r.t >= 1) this.mode = 'final';
  }

  #settle(stage) {
    const layout = this.layout(stage);
    this.a.screen = { ...layout.p1 };
    this.b.screen = { ...layout.p2 };
  }

  layout(stage) {
    return finalLayout(stage.w, stage.h);
  }

  #record() {
    for (const [trail, star] of [
      [this.trailA, this.a],
      [this.trailB, this.b],
    ]) {
      const last = trail[trail.length - 1];
      const { x, y } = star.screen;
      if (!last || Math.hypot(x - last.x, y - last.y) > 0.8) trail.push({ x, y });
      if (trail.length > TRAIL_MAX) trail.shift();
    }
  }

  draw(ctx) {
    if (this.trailAlpha <= 0.004) return;
    this.#drawTrail(ctx, this.trailA, COLORS.gold);
    this.#drawTrail(ctx, this.trailB, COLORS.ice);
  }

  #drawTrail(ctx, trail, rgb) {
    const n = trail.length;
    if (n < 2) return;
    const size = Math.ceil(n / TRAIL_CHUNKS);
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    for (let c = 0; c < TRAIL_CHUNKS; c++) {
      const from = c * size;
      const to = Math.min(n - 1, (c + 1) * size);
      if (from >= to) break;
      ctx.beginPath();
      ctx.moveTo(trail[from].x, trail[from].y);
      for (let i = from + 1; i <= to; i++) ctx.lineTo(trail[i].x, trail[i].y);
      ctx.globalAlpha = this.trailAlpha * 0.5 * ((c + 1) / TRAIL_CHUNKS) ** 1.6;
      ctx.strokeStyle = rgba(rgb, 1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

/** Where the two points rest at the very end, and where the small constellation sits between them. */
export function finalLayout(w, h) {
  const portrait = h > w;
  const p1 = portrait ? { x: w * 0.24, y: h * 0.2 } : { x: w * 0.31, y: h * 0.28 };
  const p2 = portrait ? { x: w * 0.76, y: h * 0.33 } : { x: w * 0.69, y: h * 0.28 };
  return { p1, p2 };
}

export async function runFuturo(app) {
  const { stage, input, fragments, hud, points } = app;
  const { intro, milestones, closing } = CONTENT.futuro;

  hud.setLabel(CONTENT.futuro.label);
  const system = stage.add(new BinarySystem(app));
  system.update(0, 0, stage); // adopt the map positions right away
  const thread = stage.add(new DistanceLine(app, points.a, points.b));
  thread.progress = 1;

  await fragments.play(intro);
  hud.hint(CONTENT.futuro.hint);

  let raw = 0;
  let lastPath = 0;
  let wasDown = false;
  let next = 0;
  let idle = 0;
  let introHintCleared = false;
  let reminding = false;
  const diagonal = Math.hypot(stage.w, stage.h);

  const driver = {
    update(dt) {
      const s = input.state;
      let gain = 0;
      if (s.down) {
        if (!wasDown) lastPath = s.path;
        gain = (s.path - lastPath) / (diagonal * 3.6);
        lastPath = s.path;
        if (!s.dragging) gain += dt * 0.012; // holding still moves things, just very slowly
      }
      wasDown = s.down;

      // The first hint goes away once things move; if the reader stops before the two
      // points have met, a second one reminds them how to go on.
      if (!introHintCleared && system.progress > 0.04) {
        introHintCleared = true;
        hud.hint('');
      }
      idle = s.down ? 0 : idle + dt;
      const stalled = idle > 6 && !fragments.busy && system.progress > 0.04 && raw < 0.99;
      if (stalled && !reminding) {
        reminding = true;
        hud.hint(CONTENT.futuro.keepHint);
      } else if (reminding && s.down) {
        reminding = false;
        hud.hint('');
      }

      const upcoming = milestones[next]?.at ?? 1;
      const limit = fragments.busy ? upcoming - 0.02 : 1;
      raw = clamp(raw + Math.min(Math.max(gain, 0), dt * 0.55), 0, Math.max(limit, system.progress));
      // The last stretch settles by itself, so nobody is left wondering how to finish.
      if (raw > 0.9 && !fragments.busy) raw = Math.min(1, raw + dt * 0.12);
      system.progress = damp(system.progress, raw, 2.2, dt);

      thread.alpha = 1 - clamp(system.progress * 8);
      app.world.alpha = 1 - 0.65 * clamp(system.progress * 2);

      if (next < milestones.length && system.progress >= milestones[next].at) {
        fragments.auto(milestones[next].lines, { pos: 'low' });
        next++;
      }
      const labels = clamp((system.progress - 0.94) / 0.06);
      points.a.labelAlpha = labels;
      points.b.labelAlpha = labels;
    },
  };
  stage.add(driver);

  await until(() => system.progress > 0.995 && !fragments.busy);
  hud.hint('');
  stage.remove(driver);
  stage.remove(thread);
  await sleep(4200);
  await fragments.play(closing, { pos: 'low' });
  hud.setLabel('');
  await touchTheLight(app);
  return system;
}

/** The ending only begins when the reader touches the white light at the centre of the orbit. */
async function touchTheLight(app) {
  const { stage, input, hud, sound } = app;
  const beacon = stage.add(new Beacon());
  await tweenProp(beacon, 'alpha', 1, 2600);
  await sleep(900);
  hud.hint(CONTENT.futuro.beaconHint);

  await new Promise((resolve) => {
    const off = input.on('tap', ({ x, y }) => {
      const [cx, cy] = beacon.center(stage);
      const byKey = input.state.source === 'key';
      if (byKey || dist(x, y, cx, cy) < beacon.hitRadius(stage)) {
        off();
        resolve();
      }
    });
  });

  hud.hint('');
  beacon.touch();
  navigator.vibrate?.(14);
  sound.setLevel(0.45);
  await sleep(1900);
  stage.remove(beacon);
}
