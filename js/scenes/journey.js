import { JOURNEY } from '../config.js';
import { CONTENT } from '../content.js';
import { clamp, lerp } from '../util/math.js';

/**
 * The geometry of the trip between the two points: where each idea sits, where the
 * hidden thoughts are, and how to stay near the path without a visible wall.
 * Built once, in world space, after the layout orientation is known.
 */
export function buildJourney(stage) {
  const toWorld = (u, v) => {
    const [x, y] = stage.journeyToWorld(u, v);
    return { x, y, u, v };
  };

  const a = toWorld(JOURNEY.a.u, JOURNEY.a.v);
  const b = toWorld(JOURNEY.b.u, JOURNEY.b.v);
  const nodes = JOURNEY.nodes.map((n, index) => ({ ...toWorld(n.u, n.v), id: n.id, index }));
  const path = [a, ...nodes, b];

  const vAt = (u) => {
    for (let i = 0; i < path.length - 1; i++) {
      const p = path[i];
      const q = path[i + 1];
      if (u <= q.u) return lerp(p.v, q.v, clamp((u - p.u) / (q.u - p.u)));
    }
    return b.v;
  };

  const { firstU, stepU, offset } = JOURNEY.hiddenPhrases;
  const phrases = CONTENT.hidden.map((lines, index) => {
    const u = firstU + index * stepU;
    const side = index % 2 ? 1 : -1;
    const spread = lerp(offset[0], offset[1], ((index * 37) % 10) / 10);
    return { ...toWorld(u, vAt(u) + side * spread), lines, index, reveal: 0, seen: 0, found: false };
  });

  /** Closest point on the polyline plus which segment it belongs to. */
  function nearestOnPath(x, y) {
    let best = { dist: Infinity, x: a.x, y: a.y, seg: 0, t: 0 };
    for (let i = 0; i < path.length - 1; i++) {
      const p = path[i];
      const q = path[i + 1];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const t = clamp(((x - p.x) * dx + (y - p.y) * dy) / (dx * dx + dy * dy));
      const px = p.x + dx * t;
      const py = p.y + dy * t;
      const dist = Math.hypot(x - px, y - py);
      if (dist < best.dist) best = { dist, x: px, y: py, seg: i, t };
    }
    return best;
  }

  return {
    a,
    b,
    nodes,
    path,
    phrases,
    nearestOnPath,

    /** 0..1 progress along the trip, spaced like the mini map (equal steps per idea). */
    fractionAlong(x, y) {
      const n = nearestOnPath(x, y);
      return (n.seg + n.t) / (path.length - 1);
    },

    /** Camera spring: gently returns toward the path once you drift too far. */
    boundsPull(x, y) {
      const n = nearestOnPath(x, y);
      if (n.dist <= JOURNEY.boundsRadius) return null;
      const k = (JOURNEY.boundsRadius * 0.94) / n.dist;
      return { x: n.x + (x - n.x) * k, y: n.y + (y - n.y) * k };
    },
  };
}

/** Camera view that frames the whole journey, both points included. */
export function mapView(stage, journey) {
  const { a, b } = journey;
  const dx = Math.max(Math.abs(b.x - a.x), 1);
  const dy = Math.max(Math.abs(b.y - a.y), 1);
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    zoom: Math.min((stage.w * 0.62) / dx, (stage.h * 0.66) / dy),
    anchorY: 0.5,
  };
}
