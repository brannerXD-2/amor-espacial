import { NEBULA } from '../config.js';
import { clamp, lerp, smoothstep } from '../util/math.js';

function hash(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  return lerp(
    lerp(hash(ix, iy, seed), hash(ix + 1, iy, seed), u),
    lerp(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), u),
    v,
  );
}

function fbm(x, y, seed) {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  for (let o = 0; o < 5; o++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + o * 17);
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

/** Wispy, domain-warped noise painted once into a tiny canvas and scaled up. */
function makeTexture({ seed, rgb, scale, cutoff }) {
  const size = NEBULA.textureSize;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  const image = g.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;
      const base = fbm(nx * scale, ny * scale, seed);
      const warped = fbm(nx * scale + base * 1.3, ny * scale - base * 1.3, seed + 99);
      const density = smoothstep(cutoff, 0.92, warped);
      const r = Math.hypot(nx - 0.5, ny - 0.5) * 2;
      const falloff = 1 - smoothstep(0.45, 1, r);
      const shade = 0.7 + 0.6 * base;
      const i = (y * size + x) * 4;
      image.data[i] = Math.min(255, rgb[0] * shade);
      image.data[i + 1] = Math.min(255, rgb[1] * shade);
      image.data[i + 2] = Math.min(255, rgb[2] * shade);
      image.data[i + 3] = density * falloff * 255;
    }
  }
  g.putImageData(image, 0, 0);
  return canvas;
}

/**
 * Faint clouds far behind the stars. They are rendered into a half-resolution
 * cache that only refreshes when the camera or the fade actually changes.
 */
export class Nebula {
  constructor() {
    this.blobs = NEBULA.blobs.map((b) => ({ ...b, texture: makeTexture(b) }));
    this.alpha = 1;
    this.cache = document.createElement('canvas');
    this.cacheCtx = this.cache.getContext('2d');
    this.cacheScale = 0.5;
    this.key = '';
  }

  resize(w, h, scale) {
    this.cacheScale = scale;
    this.cache.width = Math.max(2, Math.ceil(w * scale));
    this.cache.height = Math.max(2, Math.ceil(h * scale));
    this.key = '';
  }

  draw(ctx, stage) {
    if (this.alpha <= 0.003) return;
    const { w, h, camera, parallax } = stage;
    const zoomK = clamp(camera.zoom, 0.25, 1);
    const key = [
      Math.round(camera.x * 4),
      Math.round(camera.y * 4),
      Math.round(camera.zoom * 1000),
      Math.round(parallax.x * 40),
      Math.round(parallax.y * 40),
      Math.round(this.alpha * 200),
      w,
      h,
    ].join('|');

    if (key !== this.key) {
      this.key = key;
      this.#paint(stage, zoomK);
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(this.cache, 0, 0, w, h);
  }

  #paint(stage, zoomK) {
    const { w, h, camera, parallax } = stage;
    const g = this.cacheCtx;
    const s = this.cacheScale;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.cache.width, this.cache.height);
    g.setTransform(s, 0, 0, s, 0, 0);
    const span = Math.max(w, h);

    for (const blob of this.blobs) {
      const [wx, wy] = stage.journeyToWorld(blob.u, blob.v);
      const px = w / 2 + (wx - camera.x) * blob.depth * zoomK + parallax.x * blob.depth * 30;
      const py = h / 2 + (wy - camera.y) * blob.depth * zoomK + parallax.y * blob.depth * 30;
      const size = span * blob.size;
      if (px + size / 2 < 0 || px - size / 2 > w || py + size / 2 < 0 || py - size / 2 > h) continue;
      g.globalAlpha = blob.alpha * this.alpha;
      g.drawImage(blob.texture, px - size / 2, py - size / 2, size, size);
    }
    g.globalAlpha = 1;
  }
}
