import { clamp } from './math.js';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs `onUpdate(easedProgress, rawProgress)` every frame for `ms` milliseconds. */
export function tween(ms, onUpdate, ease = (t) => t) {
  return new Promise((resolve) => {
    if (ms <= 0) {
      onUpdate(1, 1);
      resolve();
      return;
    }
    const start = performance.now();
    const step = (now) => {
      const t = clamp((now - start) / ms);
      onUpdate(ease(t), t);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

/** Resolves on the first animation frame where `predicate()` is truthy. */
export function until(predicate) {
  return new Promise((resolve) => {
    const check = () => {
      if (predicate()) resolve();
      else requestAnimationFrame(check);
    };
    check();
  });
}

