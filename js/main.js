import { Soundtrack } from './audio/soundtrack.js';
import { Stage } from './engine/stage.js';
import { Loop } from './engine/loop.js';
import { Input } from './input/pointer.js';
import { Tilt } from './input/tilt.js';
import { runStory } from './story.js';
import { bindCredits } from './ui/credits.js';
import { Fragments } from './ui/fragments.js';
import { Hud } from './ui/hud.js';
import { createEmitter } from './util/emitter.js';

const params = new URLSearchParams(location.search);

async function boot() {
  if (params.has('debug')) await import('./debug.js');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || params.get('motion') === 'reduce';
  const debug = params.has('debug');

  const stage = new Stage(document.getElementById('universe'), { reduced });
  stage.horizontal = window.innerWidth > window.innerHeight * 1.05;
  stage.resize();

  const input = new Input();
  const tilt = new Tilt(stage);
  const sound = new Soundtrack('assets/audio/space-ambience.mp3');
  const hud = new Hud(sound, tilt);
  const fragments = new Fragments(
    {
      root: document.getElementById('fragment'),
      text: document.getElementById('fragment-text'),
      next: document.getElementById('fragment-next'),
    },
    input,
  );
  bindCredits(input);

  const app = {
    stage,
    input,
    tilt,
    sound,
    hud,
    fragments,
    reduced,
    debug,
    veil: document.getElementById('veil'),
    events: createEmitter(),
    state: { found: new Set() },
  };

  const loop = new Loop((dt) => {
    input.update(dt);
    tilt.update(dt);
    sound.update(dt);
    stage.update(dt, input);
    stage.render();
  });
  loop.onSlow = () => stage.setTier(stage.tier + 1);

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => stage.resize(), 120);
  });

  // Fonts first, so the very first words never flash in a fallback face.
  await Promise.race([
    Promise.all([
      document.fonts.load('400 1em "Instrument Serif"'),
      document.fonts.load('italic 400 1em "Instrument Serif"'),
      document.fonts.load('300 1em "DM Mono"'),
      document.fonts.load('400 1em "Geist Mono"'),
    ]),
    new Promise((resolve) => setTimeout(resolve, 1800)),
  ]);

  document.body.classList.remove('is-loading');
  loop.start();
  if (debug) window.app = app;

  runStory(app, { from: params.get('from') ?? 'umbral', node: Number(params.get('node') ?? 0) }).catch((error) => {
    console.error(error);
  });
}

boot();
