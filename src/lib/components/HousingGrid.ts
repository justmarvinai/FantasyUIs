import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface Furnishing {
  id: string;
  label: string;
  /** Manifest asset id for the piece. */
  art?: string;
  rarity?: Rarity;
  /** Footprint in cells. Defaults to 1×1. */
  w?: number;
  d?: number;
  /** Where it stands. Unplaced pieces sit in the tray. */
  at?: [number, number];
  /** Quarter turns, 0–3. */
  turn?: number;
  /** Comfort, prestige, or whatever the game scores a room on. */
  score?: number;
  /** How many the player owns and has not placed. */
  owned?: number;
}

export interface HousingGridOptions extends BaseOptions {
  /** Room width in cells. */
  cols: number;
  /** Room depth in cells. */
  rows: number;
  /** Everything the player owns, placed or not. */
  pieces: Furnishing[];
  /** Heading over the room. */
  title?: string;
  /** Cell size in pixels. */
  cell?: number;
  /** Floor finish. */
  floor?: 'boards' | 'stone' | 'rug' | 'grass';
  /** Show the tray of unplaced pieces. */
  tray?: boolean;
  /** Score target, shown against the room's total. */
  target?: number;
  /** Read-only: a visitor's view of someone else's house. */
  readonly?: boolean;
}

/**
 * Player housing: a room on a grid, furniture with real footprints, and a tray
 * of everything not yet placed. Guild halls, ships, camps, farms.
 *
 *   const room = new HousingGrid({
 *     title: 'The Snug', cols: 8, rows: 6, cell: 44, floor: 'boards',
 *     target: 400, tray: true,
 *     pieces: [
 *       { id: 'hearth', label: 'Hearth', art: 'fire-lava-well', w: 2, d: 1, at: [1, 1], score: 120 },
 *       { id: 'chest', label: 'Chest', art: 'icon-chest', score: 40, owned: 3 },
 *     ],
 *   });
 *   room.on<Furnishing[]>('house:change', (placed) => save(placed));
 *
 * A piece knows its own footprint, so `canPlace()` checks every cell it would
 * cover rather than just the one under the cursor — the difference between a
 * grid that accepts a 2×2 table half off the edge and one that does not.
 * Rotating swaps the footprint, so a 2×1 bench turns into a 1×2 one and the
 * same collision test still holds.
 */
export class HousingGrid extends FuiComponent<HousingGridOptions> {
  private floorEl: HTMLElement;
  private trayEl: HTMLElement | null = null;
  private scoreEl: HTMLElement | null = null;
  private held: string | null = null;

  constructor(opts: HousingGridOptions) {
    const root = h('div', {
      class: 'fui fui-house',
      dataset: { floor: opts.floor ?? 'boards' },
      style: {
        '--fui-house-cell': `${opts.cell ?? 44}px`,
        '--fui-house-cols': String(opts.cols),
        '--fui-house-rows': String(opts.rows),
      },
    });
    super(root, opts);

    if (opts.title || opts.target != null) {
      const head = h('div', { class: 'fui-house__head' });
      if (opts.title) {
        head.appendChild(h('span', { class: 'fui-house__title fui-title', text: opts.title }));
      }
      if (opts.target != null) {
        this.scoreEl = h('span', { class: 'fui-house__score fui-num' });
        head.appendChild(this.scoreEl);
      }
      root.appendChild(head);
    }

    this.floorEl = h('div', { class: 'fui-house__floor' });
    root.appendChild(this.floorEl);

    if (opts.tray ?? true) {
      const tray = h('div', { class: 'fui-house__tray' });
      tray.appendChild(h('span', { class: 'fui-house__tray-label fui-label', text: 'Storage' }));
      this.trayEl = h('div', { class: 'fui-house__tray-slots' });
      tray.appendChild(this.trayEl);
      root.appendChild(tray);
      if (!opts.readonly) this.wireTrayDrop(this.trayEl);
    }
    this.render();
  }

  /** Everything currently standing in the room. */
  placed(): Furnishing[] {
    return this.opts.pieces.filter((p) => p.at);
  }

  /** The room's total score. */
  score(): number {
    return this.placed().reduce((n, p) => n + (p.score ?? 0), 0);
  }

  /** A piece's footprint after its rotation. */
  footprint(piece: Furnishing): { w: number; d: number } {
    const w = Math.max(1, piece.w ?? 1);
    const d = Math.max(1, piece.d ?? 1);
    // A quarter turn swaps the footprint, so the same collision test holds for
    // a bench lying either way.
    return (piece.turn ?? 0) % 2 === 1 ? { w: d, d: w } : { w, d };
  }

  /** Whether a piece fits at a spot — every cell it covers, not just one. */
  canPlace(piece: Furnishing, x: number, y: number): boolean {
    const { w, d } = this.footprint(piece);
    if (x < 0 || y < 0 || x + w > this.opts.cols || y + d > this.opts.rows) return false;
    for (const other of this.placed()) {
      if (other.id === piece.id) continue;
      const size = this.footprint(other);
      const [ox, oy] = other.at as [number, number];
      const overlaps = x < ox + size.w && x + w > ox && y < oy + size.d && y + d > oy;
      if (overlaps) return false;
    }
    return true;
  }

  /** Stand a piece at a spot, if it fits. */
  place(id: string, x: number, y: number): this {
    const piece = this.opts.pieces.find((p) => p.id === id);
    if (!piece || this.opts.readonly) return this;
    if (!this.canPlace(piece, x, y)) return this;
    piece.at = [x, y];
    this.render();
    this.emit('house:change', this.placed());
    return this;
  }

  /** Put a piece back in storage. */
  store(id: string): this {
    const piece = this.opts.pieces.find((p) => p.id === id);
    if (!piece) return this;
    delete piece.at;
    this.render();
    this.emit('house:change', this.placed());
    return this;
  }

  /** Turn a piece a quarter, keeping it where it stands if it still fits. */
  rotate(id: string): this {
    const piece = this.opts.pieces.find((p) => p.id === id);
    if (!piece || !piece.at) return this;
    const was = piece.turn ?? 0;
    piece.turn = (was + 1) % 4;
    if (!this.canPlace(piece, piece.at[0], piece.at[1])) {
      piece.turn = was;
      return this;
    }
    this.render();
    this.emit('house:change', this.placed());
    return this;
  }

  private wireTrayDrop(host: HTMLElement): void {
    host.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      host.dataset.over = 'true';
    });
    host.addEventListener('dragleave', () => delete host.dataset.over);
    host.addEventListener('drop', (ev) => {
      ev.preventDefault();
      delete host.dataset.over;
      const id = (ev as DragEvent).dataTransfer?.getData('text/plain') || this.held;
      if (id) this.store(id);
      this.held = null;
    });
  }

  private render(): void {
    clear(this.floorEl);
    if (this.trayEl) clear(this.trayEl);

    if (this.scoreEl && this.opts.target != null) {
      const score = this.score();
      this.scoreEl.textContent = `${score} / ${this.opts.target}`;
      this.scoreEl.dataset.met = String(score >= this.opts.target);
    }

    for (let y = 0; y < this.opts.rows; y++) {
      for (let x = 0; x < this.opts.cols; x++) {
        const cell = h('div', { class: 'fui-house__cell', dataset: { x: String(x), y: String(y) } });
        if (!this.opts.readonly) {
          cell.addEventListener('dragover', (ev) => {
            ev.preventDefault();
            const id = this.held;
            const piece = id ? this.opts.pieces.find((p) => p.id === id) : null;
            cell.dataset.drop = piece && this.canPlace(piece, x, y) ? 'ok' : 'no';
          });
          cell.addEventListener('dragleave', () => delete cell.dataset.drop);
          cell.addEventListener('drop', (ev) => {
            ev.preventDefault();
            delete cell.dataset.drop;
            const id = (ev as DragEvent).dataTransfer?.getData('text/plain') || this.held;
            if (id) this.place(id, x, y);
            this.held = null;
          });
        }
        this.floorEl.appendChild(cell);
      }
    }

    for (const piece of this.placed()) {
      const { w, d } = this.footprint(piece);
      const [x, y] = piece.at as [number, number];
      const el = h('div', {
        class: 'fui-house__piece',
        dataset: { id: piece.id, rarity: piece.rarity ?? 'common' },
        style: {
          gridColumn: `${x + 1} / span ${w}`,
          gridRow: `${y + 1} / span ${d}`,
        },
        attrs: {
          title: piece.label,
          draggable: this.opts.readonly ? undefined : 'true',
        },
      });
      const art = h('span', { class: 'fui-house__piece-art' });
      if (piece.art) art.style.backgroundImage = `var(--fui-img-${piece.art})`;
      el.appendChild(art);
      el.appendChild(h('span', { class: 'fui-house__piece-label', text: piece.label }));

      if (!this.opts.readonly) {
        el.addEventListener('dragstart', (ev) => {
          this.held = piece.id;
          (ev as DragEvent).dataTransfer?.setData('text/plain', piece.id);
        });
        el.addEventListener('dragend', () => (this.held = null));
        // Double-click rotates: a piece already in place needs a way to turn
        // that does not require picking it up and putting it back.
        el.addEventListener('dblclick', () => this.rotate(piece.id));
      }
      this.floorEl.appendChild(el);
    }

    if (this.trayEl) {
      for (const piece of this.opts.pieces.filter((p) => !p.at)) {
        const el = h('div', {
          class: 'fui-house__stored',
          dataset: { rarity: piece.rarity ?? 'common' },
          attrs: { title: piece.label, draggable: this.opts.readonly ? undefined : 'true' },
        });
        const art = h('span', { class: 'fui-house__stored-art' });
        if (piece.art) art.style.backgroundImage = `var(--fui-img-${piece.art})`;
        if (piece.owned != null && piece.owned > 1) {
          art.appendChild(
            h('span', { class: 'fui-house__owned fui-num', text: `×${piece.owned}` }),
          );
        }
        el.appendChild(art);
        el.appendChild(h('span', { class: 'fui-house__stored-label', text: piece.label }));
        if (!this.opts.readonly) {
          el.addEventListener('dragstart', (ev) => {
            this.held = piece.id;
            (ev as DragEvent).dataTransfer?.setData('text/plain', piece.id);
          });
          el.addEventListener('dragend', () => (this.held = null));
        }
        this.trayEl.appendChild(el);
      }
    }
  }
}

