/**
 * Tuning knobs for the whole experience. Anything numeric that changes how
 * the universe looks, moves or paces itself lives here.
 */

export const COLORS = {
  space: '#04050b',
  gold: [241, 197, 139], // Branner
  ice: [168, 200, 255], // Camila
  thread: [201, 211, 255],
  white: [230, 236, 255],
  warm: [255, 228, 196],
  home: [244, 184, 150],
};

/** Render quality tiers. The loop steps down when frames are consistently slow. */
export const QUALITY_TIERS = [
  { dprCap: 2, stars: 1, dust: 1, nebulaScale: 0.5 },
  { dprCap: 1.5, stars: 0.72, dust: 0.6, nebulaScale: 0.4 },
  { dprCap: 1, stars: 0.45, dust: 0, nebulaScale: 0.33 },
];

export const STARFIELD = {
  layers: [
    { depth: 0.1, count: 150, size: [0.6, 1.1], alpha: [0.22, 0.55], react: 0 },
    { depth: 0.28, count: 90, size: [0.8, 1.5], alpha: [0.3, 0.72], react: 0.5 },
    { depth: 0.62, count: 38, size: [1.1, 2.1], alpha: [0.45, 0.92], react: 1 },
    { depth: 0.42, count: 11, size: [1.7, 2.7], alpha: [0.28, 0.55], react: 0.4, flare: true },
  ],
  tileScale: 1.5,
  pointerParallax: 16, // px shift at depth 1
  pointerRadius: 120,
  tints: ['#cdd6ff', '#e6ecff', '#ffe4c4', '#ffffff'],
};

export const DUST = {
  count: 20,
  depth: 1.3,
  radius: [40, 100],
  alpha: [0.03, 0.075],
};

/** Nebula blobs are placed in journey space (u = along the path, v = across it). */
export const NEBULA = {
  textureSize: 144,
  blobs: [
    { u: 300, v: -100, depth: 0.07, size: 1.25, rgb: [46, 62, 150], alpha: 0.5, seed: 11, scale: 2.2, cutoff: 0.44 },
    { u: 1500, v: 300, depth: 0.09, size: 1.35, rgb: [82, 52, 132], alpha: 0.42, seed: 23, scale: 2.5, cutoff: 0.46 },
    { u: 2800, v: -260, depth: 0.07, size: 1.2, rgb: [30, 86, 128], alpha: 0.4, seed: 37, scale: 2.1, cutoff: 0.45 },
    { u: 3900, v: 200, depth: 0.1, size: 1.4, rgb: [92, 48, 110], alpha: 0.4, seed: 41, scale: 2.4, cutoff: 0.47 },
    { u: 5000, v: -180, depth: 0.08, size: 1.3, rgb: [40, 70, 146], alpha: 0.44, seed: 53, scale: 2.3, cutoff: 0.44 },
    { u: 6100, v: 140, depth: 0.08, size: 1.25, rgb: [118, 78, 96], alpha: 0.3, seed: 67, scale: 2.2, cutoff: 0.46 },
  ],
};

/**
 * The song, cut in three so it can follow a reader of any pace:
 * - `calm`: the hypnotic opening (40 s, seamless loop). Also used for the ending.
 * - `drop`: starts about 2.3 s before the synthesizers enter and plays once (2:42).
 * - `body`: a long seamless loop of the synthesizer section (86 s) that carries the journey
 *   for as long as it takes.
 */
export const AUDIO = {
  calm: 'assets/audio/calma.mp3',
  drop: 'assets/audio/sintesis.mp3',
  body: 'assets/audio/continuacion.mp3',
};

export const READING = {
  baseMs: 1500,
  perWordMs: 190,
  maxMs: 8500,
  staggerMs: 850,
  fadeOutMs: 950,
  longTextChars: 92,
};

/** Journey coordinates: u runs from Branner's point to Camila's point. */
export const JOURNEY = {
  length: 6300,
  a: { u: 0, v: -420 },
  b: { u: 6300, v: 380 },
  /** One waypoint per idea, in story order. */
  nodes: [
    { id: 'admiracion', u: 780, v: 260 },
    { id: 'crecimiento', u: 1560, v: -300 },
    { id: 'paz', u: 2340, v: 280 },
    { id: 'familia', u: 3120, v: -260 },
    { id: 'suenos', u: 3900, v: 300 },
    { id: 'tiempo', u: 4680, v: -280 },
    { id: 'vinculo', u: 5460, v: 260 },
  ],
  boundsRadius: 560,
  hiddenPhrases: { firstU: 510, stepU: 460, offset: [150, 240] },
  hiddenReveal: [340, 170], // fade-in distance range (world px)
};

export const CAMERA = {
  friction: 3.2,
  keyPanSpeed: 620,
  arenaAnchorY: 0.4,
};

export const INPUT = {
  tapSlop: 12,
  tapMs: 320,
  holdMs: 180,
};
