import { CAMERA } from '../config.js';
import { clamp, damp, easeInOut, lerp } from '../util/math.js';

/**
 * A 2D camera with inertia, soft bounds and cinematic flights.
 * `anchor` is where the camera centre lands on screen (0..1), so a node can be
 * framed above the text area without changing world coordinates.
 */
export class Camera {
  constructor(stage) {
    this.stage = stage;
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.anchor = { x: 0.5, y: 0.5 };
    this.anchorTarget = 0.5; // anchor.y eases toward this whenever the camera is free
    this.vx = 0;
    this.vy = 0;
    this.locked = false;
    this.flight = null;
    this.bounds = null; // (x, y) => { x, y } point to be pulled toward, or null
  }

  get flying() {
    return this.flight !== null;
  }

  toScreen(wx, wy) {
    const { w, h } = this.stage;
    return [w * this.anchor.x + (wx - this.x) * this.zoom, h * this.anchor.y + (wy - this.y) * this.zoom];
  }

  set(view) {
    if (view.x !== undefined) this.x = view.x;
    if (view.y !== undefined) this.y = view.y;
    if (view.zoom !== undefined) this.zoom = view.zoom;
    if (view.anchorY !== undefined) this.anchor.y = this.anchorTarget = view.anchorY;
    this.vx = this.vy = 0;
  }

  pan(dxScreen, dyScreen) {
    if (this.locked || this.flight) return;
    this.x -= dxScreen / this.zoom;
    this.y -= dyScreen / this.zoom;
  }

  fling(vxScreen, vyScreen) {
    if (this.locked || this.flight) return;
    this.vx = -vxScreen / this.zoom;
    this.vy = -vyScreen / this.zoom;
  }

  stop() {
    this.vx = this.vy = 0;
  }

  /** Smoothly moves to `to` ({x, y, zoom, anchorY}); zoom is interpolated in log space. */
  flyTo(to, ms = 2200, ease = easeInOut) {
    this.stop();
    return new Promise((resolve) => {
      this.flight = {
        from: { x: this.x, y: this.y, lz: Math.log(this.zoom), ay: this.anchor.y },
        to: {
          x: to.x ?? this.x,
          y: to.y ?? this.y,
          lz: Math.log(to.zoom ?? this.zoom),
          ay: to.anchorY ?? this.anchor.y,
        },
        elapsed: 0,
        ms: Math.max(ms, 1),
        ease,
        resolve,
      };
    });
  }

  update(dt) {
    const f = this.flight;
    if (f) {
      f.elapsed += dt * 1000;
      const p = clamp(f.elapsed / f.ms);
      const e = f.ease(p);
      this.x = lerp(f.from.x, f.to.x, e);
      this.y = lerp(f.from.y, f.to.y, e);
      this.zoom = Math.exp(lerp(f.from.lz, f.to.lz, e));
      this.anchor.y = lerp(f.from.ay, f.to.ay, e);
      if (p >= 1) {
        this.flight = null;
        this.anchorTarget = f.to.ay;
        f.resolve();
      }
      return;
    }
    if (this.locked) return;
    this.anchor.y = damp(this.anchor.y, this.anchorTarget, 2.4, dt);

    const friction = Math.exp(-CAMERA.friction * dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= friction;
    this.vy *= friction;

    if (this.bounds) {
      const pull = this.bounds(this.x, this.y);
      if (pull) {
        this.x = damp(this.x, pull.x, 1.6, dt);
        this.y = damp(this.y, pull.y, 1.6, dt);
      }
    }
  }
}
