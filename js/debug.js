/**
 * Test scaffolding, only loaded with `?debug`. Browsers freeze requestAnimationFrame and
 * throttle timers in hidden tabs, which makes automated testing impossible. When the tab is
 * hidden this swaps them for a MessageChannel pump that keeps running at full speed.
 */
if (document.hidden) {
  const timers = new Map();
  const frames = new Map();
  let nextId = 1;
  let lastFrame = 0;
  const channel = new MessageChannel();

  const pump = () => {
    const now = performance.now();
    for (const [id, timer] of timers) {
      if (timer.at <= now) {
        timers.delete(id);
        timer.fn();
      }
    }
    if (now - lastFrame >= 16) {
      lastFrame = now;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((cb) => cb(now));
    }
    channel.port2.postMessage(0);
  };
  channel.port1.onmessage = pump;

  window.setTimeout = (fn, ms = 0) => {
    const id = nextId++;
    timers.set(id, { fn, at: performance.now() + ms });
    return id;
  };
  window.clearTimeout = (id) => timers.delete(id);
  window.requestAnimationFrame = (cb) => {
    const id = nextId++;
    frames.set(id, cb);
    return id;
  };
  window.cancelAnimationFrame = (id) => frames.delete(id);
  channel.port2.postMessage(0);
  console.info('[debug] hidden tab: using MessageChannel pump');
}
