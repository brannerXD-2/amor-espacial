/**
 * requestAnimationFrame loop that pauses in the background, can be capped to a
 * lower frame rate while the sky is idle, and reports sustained slowness so the
 * renderer can step down its quality (battery and older phones).
 */
export class Loop {
  constructor(tick) {
    this.tick = tick;
    this.running = false;
    this.last = 0;
    this.minFrameMs = 0;
    this.onSlow = null;
    this.slowFrames = 0;
    this.warmup = 0;
    this.raf = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop();
      else this.start();
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.warmup = 90;
    this.raf = requestAnimationFrame(this.#frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  #frame = (now) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.#frame);
    const elapsed = now - this.last;
    if (elapsed < this.minFrameMs - 2) return;
    this.last = now;
    this.tick(Math.min(elapsed / 1000, 0.05), now / 1000);

    if (this.warmup > 0) {
      this.warmup--;
      return;
    }
    if (this.minFrameMs === 0 && this.onSlow) {
      this.slowFrames = elapsed > 26 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 2);
      if (this.slowFrames > 75) {
        this.slowFrames = 0;
        this.warmup = 120;
        this.onSlow();
      }
    }
  };
}
