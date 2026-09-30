import { CONTENT } from '../content.js';
import { sleep } from '../util/async.js';
import { hideFinalTableau, showFinalTableau } from './finale.js';
import { runFreeExplore } from './explore.js';
import { tweenProp } from './nodes/shared.js';

const TOTAL_PHRASES = CONTENT.hidden.length;

/**
 * After the ending: the whole sky is open, every idea is already lit, and the
 * thoughts that were missed can still be found. A quiet link returns to the ending.
 */
export async function runEpilogue(app, journey, tableau) {
  const { stage, hud, points, world, events } = app;
  const { camera } = stage;
  const found = document.getElementById('found');
  const back = document.getElementById('back-btn');
  const onBack = { requested: false };

  back.textContent = CONTENT.finale.back;
  const updateFound = () => {
    found.textContent = CONTENT.epilogue.found(app.state.found.size, TOTAL_PHRASES);
  };
  updateFound();
  const offFound = events.on('found', updateFound);
  const requestBack = () => (onBack.requested = true);
  back.addEventListener('click', requestBack, { once: true });

  // Ending out, sky back in: the points leave the frame, the camera moves to the trip.
  tweenProp(points.a, 'alpha', 0, 1200);
  tweenProp(points.b, 'alpha', 0, 1200);
  await sleep(1300);
  tableau.system.mode = 'off';
  points.a.screen = null;
  points.b.screen = null;
  world.completeAll();
  const mid = journey.path[Math.floor(journey.path.length / 2)];
  camera.set({ x: mid.x, y: mid.y, zoom: 1, anchorY: 0.5 });
  hud.showMap(true);
  hud.setProgress(0.5);
  await hideFinalTableau(app, tableau, 2200);
  points.a.alpha = 1;
  points.b.alpha = 1;

  back.hidden = false;
  found.hidden = false;
  requestAnimationFrame(() => {
    back.classList.add('is-visible');
    found.classList.add('is-visible');
  });

  await runFreeExplore(app, world, journey, { onBack });

  back.classList.remove('is-visible');
  found.classList.remove('is-visible');
  offFound();
  await sleep(600);
  back.hidden = true;
  found.hidden = true;
  hud.showMap(false);

  tweenProp(points.a, 'alpha', 0, 900);
  tweenProp(points.b, 'alpha', 0, 900);
  await sleep(1000);
  tableau.system.mode = 'final';
  await showFinalTableau(app, tableau, 2600);
}
