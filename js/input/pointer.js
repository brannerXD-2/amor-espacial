import { INPUT } from '../config.js';
import { createEmitter } from '../util/emitter.js';
import { lerp } from '../util/math.js';

const UI_SELECTOR = 'button, a, dialog, [data-ui]';

/**
 * One pointer for everything: mouse, finger and keyboard are folded into the same
 * state and events so no interaction depends on hover or on a single device.
 *
 * Events: down, up, tap, drag, holdstart, holdend, move, gesture
 */
export class Input {
  constructor() {
    this.events = createEmitter();
    this.pointerId = null;
    this.lastMoveT = 0;
    this.state = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      nx: 0,
      ny: 0,
      sx: 0,
      sy: 0,
      down: false,
      dragging: false,
      holding: false,
      holdMs: 0,
      t0: 0,
      vx: 0,
      vy: 0,
      path: 0,
      hover: false,
      lastActive: performance.now(),
      axis: { x: 0, y: 0 },
    };

    const opts = { passive: false };
    document.addEventListener('pointerdown', this.#onDown, opts);
    document.addEventListener('pointermove', this.#onMove, opts);
    document.addEventListener('pointerup', this.#onUp, opts);
    document.addEventListener('pointercancel', this.#onUp, opts);
    document.documentElement.addEventListener('pointerleave', () => (this.state.hover = this.state.down));
    document.addEventListener('keydown', this.#onKeyDown);
    document.addEventListener('keyup', this.#onKeyUp);
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => this.#release('key'));
  }

  on(type, fn) {
    return this.events.on(type, fn);
  }

  /** Seconds since the last pointer or key activity. */
  get idleSeconds() {
    return (performance.now() - this.state.lastActive) / 1000;
  }

  update(dt) {
    const s = this.state;
    if (s.down && !s.dragging && !s.holding && performance.now() - s.t0 > INPUT.holdMs) {
      s.holding = true;
      this.events.emit('holdstart');
    }
    if (s.holding) s.holdMs += dt * 1000;
  }

  #touch() {
    this.state.lastActive = performance.now();
  }

  #setPosition(x, y) {
    const s = this.state;
    s.x = x;
    s.y = y;
    s.nx = (x / window.innerWidth) * 2 - 1;
    s.ny = (y / window.innerHeight) * 2 - 1;
  }

  #press(x, y, source) {
    const s = this.state;
    s.down = true;
    s.dragging = false;
    s.holding = false;
    s.holdMs = 0;
    s.t0 = performance.now();
    s.sx = x;
    s.sy = y;
    s.path = 0;
    s.vx = s.vy = 0;
    s.source = source;
    this.#setPosition(x, y);
    this.#touch();
    this.events.emit('down', { x, y });
    this.events.emit('gesture');
  }

  #release(source) {
    const s = this.state;
    if (!s.down || s.source !== source) return;
    const wasDrag = s.dragging;
    const duration = performance.now() - s.t0;
    if (performance.now() - this.lastMoveT > 90) s.vx = s.vy = 0;
    s.down = false;
    s.dragging = false;
    if (s.holding) {
      s.holding = false;
      this.events.emit('holdend');
    }
    this.pointerId = null;
    this.#touch();
    if (!wasDrag && duration < INPUT.tapMs) this.events.emit('tap', { x: s.x, y: s.y });
    this.events.emit('up', { dragging: wasDrag, vx: s.vx, vy: s.vy });
    this.events.emit('gesture');
  }

  #onDown = (e) => {
    if (e.target.closest?.(UI_SELECTOR)) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    this.state.hover = true;
    this.#press(e.clientX, e.clientY, 'pointer');
  };

  #onMove = (e) => {
    if (this.pointerId !== null && e.pointerId !== this.pointerId) return;
    const s = this.state;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    this.#setPosition(e.clientX, e.clientY);
    s.hover = e.pointerType === 'mouse' || s.down;

    if (s.down && s.source === 'pointer') {
      s.path += Math.hypot(dx, dy);
      let dragDx = dx;
      let dragDy = dy;
      if (!s.dragging && Math.hypot(e.clientX - s.sx, e.clientY - s.sy) > INPUT.tapSlop) {
        s.dragging = true;
        dragDx = e.clientX - s.sx;
        dragDy = e.clientY - s.sy;
        if (s.holding) {
          s.holding = false;
          this.events.emit('holdend');
        }
      }
      if (s.dragging) {
        const dt = Math.max((e.timeStamp - this.lastMoveT) / 1000, 0.001);
        s.vx = lerp(s.vx, dx / dt, 0.35);
        s.vy = lerp(s.vy, dy / dt, 0.35);
        this.events.emit('drag', { dx: dragDx, dy: dragDy, x: s.x, y: s.y });
      }
    }
    this.lastMoveT = e.timeStamp;
    this.#touch();
    this.events.emit('move', { x: s.x, y: s.y });
  };

  #onUp = (e) => {
    if (e.pointerId !== this.pointerId) return;
    this.#release('pointer');
  };

  #onKeyDown = (e) => {
    const onControl = e.target.closest?.(UI_SELECTOR);
    const key = e.key;
    if ((key === ' ' || key === 'Enter') && !onControl) {
      e.preventDefault();
      if (!this.state.down && !e.repeat) this.#press(window.innerWidth / 2, window.innerHeight / 2, 'key');
      return;
    }
    const axis = this.state.axis;
    if (key === 'ArrowLeft') axis.x = -1;
    else if (key === 'ArrowRight') axis.x = 1;
    else if (key === 'ArrowUp') axis.y = -1;
    else if (key === 'ArrowDown') axis.y = 1;
    else if (key === 'Escape') this.events.emit('escape');
    else return;
    if (key.startsWith('Arrow')) e.preventDefault();
    this.#touch();
  };

  #onKeyUp = (e) => {
    const key = e.key;
    if (key === ' ' || key === 'Enter') {
      this.#release('key');
      return;
    }
    const axis = this.state.axis;
    if (key === 'ArrowLeft' && axis.x < 0) axis.x = 0;
    if (key === 'ArrowRight' && axis.x > 0) axis.x = 0;
    if (key === 'ArrowUp' && axis.y < 0) axis.y = 0;
    if (key === 'ArrowDown' && axis.y > 0) axis.y = 0;
  };
}
