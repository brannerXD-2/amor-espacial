import { READING } from '../config.js';
import { sleep } from '../util/async.js';

const wordCount = (lines) => lines.join(' ').split(/\s+/).filter(Boolean).length;
const readingMs = (lines) => Math.min(READING.maxMs, READING.baseMs + wordCount(lines) * READING.perWordMs);

/**
 * Shows the story one fragment at a time. Lines of a fragment fade in one after
 * another; a quiet dot tells the reader they can continue with a tap.
 * Fragments queue, so callers can simply `await` them in order.
 */
export class Fragments {
  constructor({ root, text, next }, input) {
    this.root = root;
    this.text = text;
    this.next = next;
    this.chain = Promise.resolve();
    this.waiting = null; // resolve() of the fragment waiting for a tap
    this.visible = false;
    this.pending = 0;
    input.on('tap', () => this.advance());
  }

  /** True while any fragment is on screen or queued. */
  get busy() {
    return this.visible || this.pending > 0;
  }

  advance() {
    if (!this.waiting) return;
    const resolve = this.waiting;
    this.waiting = null;
    resolve();
  }

  /**
   * Plays fragments in order, each waiting for a tap. `onAdvance(index)` runs at the moment of
   * the tap, before the text finishes fading out — for things that must start with the tap.
   */
  play(fragments, { pos = 'center', onAdvance } = {}) {
    return this.#enqueue(async () => {
      for (const [index, lines] of fragments.entries()) {
        await this.#show(lines, pos);
        await this.#waitForTap(readingMs(lines));
        onAdvance?.(index);
        await this.#hide();
      }
    });
  }

  /** A fragment that leaves on its own after `ms` (used while the reader is busy interacting). */
  auto(lines, { pos = 'high', ms } = {}) {
    return this.#enqueue(async () => {
      await this.#show(lines, pos);
      await sleep(ms ?? readingMs(lines) + 2400);
      await this.#hide();
    });
  }

  #enqueue(job) {
    this.pending++;
    const run = this.chain.then(job).finally(() => this.pending--);
    this.chain = run.catch(() => {});
    return run;
  }

  async #show(lines, pos) {
    const chars = lines.join('').length;
    this.root.dataset.pos = pos;
    this.root.dataset.size = chars > READING.longTextChars ? 'long' : lines.length > 2 ? 'wide' : '';
    this.text.replaceChildren(
      ...lines.map((line) => {
        const span = document.createElement('span');
        span.className = 'line';
        span.textContent = line;
        return span;
      }),
    );
    this.visible = true;
    await sleep(60);
    const spans = [...this.text.children];
    for (let i = 0; i < spans.length; i++) {
      spans[i].classList.add('is-in');
      if (i < spans.length - 1) await sleep(READING.staggerMs);
    }
  }

  async #waitForTap(dwellMs) {
    await sleep(dwellMs);
    this.next.classList.add('is-ready');
    await new Promise((resolve) => (this.waiting = resolve));
    this.next.classList.remove('is-ready');
  }

  async #hide() {
    this.next.classList.remove('is-ready');
    [...this.text.children].forEach((span) => span.classList.add('is-out'));
    await sleep(READING.fadeOutMs);
    this.text.replaceChildren();
    this.visible = false;
  }
}
