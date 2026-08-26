import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface TargetArrowOptions extends BaseOptions {
  /** Where the drag started, in the arrow's own coordinate space. */
  from?: { x: number; y: number };
  /** Where it currently points. */
  to?: { x: number; y: number };
  /** What kind of action is being aimed. */
  kind?: 'attack' | 'spell' | 'friendly' | 'invalid';
  /** Colour, overriding the kind's. */
  color?: string;
  /** Locked onto a legal target — the head snaps and swells. */
  locked?: boolean;
  /** Line thickness in pixels. */
  weight?: number;
  /** Hidden until `aim()` is called. */
  hidden?: boolean;
}

/**
 * The drag-to-target arrow: the curved line from a minion to whatever it is
 * about to hit. Every action in a card game that needs a target draws one, and
 * nothing else in a UI looks like it.
 *
 *   const arrow = new TargetArrow({ kind: 'attack', hidden: true });
 *   board.appendChild(arrow.el);
 *   board.addEventListener('pointermove', (e) => arrow.aim(origin, board, e));
 *   board.addEventListener('pointerup', () => arrow.hide());
 *
 * The curve is a quadratic Bézier whose control point is pushed *perpendicular*
 * to the line, by a fraction of its own length — so a short drag bows gently and
 * a cross-board drag arcs hard, without either being hand-tuned. A straight line
 * reads as a UI affordance; a bowed one reads as an intent, which is why every
 * game in the genre bows it.
 *
 * `aim()` takes the pointer event and the element the arrow is drawn inside,
 * and does the coordinate conversion itself — measuring against the container's
 * own rect rather than the viewport, so the arrow is correct inside a
 * transformed board, which is where most of them get drawn.
 */
export class TargetArrow extends FuiComponent<TargetArrowOptions> {
  private svg: SVGSVGElement;
  private path: SVGPathElement;
  private head: SVGPolygonElement;
  private origin: SVGCircleElement;

  constructor(opts: TargetArrowOptions = {}) {
    const root = h('div', {
      class: 'fui fui-targetarrow',
      dataset: { kind: opts.kind ?? 'attack', locked: opts.locked ? 'on' : 'off', shown: opts.hidden ? 'off' : 'on' },
      style: {
        '--fui-arrow-weight': `${opts.weight ?? 7}px`,
        ...(opts.color ? { '--fui-arrow-ink': opts.color } : {}),
      },
      attrs: { 'aria-hidden': 'true' },
    });
    super(root, opts);

    const NS = 'http://www.w3.org/2000/svg';
    const doc = root.ownerDocument;
    this.svg = doc.createElementNS(NS, 'svg') as SVGSVGElement;
    this.svg.setAttribute('class', 'fui-targetarrow__svg');
    this.svg.setAttribute('preserveAspectRatio', 'none');

    this.path = doc.createElementNS(NS, 'path') as SVGPathElement;
    this.path.setAttribute('class', 'fui-targetarrow__line');
    this.head = doc.createElementNS(NS, 'polygon') as SVGPolygonElement;
    this.head.setAttribute('class', 'fui-targetarrow__head');
    this.origin = doc.createElementNS(NS, 'circle') as SVGCircleElement;
    this.origin.setAttribute('class', 'fui-targetarrow__origin');
    this.origin.setAttribute('r', '9');

    this.svg.appendChild(this.path);
    this.svg.appendChild(this.origin);
    this.svg.appendChild(this.head);
    root.appendChild(this.svg);

    if (opts.from && opts.to) this.draw(opts.from, opts.to);
  }

  /**
   * Point the arrow. Give it the origin, the element it is drawn inside and the
   * pointer event; it converts the coordinates against the container's own rect,
   * so it stays correct inside a transformed board.
   */
  aim(from: { x: number; y: number }, container: Element, ev: { clientX: number; clientY: number }): this {
    const box = container.getBoundingClientRect();
    return this.draw(from, { x: ev.clientX - box.left, y: ev.clientY - box.top });
  }

  /** Point the arrow at explicit coordinates. */
  draw(from: { x: number; y: number }, to: { x: number; y: number }): this {
    this.opts.from = from;
    this.opts.to = to;
    this.el.dataset.shown = 'on';

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;

    // The control point is pushed perpendicular to the line by a fraction of its
    // own length, so a short drag bows gently and a cross-board one arcs hard
    // with no hand-tuning. A straight line reads as a UI affordance; a bowed one
    // reads as an intent.
    const bow = Math.min(len * 0.28, 140);
    const cx = (from.x + to.x) / 2 + (-dy / len) * bow;
    const cy = (from.y + to.y) / 2 + (dx / len) * bow;

    this.path.setAttribute('d', `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`);
    this.origin.setAttribute('cx', String(from.x));
    this.origin.setAttribute('cy', String(from.y));

    // The head points along the tangent at the end of the curve, which is the
    // direction from the control point — not from the origin.
    const tx = to.x - cx;
    const ty = to.y - cy;
    const tl = Math.hypot(tx, ty) || 1;
    const ux = tx / tl;
    const uy = ty / tl;
    const size = this.opts.locked ? 26 : 20;
    const tip = { x: to.x + ux * size * 0.4, y: to.y + uy * size * 0.4 };
    const left = { x: to.x - ux * size * 0.6 - uy * size * 0.5, y: to.y - uy * size * 0.6 + ux * size * 0.5 };
    const right = { x: to.x - ux * size * 0.6 + uy * size * 0.5, y: to.y - uy * size * 0.6 - ux * size * 0.5 };
    this.head.setAttribute(
      'points',
      `${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`,
    );
    return this;
  }

  /** Mark the arrow as locked onto a legal target. */
  setLocked(locked: boolean): this {
    this.opts.locked = locked;
    this.el.dataset.locked = locked ? 'on' : 'off';
    if (this.opts.from && this.opts.to) this.draw(this.opts.from, this.opts.to);
    return this;
  }

  /** Change what is being aimed. */
  setKind(kind: NonNullable<TargetArrowOptions['kind']>): this {
    this.opts.kind = kind;
    this.el.dataset.kind = kind;
    return this;
  }

  /** Take the arrow away. */
  hide(): this {
    this.el.dataset.shown = 'off';
    return this;
  }
}
