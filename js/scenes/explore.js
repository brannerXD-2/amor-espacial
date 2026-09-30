import { CAMERA } from '../config.js';
import { CONTENT } from '../content.js';
import { clamp, dist } from '../util/math.js';
import { until } from '../util/async.js';
import { NODE_MODULES } from './nodes/index.js';

/** Drag to pan (with inertia), arrow keys too. Returns a disposer. */
function bindPan(app, isEnabled = () => true) {
  const { input, stage } = app;
  const { camera } = stage;
  const offs = [
    input.on('down', () => camera.stop()),
    input.on('drag', ({ dx, dy }) => isEnabled() && camera.pan(dx, dy)),
    input.on('up', ({ dragging, vx, vy }) => dragging && isEnabled() && camera.fling(vx, vy)),
  ];
  const keys = {
    update(dt) {
      const { axis } = input.state;
      if ((axis.x || axis.y) && isEnabled() && !camera.locked && !camera.flying) {
        camera.x += axis.x * CAMERA.keyPanSpeed * dt;
        camera.y += axis.y * CAMERA.keyPanSpeed * dt;
      }
    },
  };
  stage.add(keys);
  return () => {
    offs.forEach((off) => off());
    stage.remove(keys);
  };
}

/** Flight duration that feels the same whether the star is near or far. */
function glideMs(app, distance) {
  if (app.reduced) return 500;
  return clamp(1500 + distance * 0.9, 1800, 4200);
}

/**
 * Free travel between the ideas. The next star glows; a small compass dot on the
 * edge of the screen points to it (tap it to be taken there). Tapping the star
 * itself opens its moment.
 */
export async function runExplore(app, world, journey, { from = 0 } = {}) {
  const { stage, input, hud } = app;
  const { camera } = stage;
  let panEnabled = true;
  let target = null;
  let hintKey = '';

  const setHint = (key, text) => {
    if (hintKey === key) return;
    hintKey = key;
    hud.hint(text);
  };

  camera.bounds = (x, y) => journey.boundsPull(x, y);
  stage.shooting.enabled = !app.reduced;
  const disposePan = bindPan(app, () => panEnabled);

  const director = {
    update() {
      hud.setProgress(journey.fractionAlong(camera.x, camera.y));
      if (!target || !panEnabled) {
        hud.pointCompass(null, stage);
        return;
      }
      const [sx, sy] = camera.toScreen(target.x, target.y);
      hud.pointCompass({ x: sx, y: sy }, stage);

      const onScreen = sx > 40 && sx < stage.w - 40 && sy > 100 && sy < stage.h - 100;
      const close = dist(camera.x, camera.y, target.x, target.y) < 260;
      if (close && onScreen && !camera.flying) setHint('tap', CONTENT.explore.tapHint);
      else if (hintKey === 'tap') setHint('', '');
    },
  };
  stage.add(director);

  const offDragHint = input.on('drag', () => {
    if (hintKey === 'drag') setHint('', '');
    offDragHint();
  });

  const glideTo = (node) =>
    camera.flyTo({ x: node.x, y: node.y, anchorY: CAMERA.arenaAnchorY }, glideMs(app, dist(camera.x, camera.y, node.x, node.y)));

  const onCompass = () => {
    if (target && panEnabled && !camera.flying) glideTo(target);
  };
  hud.compassEl.addEventListener('click', onCompass);

  hud.showMap(true);
  hud.setProgress(journey.fractionAlong(camera.x, camera.y));

  for (let i = from; i < journey.nodes.length; i++) {
    const node = journey.nodes[i];
    target = node;
    world.setActive(i);
    if (i === from && from === 0) setHint('drag', CONTENT.explore.dragHint);
    panEnabled = true;

    await new Promise((resolve) => {
      const off = input.on('tap', ({ x, y }) => {
        if (camera.flying || !panEnabled) return;
        const [sx, sy] = camera.toScreen(node.x, node.y);
        const byKey = input.state.source === 'key' && dist(camera.x, camera.y, node.x, node.y) < 170;
        if (dist(x, y, sx, sy) < 66 || byKey) {
          off();
          resolve();
        }
      });
    });

    panEnabled = false;
    target = null;
    setHint('', '');
    hud.pointCompass(null, stage);
    camera.stop();
    await camera.flyTo({ x: node.x, y: node.y, anchorY: CAMERA.arenaAnchorY }, app.reduced ? 500 : 1500);
    camera.locked = true;
    world.engage(i);
    hud.setLabel(CONTENT.nodes[node.id].label);

    await NODE_MODULES[node.id].run(app, { node, world });

    world.complete(i);
    hud.light(i + 1);
    hud.setLabel('');
    camera.locked = false;
    camera.anchorTarget = 0.5;
  }

  target = null;
  hud.compassEl.removeEventListener('click', onCompass);
  disposePan();
  stage.remove(director);
  hud.pointCompass(null, stage);
  stage.shooting.enabled = false;
  camera.bounds = null;
}

/** After the story: wander freely, look for what was missed, then go back to the ending. */
export async function runFreeExplore(app, world, journey, { onBack }) {
  const { stage, hud } = app;
  const { camera } = stage;
  camera.bounds = (x, y) => journey.boundsPull(x, y);
  camera.locked = false;
  stage.shooting.enabled = !app.reduced;
  const disposePan = bindPan(app);

  const director = {
    update() {
      hud.setProgress(journey.fractionAlong(camera.x, camera.y));
    },
  };
  stage.add(director);
  hud.showMap(true);
  await until(() => onBack.requested);
  disposePan();
  stage.remove(director);
  stage.shooting.enabled = false;
  camera.bounds = null;
}
