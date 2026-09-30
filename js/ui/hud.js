import { clamp, lerp } from '../util/math.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

/**
 * Everything that is not the sky or the story: the mini map of the journey,
 * the concept label, sound/tilt buttons, the hint line and the compass.
 * The map is deliberately not a menu — it only reflects what has been found.
 */
export class Hud {
  constructor(soundtrack, tilt) {
    this.root = document.getElementById('hud');
    this.mapSvg = document.getElementById('hud-map');
    this.labelEl = document.getElementById('hud-label');
    this.hintEl = document.getElementById('hint');
    this.compassEl = document.getElementById('compass');
    this.soundBtn = document.getElementById('sound-btn');
    this.tiltBtn = document.getElementById('tilt-btn');
    this.soundtrack = soundtrack;
    this.tilt = tilt;
    this.points = [];
    this.segments = [];
    this.here = null;
    this.hintTimer = 0;

    this.#bindButtons();
  }

  #bindButtons() {
    // The bars only "breathe" while music is really playing. If it is wanted but the
    // browser refused to start it, one tap here starts it instead of muting it.
    const syncSound = () => {
      const { active, wanted } = this.soundtrack;
      this.soundBtn.setAttribute('aria-pressed', String(active));
      // Wanted but not playing (the browser refused): the icon quietly asks to be tapped.
      this.soundBtn.dataset.attention = String(wanted && !active);
      this.soundBtn.setAttribute('aria-label', active ? 'Silenciar la música' : wanted ? 'Activar la música' : 'Activar la música');
    };
    syncSound();
    this.soundtrack.onChange(syncSound);
    this.soundBtn.addEventListener('click', () => {
      if (this.soundtrack.wanted && !this.soundtrack.started) this.soundtrack.prime();
      else this.soundtrack.toggle();
    });

    if (this.tilt.supported) {
      this.tiltBtn.hidden = false;
      this.tiltBtn.addEventListener('click', async () => {
        if (this.tilt.enabled) {
          this.tilt.disable();
        } else {
          await this.tilt.enable();
        }
        this.tiltBtn.setAttribute('aria-pressed', String(this.tilt.enabled));
      });
    }
  }

  /** Builds the mini map: Branner's point, one dot per idea, Camila's point. */
  buildMap(count) {
    const width = 200;
    const pad = 6;
    const step = (width - pad * 2) / (count + 1);
    this.mapSvg.replaceChildren();

    this.points = [];
    for (let i = 0; i < count + 2; i++) {
      const x = pad + i * step;
      const y = 9 + (i === 0 || i === count + 1 ? 0 : i % 2 ? 3.4 : -3.4);
      this.points.push({ x, y });
    }

    this.segments = [];
    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i];
      const b = this.points[i + 1];
      const path = svgEl('path', { d: `M${a.x} ${a.y}L${b.x} ${b.y}`, pathLength: 1, class: 'map-line' });
      path.style.strokeDasharray = '1';
      path.style.strokeDashoffset = '1';
      path.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(0.22, 0.61, 0.36, 1)';
      this.mapSvg.append(path);
      this.segments.push(path);
    }

    this.points.forEach((p, i) => {
      const kind = i === 0 ? 'map-node map-node--a' : i === this.points.length - 1 ? 'map-node map-node--b' : 'map-node';
      const circle = svgEl('circle', { cx: p.x, cy: p.y, r: i === 0 || i === this.points.length - 1 ? 2.2 : 1.5, class: kind });
      this.mapSvg.append(circle);
      p.el = circle;
    });

    this.here = svgEl('circle', { cx: this.points[0].x, cy: this.points[0].y, r: 4, class: 'map-here' });
    this.mapSvg.append(this.here);
  }

  showMap(visible = true) {
    this.root.classList.toggle('is-visible', visible);
  }

  /** Lights point `index` (1..count are the ideas, count+1 is Camila's point). */
  light(index) {
    const point = this.points[index];
    if (!point) return;
    point.el.classList.add('is-lit');
    point.el.setAttribute('r', index === this.points.length - 1 ? 2.6 : 2.2);
    this.segments[index - 1]?.style.setProperty('stroke-dashoffset', '0');
  }

  /** Slides the small ring along the map; `fraction` is progress along the journey. */
  setProgress(fraction) {
    if (!this.here) return;
    const f = clamp(fraction) * (this.points.length - 1);
    const i = Math.min(Math.floor(f), this.points.length - 2);
    const a = this.points[i];
    const b = this.points[i + 1];
    const t = f - i;
    this.here.setAttribute('cx', lerp(a.x, b.x, t).toFixed(2));
    this.here.setAttribute('cy', lerp(a.y, b.y, t).toFixed(2));
  }

  setLabel(text) {
    if (!text) {
      this.labelEl.classList.remove('is-visible');
      return;
    }
    this.labelEl.textContent = text;
    this.labelEl.classList.add('is-visible');
  }

  /** Short instruction line at the bottom. Empty text hides it. */
  hint(text) {
    clearTimeout(this.hintTimer);
    if (!text) {
      this.hintEl.classList.remove('is-visible');
      return;
    }
    if (this.hintEl.classList.contains('is-visible') && this.hintEl.textContent !== text) {
      this.hintEl.classList.remove('is-visible');
      this.hintTimer = setTimeout(() => this.#writeHint(text), 700);
    } else {
      this.#writeHint(text);
    }
  }

  #writeHint(text) {
    this.hintEl.textContent = text;
    // next frame so the transition runs from the hidden state
    requestAnimationFrame(() => this.hintEl.classList.add('is-visible'));
  }

  /**
   * Places the compass dot on an ellipse around the screen centre, pointing at
   * a target given in screen coordinates. Pass `null` to hide it.
   */
  pointCompass(target, stage) {
    const el = this.compassEl;
    if (!target) {
      el.classList.remove('is-visible');
      return;
    }
    const cx = stage.w / 2;
    const cy = stage.h / 2;
    const margin = 44;
    const onScreen =
      target.x > margin && target.x < stage.w - margin && target.y > margin + 40 && target.y < stage.h - margin - 40;
    if (onScreen) {
      el.classList.remove('is-visible');
      return;
    }
    const angle = Math.atan2(target.y - cy, target.x - cx);
    const rx = stage.w / 2 - 34;
    const ry = stage.h / 2 - 70;
    // Project onto a rounded ellipse so the dot hugs the edge in any aspect ratio.
    const x = cx + Math.cos(angle) * rx;
    const y = cy + Math.sin(angle) * ry;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    el.hidden = false;
    el.classList.add('is-visible');
  }
}
