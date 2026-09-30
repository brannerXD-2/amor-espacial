export const TAU = Math.PI * 2;

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a));
export const mod = (n, m) => ((n % m) + m) % m;
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/** Exponential smoothing that is independent of the frame rate. */
export const damp = (current, target, lambda, dt) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const smoothstep = (a, b, v) => {
  const t = invLerp(a, b, v);
  return t * t * (3 - 2 * t);
};

export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeSoft = (t) => t * t * (3 - 2 * t);

/** Small deterministic PRNG so the sky looks the same on every visit. */
export function createRng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rangeOf = (rng, [min, max]) => lerp(min, max, rng());

export const rgba = ([r, g, b], a = 1) => `rgba(${r},${g},${b},${a})`;
export const mixRgb = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));
