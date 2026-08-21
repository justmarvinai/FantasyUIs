import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface WheelElement {
  id: string;
  label: string;
  /** The element's colour. */
  color: string;
  /** Manifest asset id for the node's art. */
  art?: string;
  /** Glyph asset id, used when there is no square art. */
  glyph?: string;
  /** Element ids this one is strong against. Arrows are drawn from these. */
  beats?: string[];
  /** How many of this element the player owns, printed on the node. */
  count?: number;
}

export interface ElementWheelOptions extends BaseOptions {
  /** The elements, placed evenly around the ring in this order. */
  elements: WheelElement[];
  /** Heading over the wheel. */
  title?: string;
  /** Diameter in pixels. */
  size?: number;
  /** Element the player is looking at. Its matchups are called out. */
  selected?: string;
  /** Element being fought, if a matchup is in play. */
  against?: string;
  /** Draw the arrows between elements. */
  arrows?: boolean;
  /** Multiplier text for a winning matchup. */
  strongLabel?: string;
  /** Multiplier text for a losing matchup. */
  weakLabel?: string;
  /** Turn selection off — a legend rather than a control. */
  readonly?: boolean;
}

/**
 * The affinity ring every squad RPG puts in its tutorial and then hides in a
 * help menu: who beats whom, drawn as a wheel with the arrows on it.
 *
 *   const wheel = new ElementWheel({
 *     title: 'Affinity', arrows: true, selected: 'fire', against: 'nature',
 *     elements: [
 *       { id: 'fire', label: 'Fire', color: '#e2622f', beats: ['nature'], art: 'fire-sunburst' },
 *       { id: 'water', label: 'Water', color: '#3f8fd6', beats: ['fire'], art: 'hunt-frost-bolt' },
 *       { id: 'nature', label: 'Nature', color: '#4fae52', beats: ['water'], art: 'fx-nature-surge' },
 *     ],
 *   });
 *   wheel.on<string>('wheel:select', (id) => showRoster(id));
 *
 * Positions are computed once from the element count, so a three-element
 * triangle and a six-element hexagon come from the same code. The arrows are a
 * single SVG under the nodes, drawn from each element's own `beats` list — one
 * source of truth for both the picture and `matchup()`.
 */
export class ElementWheel extends FuiComponent<ElementWheelOptions> {
  private ring: HTMLElement;
  private svg: SVGSVGElement;
  private verdict: HTMLElement | null = null;

  constructor(opts: ElementWheelOptions) {
    const size = opts.size ?? 260;
    const root = h('div', {
      class: 'fui fui-wheel',
      style: { '--fui-wheel-size': `${size}px` },
    });
    super(root, opts);

    if (opts.title) {
      root.appendChild(h('span', { class: 'fui-wheel__title fui-title', text: opts.title }));
    }

    this.ring = h('div', { class: 'fui-wheel__ring' });
    const NS = 'http://www.w3.org/2000/svg';
    this.svg = root.ownerDocument.createElementNS(NS, 'svg') as SVGSVGElement;
    this.svg.setAttribute('class', 'fui-wheel__arrows');
    this.svg.setAttribute('viewBox', '0 0 100 100');
    this.svg.setAttribute('aria-hidden', 'true');
    this.ring.appendChild(this.svg);
    root.appendChild(this.ring);

    if (opts.selected) {
      this.verdict = h('p', { class: 'fui-wheel__verdict' });
      root.appendChild(this.verdict);
    }
    this.render();
  }

  /**
   * How `attacker` fares into `defender`: `'strong'`, `'weak'` or `'even'`.
   * Both the arrows and the verdict line read from this, so the picture can
   * never disagree with the ruling.
   */
  matchup(attacker: string, defender: string): 'strong' | 'weak' | 'even' {
    const a = this.opts.elements.find((e) => e.id === attacker);
    const d = this.opts.elements.find((e) => e.id === defender);
    if (!a || !d) return 'even';
    if (a.beats?.includes(defender)) return 'strong';
    if (d.beats?.includes(attacker)) return 'weak';
    return 'even';
  }

  /** Which element is selected. */
  get(): string | undefined {
    return this.opts.selected;
  }

  select(id: string): this {
    if (!this.opts.elements.some((e) => e.id === id)) return this;
    this.opts.selected = id;
    this.render();
    this.emit('wheel:select', id);
    return this;
  }

  /** Set the element being fought and redraw the verdict. */
  setAgainst(id: string | undefined): this {
    this.opts.against = id;
    this.render();
    return this;
  }

  /** Where each element sits, as a percentage of the ring. */
  private place(index: number): { x: number; y: number } {
    const n = this.opts.elements.length || 1;
    // Start at twelve o'clock and run clockwise, which is how every affinity
    // chart in the genre is drawn.
    const a = (index / n) * Math.PI * 2 - Math.PI / 2;
    return { x: 50 + Math.cos(a) * 36, y: 50 + Math.sin(a) * 36 };
  }

  private render(): void {
    // Keep the SVG; rebuild everything else.
    for (const node of [...this.ring.children]) {
      if (node !== (this.svg as unknown as Element)) this.ring.removeChild(node);
    }
    clear(this.svg);

    const NS = 'http://www.w3.org/2000/svg';
    const points = this.opts.elements.map((_, i) => this.place(i));

    if (this.opts.arrows ?? true) {
      this.opts.elements.forEach((el, i) => {
        for (const targetId of el.beats ?? []) {
          const j = this.opts.elements.findIndex((e) => e.id === targetId);
          if (j < 0) continue;
          const from = points[i];
          const to = points[j];
          // Stop short of both nodes so the head is visible against the art
          // rather than tucked underneath it.
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const len = Math.hypot(dx, dy) || 1;
          const pad = 11;
          const line = this.svg.ownerDocument.createElementNS(NS, 'line');
          line.setAttribute('class', 'fui-wheel__arrow');
          line.setAttribute('x1', (from.x + (dx / len) * pad).toFixed(2));
          line.setAttribute('y1', (from.y + (dy / len) * pad).toFixed(2));
          line.setAttribute('x2', (to.x - (dx / len) * pad).toFixed(2));
          line.setAttribute('y2', (to.y - (dy / len) * pad).toFixed(2));
          line.style.setProperty('--fui-wheel-ink', el.color);
          if (this.opts.selected === el.id) line.classList.add('is-from');
          else if (this.opts.selected === targetId) line.classList.add('is-to');
          else if (this.opts.selected) line.classList.add('is-dim');
          this.svg.appendChild(line);

          const head = this.svg.ownerDocument.createElementNS(NS, 'polygon');
          const hx = to.x - (dx / len) * pad;
          const hy = to.y - (dy / len) * pad;
          const ux = dx / len;
          const uy = dy / len;
          head.setAttribute('class', 'fui-wheel__head');
          head.setAttribute(
            'points',
            [
              `${hx.toFixed(2)},${hy.toFixed(2)}`,
              `${(hx - ux * 4 - uy * 2.2).toFixed(2)},${(hy - uy * 4 + ux * 2.2).toFixed(2)}`,
              `${(hx - ux * 4 + uy * 2.2).toFixed(2)},${(hy - uy * 4 - ux * 2.2).toFixed(2)}`,
            ].join(' '),
          );
          head.style.setProperty('--fui-wheel-ink', el.color);
          if (this.opts.selected === el.id) head.classList.add('is-from');
          else if (this.opts.selected === targetId) head.classList.add('is-to');
          else if (this.opts.selected) head.classList.add('is-dim');
          this.svg.appendChild(head);
        }
      });
    }

    this.opts.elements.forEach((el, i) => {
      const p = points[i];
      const node = h(this.opts.readonly ? 'div' : 'button', {
        class: 'fui-wheel__node',
        dataset: { id: el.id },
        style: {
          left: `${p.x}%`,
          top: `${p.y}%`,
          '--fui-wheel-ink': el.color,
        },
        attrs: {
          type: this.opts.readonly ? undefined : 'button',
          title: el.label,
          'aria-pressed': this.opts.readonly ? undefined : String(el.id === this.opts.selected),
        },
      });
      if (el.id === this.opts.selected) node.classList.add('is-on');
      if (el.id === this.opts.against) node.classList.add('is-target');

      const face = h('span', { class: 'fui-wheel__face' });
      if (el.art) face.style.backgroundImage = `var(--fui-img-${el.art})`;
      else if (el.glyph) {
        face.classList.add('is-glyph');
        face.style.setProperty('--fui-glyph-src', `var(--fui-img-${el.glyph})`);
      }
      node.appendChild(face);
      node.appendChild(h('span', { class: 'fui-wheel__label', text: el.label }));
      if (el.count != null) {
        node.appendChild(h('span', { class: 'fui-wheel__count fui-num', text: String(el.count) }));
      }
      if (!this.opts.readonly) node.addEventListener('click', () => this.select(el.id));
      this.ring.appendChild(node);
    });

    this.paintVerdict();
  }

  private paintVerdict(): void {
    if (!this.verdict) return;
    const { selected, against } = this.opts;
    if (!selected) {
      this.verdict.textContent = '';
      return;
    }
    const me = this.opts.elements.find((e) => e.id === selected);
    if (!me) return;

    if (!against) {
      const beats = (me.beats ?? [])
        .map((id) => this.opts.elements.find((e) => e.id === id)?.label)
        .filter(Boolean);
      const beatenBy = this.opts.elements
        .filter((e) => e.beats?.includes(selected))
        .map((e) => e.label);
      this.verdict.dataset.result = 'even';
      this.verdict.textContent =
        `${me.label} is strong against ${beats.join(', ') || 'nothing'}` +
        `, weak to ${beatenBy.join(', ') || 'nothing'}.`;
      return;
    }

    const foe = this.opts.elements.find((e) => e.id === against);
    const result = this.matchup(selected, against);
    this.verdict.dataset.result = result;
    this.verdict.textContent =
      result === 'strong'
        ? `${me.label} into ${foe?.label} — ${this.opts.strongLabel ?? 'bonus damage, higher crit'}`
        : result === 'weak'
          ? `${me.label} into ${foe?.label} — ${this.opts.weakLabel ?? 'reduced damage, attacks can miss'}`
          : `${me.label} into ${foe?.label} — neutral`;
  }
}
