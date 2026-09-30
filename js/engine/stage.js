import { COLORS, QUALITY_TIERS } from '../config.js';
import { damp } from '../util/math.js';
import { Dust, ShootingStars } from './ambient.js';
import { Camera } from './camera.js';
import { Nebula } from './nebula.js';
import { Starfield } from './starfield.js';

/**
 * Owns the canvas, the camera, the living backdrop and the list of actors.
 * An actor is any object with optional `update(dt, t, stage)`, `draw(ctx, stage, t)`,
 * `z` (draw order) and `dead` (removed on the next frame).
 */
export class Stage {
  constructor(canvas, { reduced = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.reduced = reduced;

    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.tier = 0;
    this.horizontal = false;

    this.camera = new Camera(this);
    this.starfield = new Starfield();
    this.nebula = new Nebula();
    this.dust = new Dust();
    this.shooting = new ShootingStars();

    this.actors = [];
    this.needsSort = false;
    this.parallax = { x: 0, y: 0 };
    this.pointer = { x: 0, y: 0, active: 0 };
    this.tilt = { x: 0, y: 0 };
    this.time = 0;
    this.parallaxEnabled = !reduced;
  }

  /** The framed square where node interactions happen. */
  get arena() {
    const { camera, w, h } = this;
    return {
      x: w * camera.anchor.x,
      y: h * camera.anchor.y,
      r: Math.min(w * 0.9, h * 0.55) * 0.37,
    };
  }

  /** Journey space (u along the path, v across it) → world space. */
  journeyToWorld(u, v) {
    return this.horizontal ? [u, v] : [v, u];
  }

  resize() {
    const cap = QUALITY_TIERS[this.tier].dprCap;
    this.dpr = Math.min(window.devicePixelRatio || 1, cap);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.nebula.resize(this.w, this.h, QUALITY_TIERS[this.tier].nebulaScale);
  }

  setTier(index) {
    this.tier = Math.max(0, Math.min(QUALITY_TIERS.length - 1, index));
    const tier = QUALITY_TIERS[this.tier];
    this.starfield.density = tier.stars;
    this.dust.density = tier.dust;
    this.resize();
  }

  add(actor) {
    actor.z ??= 0;
    this.actors.push(actor);
    this.needsSort = true;
    return actor;
  }

  remove(actor) {
    actor.dead = true;
  }

  update(dt, input) {
    this.time += dt;
    const state = input.state;

    // Parallax target from the pointer (mouse hover / finger) and, optionally, device tilt.
    let tx = 0;
    let ty = 0;
    if (this.parallaxEnabled) {
      if (state.hover) {
        tx = state.nx;
        ty = state.ny;
      }
      tx += this.tilt.x;
      ty += this.tilt.y;
    }
    this.parallax.x = damp(this.parallax.x, tx, 2.4, dt);
    this.parallax.y = damp(this.parallax.y, ty, 2.4, dt);

    this.pointer.x = state.x;
    this.pointer.y = state.y;
    this.pointer.active = damp(this.pointer.active, state.hover && !this.reduced ? 1 : 0, 4, dt);

    this.camera.update(dt);
    this.starfield.update(dt);
    this.shooting.update(dt, this);

    for (const actor of this.actors) if (!actor.dead) actor.update?.(dt, this.time, this);
    if (this.actors.some((a) => a.dead)) this.actors = this.actors.filter((a) => !a.dead);
  }

  render() {
    const { ctx, w, h, dpr } = this;
    const t = this.time;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.space;
    ctx.fillRect(0, 0, w, h);

    this.nebula.draw(ctx, this);
    this.starfield.draw(ctx, this, t);
    this.dust.draw(ctx, this, t);
    this.shooting.draw(ctx);

    if (this.needsSort) {
      this.actors.sort((a, b) => a.z - b.z);
      this.needsSort = false;
    }
    for (const actor of this.actors) {
      if (actor.visible === false) continue;
      ctx.globalAlpha = 1;
      try {
        actor.draw?.(ctx, this, t);
      } catch (error) {
        // One misbehaving actor must never freeze the whole sky.
        actor.visible = false;
        console.error(error);
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Everything in the backdrop fades together (used by the finale). */
  setBackdropBrightness(value) {
    this.starfield.brightness = value;
    this.dust.brightness = value;
    this.nebula.alpha = value;
  }
}
