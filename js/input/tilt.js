import { clamp, damp } from '../util/math.js';

/**
 * Optional device-tilt parallax. iOS needs a permission prompt triggered by a tap,
 * so this is an explicit toggle, never something that pops up on its own.
 */
export class Tilt {
  constructor(stage) {
    this.stage = stage;
    this.enabled = false;
    this.target = { x: 0, y: 0 };
    this.onOrientation = (e) => {
      if (e.gamma == null || e.beta == null) return;
      this.target.x = clamp(e.gamma / 28, -1, 1);
      this.target.y = clamp((e.beta - 50) / 28, -1, 1);
    };
  }

  get supported() {
    return 'DeviceOrientationEvent' in window && window.matchMedia('(pointer: coarse)').matches;
  }

  async enable() {
    if (!this.supported || this.stage.reduced) return false;
    const Ctor = window.DeviceOrientationEvent;
    if (typeof Ctor.requestPermission === 'function') {
      try {
        if ((await Ctor.requestPermission()) !== 'granted') return false;
      } catch {
        return false;
      }
    }
    window.addEventListener('deviceorientation', this.onOrientation);
    this.enabled = true;
    return true;
  }

  disable() {
    window.removeEventListener('deviceorientation', this.onOrientation);
    this.enabled = false;
    this.target.x = this.target.y = 0;
  }

  update(dt) {
    const { tilt } = this.stage;
    tilt.x = damp(tilt.x, this.target.x * 0.8, 3, dt);
    tilt.y = damp(tilt.y, this.target.y * 0.8, 3, dt);
  }
}
