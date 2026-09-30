import { COLORS } from '../config.js';
import { mixRgb, rgba, TAU } from '../util/math.js';

const glowCache = new Map();
const flareCache = new Map();

const SIZE = 128;

function makeCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  return canvas;
}

/** Soft radial glow, pre-rendered once per colour. */
function glowSprite(rgb) {
  const key = rgb.join();
  if (glowCache.has(key)) return glowCache.get(key);
  const canvas = makeCanvas();
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE / 2);
  grad.addColorStop(0, rgba(rgb, 1));
  grad.addColorStop(0.1, rgba(rgb, 0.55));
  grad.addColorStop(0.3, rgba(rgb, 0.17));
  grad.addColorStop(0.62, rgba(rgb, 0.04));
  grad.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, SIZE, SIZE);
  glowCache.set(key, canvas);
  return canvas;
}

/** Glow plus a thin four-point diffraction cross. */
function flareSprite(rgb) {
  const key = rgb.join();
  if (flareCache.has(key)) return flareCache.get(key);
  const canvas = makeCanvas();
  const g = canvas.getContext('2d');
  g.drawImage(glowSprite(rgb), 0, 0);
  const half = SIZE / 2;
  for (const [x0, y0, x1, y1] of [
    [0, half, SIZE, half],
    [half, 0, half, SIZE],
  ]) {
    const grad = g.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, rgba(rgb, 0));
    grad.addColorStop(0.5, rgba(rgb, 0.85));
    grad.addColorStop(1, rgba(rgb, 0));
    g.strokeStyle = grad;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  }
  flareCache.set(key, canvas);
  return canvas;
}

export function drawGlow(ctx, x, y, radius, alpha, rgb = COLORS.white) {
  if (alpha <= 0.004 || radius <= 0) return;
  ctx.globalAlpha = Math.min(alpha, 1);
  ctx.drawImage(glowSprite(rgb), x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
}

export function drawFlare(ctx, x, y, radius, alpha, rgb = COLORS.white) {
  if (alpha <= 0.004 || radius <= 0) return;
  ctx.globalAlpha = Math.min(alpha, 1);
  ctx.drawImage(flareSprite(rgb), x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
}

/**
 * A luminous point: halo + optional flare + bright core.
 * `r` is the core radius in px; the halo is `r * halo`.
 */
export function drawPoint(ctx, x, y, { r = 3, a = 1, rgb = COLORS.white, halo = 7, flare = false } = {}) {
  if (a <= 0.004) return;
  drawGlow(ctx, x, y, r * halo, a * 0.85, rgb);
  if (flare) drawFlare(ctx, x, y, r * halo * 1.25, a * 0.7, rgb);
  ctx.globalAlpha = Math.min(a, 1);
  ctx.fillStyle = rgba(mixRgb(rgb, [255, 255, 255], 0.78), 1);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Hairline between two screen points. */
export function drawLine(ctx, x0, y0, x1, y1, { a = 0.4, rgb = COLORS.thread, width = 1 } = {}) {
  if (a <= 0.004) return;
  ctx.globalAlpha = Math.min(a, 1);
  ctx.strokeStyle = rgba(rgb, 1);
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Text with manual letter-spacing (canvas letterSpacing is not universal yet). */
export function drawSpacedText(ctx, text, x, y, spacing = 2, align = 'center') {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((sum, w) => sum + w, 0) + spacing * (chars.length - 1);
  let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, cursor, y);
    cursor += widths[i] + spacing;
  });
}
