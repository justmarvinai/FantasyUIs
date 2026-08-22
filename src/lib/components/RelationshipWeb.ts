import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp } from '../core/dom.ts';

export interface WebNode {
  id: string;
  label: string;
  /** Manifest asset id for the portrait or crest. */
  art?: string;
  /** Glyph asset id, used when there is no square art. */
  glyph?: string;
  /** Node colour. */
  color?: string;
  /** How big this node is relative to the others, 0.5–2. */
  weight?: number;
  /** The player, or whoever the web is centred on. */
  you?: boolean;
  /** Where it sits, 0–100 on both axes. Left off, nodes ring the centre. */
  at?: [number, number];
}

export interface WebTie {
  from: string;
  to: string;
  /** How the two feel about each other. */
  kind?: 'ally' | 'rival' | 'family' | 'oath' | 'debt' | 'hostile';
  /** How strong the tie is, 0–1. Drives the line's weight. */
  strength?: number;
  /** Printed on the line at its midpoint. */
  label?: string;
  /** The tie only runs one way — a debt owed, a grudge held. */
  directed?: boolean;
}

export interface RelationshipWebOptions extends BaseOptions {
  /** People, houses and factions to plot. */
  nodes: WebNode[];
  /** The relationships between them. */
  ties: WebTie[];
  /** Heading over the web. */
  title?: string;
  /** Height in pixels, or any CSS length. */
  height?: number | string;
  /** Which node is selected. Its ties are lit and the rest recede. */
  selected?: string;
  /** Draw the tie-kind key. */
  legend?: boolean;
  /** Read-only: no selecting. */
  readonly?: boolean;
}

const KINDS: Array<[NonNullable<WebTie['kind']>, string, string]> = [
  ['ally', 'Ally', 'var(--fui-success)'],
  ['family', 'Family', 'var(--fui-gold)'],
  ['oath', 'Oath', 'var(--fui-info)'],
  ['debt', 'Debt', 'var(--fui-warn)'],
  ['rival', 'Rival', 'var(--fui-xp)'],
  ['hostile', 'Hostile', 'var(--fui-danger)'],
];

/**
 * Who owes whom: factions, houses, companions and the ties between them, drawn
 * as a web you can pick through. A court intrigue screen, a faction standing
 * page, a companion approval chart.
 *
 *   const web = new RelationshipWeb({
 *     title: 'The Ashen Court', height: 380, legend: true, selected: 'you',
 *     nodes: [
 *       { id: 'you', label: 'You', you: true, at: [50, 50] },
 *       { id: 'crown', label: 'The Crown', art: 'crest-gilded-crown', weight: 1.3 },
 *     ],
 *     ties: [{ from: 'you', to: 'crown', kind: 'oath', strength: 0.8, label: 'Sworn' }],
 *   });
 *   web.on<string>('web:select', (id) => court.open(id));
 *
 * Nodes with no position ring the centre automatically, so a game can hand over
 * a cast list and get a readable web without laying anything out. Selecting a
 * node dims every tie it is not part of — a web that lights everything at once
 * is the same as a web that lights nothing.
 */
export class RelationshipWeb extends FuiComponent<RelationshipWebOptions> {
  private stage: HTMLElement;
  private svg: SVGSVGElement;
  private overlay: HTMLElement;

  constructor(opts: RelationshipWebOptions) {
    const root = h('div', {
      class: 'fui fui-web',
      style:
        opts.height != null
          ? { height: typeof opts.height === 'number' ? `${opts.height}px` : opts.height }
          : {},
    });
    super(root, opts);

    if (opts.title) {
      root.appendChild(h('span', { class: 'fui-web__title fui-title', text: opts.title }));
    }

    this.stage = h('div', { class: 'fui-web__stage' });
    const NS = 'http://www.w3.org/2000/svg';
    const doc = root.ownerDocument;
    this.svg = doc.createElementNS(NS, 'svg') as SVGSVGElement;
    this.svg.setAttribute('class', 'fui-web__ties');
    this.svg.setAttribute('viewBox', '0 0 100 100');
    this.svg.setAttribute('preserveAspectRatio', 'none');
    this.svg.setAttribute('aria-hidden', 'true');
    this.stage.appendChild(this.svg);

    // Nodes are HTML over the SVG: inside a stretched viewBox an SVG font-size
    // is measured in viewBox units, which makes every label the wrong size.
    this.overlay = h('div', { class: 'fui-web__nodes' });
    this.stage.appendChild(this.overlay);
    root.appendChild(this.stage);

    if (opts.legend ?? true) {
      const legend = h('div', { class: 'fui-web__legend' });
      const used = new Set(opts.ties.map((t) => t.kind ?? 'ally'));
      for (const [kind, label, color] of KINDS) {
        if (!used.has(kind)) continue;
        const key = h('span', { class: 'fui-web__key', style: { '--fui-web-ink': color } });
        key.appendChild(h('span', { class: 'fui-web__key-line' }));
        key.appendChild(h('span', { text: label }));
        legend.appendChild(key);
      }
      if (legend.childNodes.length) root.appendChild(legend);
    }
    this.render();
  }

  /** Ties touching a node. */
  tiesOf(id: string): WebTie[] {
    return this.opts.ties.filter((t) => t.from === id || t.to === id);
  }

  /** Select a node, lighting its ties and dimming the rest. */
  select(id: string | undefined): this {
    this.opts.selected = id;
    this.render();
    if (id) this.emit('web:select', id);
    return this;
  }

  /** Where a node sits. Unplaced nodes ring the centre in order. */
  private place(node: WebNode, index: number, unplaced: number): { x: number; y: number } {
    if (node.at) return { x: clamp(node.at[0], 0, 100), y: clamp(node.at[1], 0, 100) };
    if (node.you) return { x: 50, y: 50 };
    // Start at twelve o'clock so the first name lands where the eye already is.
    const a = (index / Math.max(1, unplaced)) * Math.PI * 2 - Math.PI / 2;
    return { x: 50 + Math.cos(a) * 36, y: 50 + Math.sin(a) * 36 };
  }

  private render(): void {
    clear(this.svg);
    clear(this.overlay);
    const NS = 'http://www.w3.org/2000/svg';
    const doc = this.el.ownerDocument;

    const unplaced = this.opts.nodes.filter((n) => !n.at && !n.you).length;
    const points = new Map<string, { x: number; y: number }>();
    let ring = 0;
    for (const node of this.opts.nodes) {
      const at = this.place(node, ring, unplaced);
      if (!node.at && !node.you) ring++;
      points.set(node.id, at);
    }

    for (const tie of this.opts.ties) {
      const a = points.get(tie.from);
      const b = points.get(tie.to);
      if (!a || !b) continue;
      const kind = tie.kind ?? 'ally';
      const lit = !this.opts.selected || tie.from === this.opts.selected || tie.to === this.opts.selected;

      const line = doc.createElementNS(NS, 'line');
      line.setAttribute('class', 'fui-web__tie');
      line.setAttribute('data-kind', kind);
      line.setAttribute('x1', a.x.toFixed(2));
      line.setAttribute('y1', a.y.toFixed(2));
      line.setAttribute('x2', b.x.toFixed(2));
      line.setAttribute('y2', b.y.toFixed(2));
      line.style.setProperty('--fui-web-weight', (1 + (tie.strength ?? 0.5) * 3).toFixed(2));
      if (!lit) line.classList.add('is-dim');
      this.svg.appendChild(line);

      if (tie.directed) {
        // The head sits short of the target so it is visible against the node
        // rather than tucked underneath it.
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const hx = b.x - (dx / len) * 7;
        const hy = b.y - (dy / len) * 7;
        const ux = dx / len;
        const uy = dy / len;
        const head = doc.createElementNS(NS, 'polygon');
        head.setAttribute('class', 'fui-web__arrow');
        head.setAttribute('data-kind', kind);
        head.setAttribute(
          'points',
          [
            `${hx.toFixed(2)},${hy.toFixed(2)}`,
            `${(hx - ux * 3.4 - uy * 1.9).toFixed(2)},${(hy - uy * 3.4 + ux * 1.9).toFixed(2)}`,
            `${(hx - ux * 3.4 + uy * 1.9).toFixed(2)},${(hy - uy * 3.4 - ux * 1.9).toFixed(2)}`,
          ].join(' '),
        );
        if (!lit) head.classList.add('is-dim');
        this.svg.appendChild(head);
      }

      if (tie.label && lit) {
        this.overlay.appendChild(
          h('span', {
            class: 'fui-web__tie-label',
            dataset: { kind },
            style: { left: `${((a.x + b.x) / 2).toFixed(2)}%`, top: `${((a.y + b.y) / 2).toFixed(2)}%` },
            text: tie.label,
          }),
        );
      }
    }

    for (const node of this.opts.nodes) {
      const at = points.get(node.id);
      if (!at) continue;
      const lit =
        !this.opts.selected ||
        node.id === this.opts.selected ||
        this.tiesOf(this.opts.selected).some((t) => t.from === node.id || t.to === node.id);

      const el = h(this.opts.readonly ? 'div' : 'button', {
        class: 'fui-web__node',
        dataset: { you: String(!!node.you), on: String(node.id === this.opts.selected) },
        style: {
          left: `${at.x.toFixed(2)}%`,
          top: `${at.y.toFixed(2)}%`,
          '--fui-web-weight': String(clamp(node.weight ?? 1, 0.5, 2)),
          ...(node.color ? { '--fui-web-ink': node.color } : {}),
        },
        attrs: { type: this.opts.readonly ? undefined : 'button', title: node.label },
      });
      if (!lit) el.classList.add('is-dim');

      const face = h('span', { class: 'fui-web__face' });
      if (node.art) face.style.backgroundImage = `var(--fui-img-${node.art})`;
      else if (node.glyph) {
        face.classList.add('is-glyph');
        face.style.setProperty('--fui-glyph-src', `var(--fui-img-${node.glyph})`);
      }
      el.appendChild(face);
      el.appendChild(h('span', { class: 'fui-web__name', text: node.label }));

      if (!this.opts.readonly) {
        el.addEventListener('click', () =>
          this.select(node.id === this.opts.selected ? undefined : node.id),
        );
      }
      this.overlay.appendChild(el);
    }
  }
}
