import { COLORS } from './config.js';
import { runDistancia } from './scenes/distancia.js';
import { runEpilogue } from './scenes/epilogue.js';
import { runExplore } from './scenes/explore.js';
import { runFinale } from './scenes/finale.js';
import { BinarySystem, runFuturo } from './scenes/futuro.js';
import { buildJourney, mapView } from './scenes/journey.js';
import { PointStar } from './scenes/actors/pointStar.js';
import { WorldActor } from './scenes/actors/world.js';
import { runUmbral } from './scenes/umbral.js';
import { sleep } from './util/async.js';

/** Builds the sky's fixed elements: the two points, the journey and the world actor. */
function setUp(app) {
  const { stage, hud } = app;
  const journey = buildJourney(stage);
  const points = {
    a: new PointStar({ name: 'branner', rgb: COLORS.gold, world: journey.a, phase: 0 }),
    b: new PointStar({ name: 'camila', rgb: COLORS.ice, world: journey.b, phase: 2.1 }),
  };
  const world = new WorldActor(app, journey);
  app.journey = journey;
  app.points = points;
  app.world = world;
  stage.add(world);
  stage.add(points.a);
  stage.add(points.b);
  hud.buildMap(journey.nodes.length);
  return { journey, points, world };
}

/** Puts the sky in the state a given chapter expects, so chapters can be tested on their own. */
function skipTo(app, { journey, points, world }, from, node) {
  const { stage, hud, sound, veil } = app;
  veil.classList.add('is-clear');
  stage.setBackdropBrightness(1);
  sound.setLevel(0.55);
  points.a.alpha = 1;
  points.b.alpha = 1;
  const done = from === 'explore' ? node : journey.nodes.length;
  for (let i = 0; i < done; i++) {
    world.complete(i);
    world.states[i].glyph = 1;
    hud.light(i + 1);
  }
  if (from === 'futuro' || from === 'finale') {
    world.bReached = true;
    hud.light(journey.nodes.length + 1);
    stage.camera.set(mapView(stage, journey));
  } else if (from === 'explore') {
    const at = node > 0 ? journey.nodes[node - 1] : journey.a;
    stage.camera.set({ x: at.x, y: at.y, zoom: 1, anchorY: 0.5 });
  } else {
    stage.camera.set(mapView(stage, journey));
  }
}

const nextEvent = (events, type) => new Promise((resolve) => {
  const off = events.on(type, () => {
    off();
    resolve();
  });
});

export async function runStory(app, { from = 'umbral', node = 0 } = {}) {
  const { stage, hud, sound } = app;
  const { camera } = stage;
  const parts = setUp(app);
  const { journey, points, world } = parts;

  camera.set({ x: journey.a.x, y: journey.a.y, zoom: 1, anchorY: 0.5 });
  const order = ['umbral', 'distancia', 'explore', 'futuro', 'finale'];
  const start = order.indexOf(from);

  if (start > 0) skipTo(app, parts, from, node);
  if (start <= 0) await runUmbral(app);
  if (start <= 1) await runDistancia(app, journey);
  hud.showMap(true);

  if (start <= 2) {
    await runExplore(app, world, journey, { from: start === 2 ? node : 0 });

    // Toward Camila's point, then far enough away to see both at once.
    hud.setLabel('');
    await camera.flyTo({ x: journey.b.x, y: journey.b.y, zoom: 1 }, app.reduced ? 600 : 4200);
    world.bReached = true;
    hud.light(journey.nodes.length + 1);
    await sleep(1600);
    await camera.flyTo(mapView(stage, journey), app.reduced ? 600 : 4800);
  }

  let system;
  if (start <= 3) {
    sound.setLevel(0.7);
    system = await runFuturo(app);
  } else {
    system = stage.add(new BinarySystem(app));
    system.progress = 1;
  }

  const tableau = await runFinale(app, system);

  // The ending stays; the reader can go back into the sky as many times as they like.
  const again = document.getElementById('again-btn');
  again.addEventListener('click', () => app.events.emit('again'));
  for (;;) {
    await nextEvent(app.events, 'again');
    await runEpilogue(app, journey, tableau);
  }
}
