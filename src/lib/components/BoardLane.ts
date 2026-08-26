import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';
import { Minion, type MinionOptions } from './Minion.ts';

export interface BoardLaneOptions extends BaseOptions {
  /** The minions in this lane, left to right. */
  minions: MinionOptions[];
  /** Board limit. A full lane refuses a drop and says so. */
  limit?: number;
  /** Whose lane it is. */
  side?: 'friendly' | 'enemy';
  /** Minion size in pixels. */
  size?: number;
  /** Accept drops, showing an insertion gap. */
  droppable?: boolean;
  /** Line under the lane, e.g. `'Your board'`. */
  label?: string;
}

/**
 * A row of minions in play, with the thing every board needs and few have: an
 * insertion point. Dragging a card over the lane opens a gap where it would
 * land, because on a board where position matters — adjacency buffs, splash
 * damage, the left-to-right order deathrattles resolve in — dropping into "the
 * end" is not good enough.
 *
 *   const board = new BoardLane({ minions, limit: 7, side: 'friendly', droppable: true, label: 'Your board' });
 *   board.on<{ index: number }>('lane:drop', ({ index }) => game.play(heldCard, index));
 *   board.on<string>('lane:select', (name) => combat.declare(name));
 *
 * The insertion index is computed from the pointer's position against the
 * *midpoints* of the minions already there, which is what makes the gap open on
 * the side the pointer is actually nearer — the alternative, testing element
 * bounds, flickers between two answers whenever the pointer sits on a border.
 *
 * A full lane refuses the drop rather than accepting it and failing server-side,
 * and says which limit was hit.
 */
export class BoardLane extends FuiComponent<BoardLaneOptions> {
  private row: HTMLElement;
  private countEl: HTMLElement | null = null;
  private tokens: Minion[] = [];
  private insertAt: number | null = null;

  constructor(opts: BoardLaneOptions) {
    const root = h('div', {
      class: 'fui fui-lane',
      dataset: { side: opts.side ?? 'friendly', droppable: opts.droppable ? 'on' : 'off' },
      style: { '--fui-lane-size': `${opts.size ?? 92}px` },
      attrs: { role: 'list', 'aria-label': opts.label ?? 'Board' },
    });
    super(root, opts);

    this.row = h('div', { class: 'fui-lane__row' });
    root.appendChild(this.row);

    if (opts.label || opts.limit != null) {
      const foot = h('div', { class: 'fui-lane__foot' });
      if (opts.label) foot.appendChild(h('span', { class: 'fui-lane__label', text: opts.label }));
      if (opts.limit != null) {
        this.countEl = h('span', { class: 'fui-lane__count fui-num' });
        foot.appendChild(this.countEl);
      }
      root.appendChild(foot);
    }

    if (opts.droppable) {
      root.addEventListener('pointermove', (ev) => this.trackInsert(ev as PointerEvent));
      root.addEventListener('pointerleave', () => this.clearInsert());
      root.addEventListener('pointerup', (ev) => {
        const index = this.indexAt((ev as PointerEvent).clientX);
        this.clearInsert();
        if (this.full()) {
          this.emit('lane:refused', `Board is full (${this.opts.limit})`);
          return;
        }
        this.emit('lane:drop', { index });
      });
    }

    this.build();
  }

  /** Replace the lane's contents. */
  setMinions(minions: MinionOptions[]): this {
    this.opts.minions = minions;
    this.build();
    return this;
  }

  /** Put a minion into the lane at `index`. Returns false when it is full. */
  summon(minion: MinionOptions, index = this.opts.minions.length): boolean {
    if (this.full()) return false;
    const next = [...this.opts.minions];
    next.splice(Math.max(0, Math.min(index, next.length)), 0, minion);
    this.opts.minions = next;
    this.build();
    this.emit('lane:summon', { minion, index });
    return true;
  }

  /** Take a minion off the board. */
  remove(index: number): this {
    this.opts.minions = this.opts.minions.filter((_, i) => i !== index);
    this.build();
    return this;
  }

  /** The live `Minion` components, so a caller can drive them directly. */
  get units(): Minion[] {
    return this.tokens;
  }

  /** Whether the board limit has been reached. */
  full(): boolean {
    return this.opts.limit != null && this.opts.minions.length >= this.opts.limit;
  }

  /** Where a pointer at `clientX` would insert, 0…length. */
  private indexAt(clientX: number): number {
    // Measured against each token's *midpoint* rather than its bounds: testing
    // bounds flickers between two answers whenever the pointer sits on a border.
    const mids = this.tokens.map((m) => {
      const r = m.el.getBoundingClientRect();
      return r.left + r.width / 2;
    });
    let index = mids.length;
    for (let i = 0; i < mids.length; i += 1) {
      if (clientX < mids[i]) {
        index = i;
        break;
      }
    }
    return index;
  }

  private trackInsert(ev: PointerEvent): void {
    if (this.full()) {
      this.el.dataset.full = 'on';
      return;
    }
    const index = this.indexAt(ev.clientX);
    if (index === this.insertAt) return;
    this.insertAt = index;
    this.paintInsert();
  }

  private clearInsert(): void {
    this.insertAt = null;
    this.el.dataset.full = 'off';
    this.paintInsert();
  }

  private paintInsert(): void {
    Array.from(this.row.children).forEach((child, i) => {
      const el = child as HTMLElement;
      el.dataset.gap =
        this.insertAt == null ? 'none' : i < this.insertAt ? 'left' : 'right';
    });
    this.el.dataset.inserting = this.insertAt == null ? 'off' : 'on';
  }

  private build(): void {
    clear(this.row);
    this.tokens = [];
    for (const minion of this.opts.minions) {
      const slot = h('div', { class: 'fui-lane__slot', dataset: { gap: 'none' }, attrs: { role: 'listitem' } });
      const token = new Minion({ ...minion, size: this.opts.size ?? 92, side: this.opts.side ?? 'friendly' });
      token.on('minion:attack', () => this.emit('lane:select', minion.name));
      this.tokens.push(token);
      slot.appendChild(token.el);
      this.row.appendChild(slot);
    }

    if (this.countEl && this.opts.limit != null) {
      this.countEl.textContent = `${this.opts.minions.length} / ${this.opts.limit}`;
      this.countEl.dataset.full = this.full() ? 'on' : 'off';
    }
    if (!this.opts.minions.length) {
      this.row.appendChild(h('p', { class: 'fui-lane__empty', text: 'No minions' }));
    }
  }
}
