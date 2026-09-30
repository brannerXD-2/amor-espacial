import { CONTENT } from '../../content.js';
import { easeSoft, lerp } from '../../util/math.js';
import { tween } from '../../util/async.js';

/** Tweens `obj[key]` to `to` over `ms`. */
export function tweenProp(obj, key, to, ms = 1200) {
  const from = obj[key];
  return tween(ms, (e) => (obj[key] = lerp(from, to, e)), easeSoft);
}

/** Plays a node's story fragments below the arena and waits for the reader. */
export function playNodeText(app, id) {
  return app.fragments.play(CONTENT.nodes[id].fragments, { pos: 'low' });
}

/** Adds an actor to the stage for the duration of a node and removes it afterwards. */
export async function withActor(app, actor, body) {
  app.stage.add(actor);
  try {
    await body(actor);
  } finally {
    app.stage.remove(actor);
  }
}

/** Subscribes to pointer presses/drags with a disposer, for node interactions. */
export function onPointer(input, fn) {
  const offs = [
    input.on('down', fn),
    input.on('move', (p) => {
      if (input.state.down) fn(p);
    }),
  ];
  return () => offs.forEach((off) => off());
}
