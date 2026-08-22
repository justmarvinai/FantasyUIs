import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface RunePattern {
  id: string;
  /** What tracing it casts. */
  label: string;
  /** Node indices in the order they must be joined. */
  path: number[];
  /** Colour for the trace and the result. */
  color?: string;
  /** Manifest asset id for the spell art. */
  art?: string;
  /** Not learned yet — traceable, but it fizzles. */
  locked?: boolean;
}

export interface RunePadOptions extends BaseOptions {
  /** Nodes per side. 3 gives the classic nine-dot grid. */
  grid?: number;
  /** The spells that can be traced. */
  patterns?: RunePattern[];
  /** Size in pixels. */
  size?: number;
  /** Id of a pattern to ghost on the pad as the shape to trace. */
  hint?: string;
  /** Heading over the pad. */
  label?: string;
  /** Nodes must be adjacent — no jumping across the grid. */
  strict?: boolean;
  /** Read-only: draw the hint and take no input. */
  readonly?: boolean;
}

/**
 * The gesture pad a spell is traced on — drag through the nodes in the right
 * order and something happens. Casting, lock-picking, warding, ritual puzzles.
 *
 *   const pad = new RunePad({
 *     grid: 3, size: 220, label: 'Trace the ward',
 *     patterns: [
 *       { id: 'fire', label: 'Emberlash', path: [0, 4, 8, 5, 2], color: '#e2622f' },
 *       { id: 'ward', label: 'Sanctuary', path: [1, 3, 7, 5, 1], color: '#52b96b' },
 *     ],
 *   });
 *   pad.on<{ id: string }>('rune:cast', (s) => magic.cast(s.id));
 *   pad.on('rune:fizzle', () => player.stagger());
 *
 * The trace is one pointer listener on the pad, not one per node: the pointer's
 * position is turned into a grid cell by arithmetic, which is what keeps a 3×3
 * and a 6×6 pad the same code. A completed trace is matched against every
 * pattern, so a wrong shape fizzles loudly rather than silently doing nothing —
 * the feedback a casting mechanic lives or dies on.
 */
export class RunePad extends FuiComponent<RunePadOptions> {
  private board: HTMLElement;
  private svg: SVGSVGElement;
  private line: SVGPolylineElement;
  private nodes: HTMLElement[] = [];
  private trace: number[] = [];
  private tracing = false;

  constructor(opts: RunePadOptions = {}) {
    const grid = Math.max(2, Math.round(opts.grid ?? 3));
    const root = h('div', {
      class: 'fui fui-runepad',
      style: {
        '--fui-runepad-size': `${opts.size ?? 220}px`,
        '--fui-runepad-grid': String(grid),
      },
    });
    super(root, opts);

    if (opts.label) {
      root.appendChild(h('span', { class: 'fui-runepad__label fui-label', text: opts.label }));
    }

    this.board = h('div', { class: 'fui-runepad__board' });
    const NS = 'http://www.w3.org/2000/svg';
    const doc = root.ownerDocument;
    this.svg = doc.createElementNS(NS, 'svg') as SVGSVGElement;
    this.svg.setAttribute('class', 'fui-runepad__ink');
    this.svg.setAttribute('viewBox', '0 0 100 100');
    this.svg.setAttribute('preserveAspectRatio', 'none');
    this.svg.setAttribute('aria-hidden', 'true');

    const hint = doc.createElementNS(NS, 'polyline');
    hint.setAttribute('class', 'fui-runepad__hint');
    this.svg.appendChild(hint);
    this.line = doc.createElementNS(NS, 'polyline') as SVGPolylineElement;
    this.line.setAttribute('class', 'fui-runepad__trace');
    this.svg.appendChild(this.line);
    this.board.appendChild(this.svg);

    for (let i = 0; i < grid * grid; i++) {
      const node = h('span', { class: 'fui-runepad__node', dataset: { i: String(i) } });
      node.appendChild(h('span', { class: 'fui-runepad__dot' }));
      this.nodes.push(node);
      this.board.appendChild(node);
    }
    root.appendChild(this.board);

    root.appendChild(h('p', { class: 'fui-runepad__result' }));

    if (!opts.readonly) {
      this.board.addEventListener('pointerdown', this.onDown);
      this.onDestroy(() => {
        this.board.removeEventListener('pointerdown', this.onDown);
        this.endTrace();
      });
    }
    if (opts.hint) this.showHint(opts.hint);
  }

  /** The trace so far, as node indices. */
  path(): number[] {
    return [...this.trace];
  }

  /** Draw a pattern on the pad as a guide. */
  showHint(id: string): this {
    const pattern = this.opts.patterns?.find((p) => p.id === id);
    const hint = this.svg.querySelector('.fui-runepad__hint');
    if (!hint) return this;
    hint.setAttribute('points', pattern ? this.pointsFor(pattern.path) : '');
    if (pattern?.color) (hint as SVGElement).style.setProperty('--fui-runepad-ink', pattern.color);
    return this;
  }

  /** Wipe the trace and the verdict. */
  clearTrace(): this {
    this.trace = [];
    this.line.setAttribute('points', '');
    for (const n of this.nodes) delete n.dataset.on;
    delete this.el.dataset.result;
    const out = this.el.querySelector('.fui-runepad__result');
    if (out) out.textContent = '';
    return this;
  }

  /** Which pattern a path spells, if any. */
  match(path: number[]): RunePattern | null {
    return (
      this.opts.patterns?.find(
        (p) => p.path.length === path.length && p.path.every((n, i) => n === path[i]),
      ) ?? null
    );
  }

  /** Centre of a node, in the SVG's 0–100 space. */
  private centre(index: number): { x: number; y: number } {
    const grid = Math.max(2, Math.round(this.opts.grid ?? 3));
    const step = 100 / grid;
    return {
      x: (index % grid) * step + step / 2,
      y: Math.floor(index / grid) * step + step / 2,
    };
  }

  private pointsFor(path: number[]): string {
    return path
      .map((i) => {
        const c = this.centre(i);
        return `${c.x.toFixed(2)},${c.y.toFixed(2)}`;
      })
      .join(' ');
  }

  private onDown = (ev: Event): void => {
    const pe = ev as PointerEvent;
    pe.preventDefault();
    this.clearTrace();
    this.tracing = true;
    this.board.setPointerCapture?.(pe.pointerId);
    this.board.addEventListener('pointermove', this.onMove);
    this.board.addEventListener('pointerup', this.onUp);
    this.board.addEventListener('pointercancel', this.onUp);
    this.el.dataset.tracing = 'true';
    this.visit(pe);
  };

  private onMove = (ev: Event): void => {
    if (this.tracing) this.visit(ev as PointerEvent);
  };

  private onUp = (): void => {
    if (!this.tracing) return;
    this.endTrace();
    if (this.trace.length < 2) {
      this.clearTrace();
      return;
    }
    const hit = this.match(this.trace);
    const out = this.el.querySelector('.fui-runepad__result');
    if (hit && !hit.locked) {
      this.el.dataset.result = 'cast';
      if (hit.color) this.el.style.setProperty('--fui-runepad-ink', hit.color);
      if (out) out.textContent = hit.label;
      this.emit('rune:cast', hit);
    } else {
      this.el.dataset.result = 'fizzle';
      // A wrong shape has to fail loudly. Silence is the one response a casting
      // mechanic cannot afford.
      if (out) out.textContent = hit?.locked ? `${hit.label} — not learned` : 'The rune unravels';
      this.emit('rune:fizzle', this.trace);
    }
  };

  private endTrace(): void {
    this.tracing = false;
    this.board.removeEventListener('pointermove', this.onMove);
    this.board.removeEventListener('pointerup', this.onUp);
    this.board.removeEventListener('pointercancel', this.onUp);
    delete this.el.dataset.tracing;
  }

  /** Turn a pointer position into a node, and add it to the trace. */
  private visit(pe: PointerEvent): void {
    const box = this.board.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const grid = Math.max(2, Math.round(this.opts.grid ?? 3));
    // Arithmetic rather than a listener per node: a 3×3 and a 6×6 pad are then
    // exactly the same code.
    const col = Math.floor(((pe.clientX - box.left) / box.width) * grid);
    const row = Math.floor(((pe.clientY - box.top) / box.height) * grid);
    if (col < 0 || row < 0 || col >= grid || row >= grid) return;
    const index = row * grid + col;
    if (this.trace.includes(index)) return;

    if (this.opts.strict && this.trace.length) {
      const last = this.trace[this.trace.length - 1];
      const dx = Math.abs((last % grid) - col);
      const dy = Math.abs(Math.floor(last / grid) - row);
      if (dx > 1 || dy > 1) return;
    }

    this.trace.push(index);
    this.nodes[index].dataset.on = 'true';
    this.line.setAttribute('points', this.pointsFor(this.trace));
  }
}
