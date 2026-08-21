import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface ReorderItem {
  id: string;
  label: string;
  /** Second line — the condition, the cost, the cooldown. */
  note?: string;
  /** Manifest asset id for the row's icon. */
  art?: string;
  /** Glyph asset id, used when there is no square art. */
  glyph?: string;
  /** Accent colour for this row. */
  color?: string;
  /** Pinned rows cannot be dragged or moved past. */
  locked?: boolean;
  /** Row is present but switched off. */
  off?: boolean;
}

export interface ReorderListOptions extends BaseOptions {
  /** The rows, in their current order. */
  items: ReorderItem[];
  /** Heading over the list. */
  title?: string;
  /** Number the rows, which is what a priority list wants. */
  numbered?: boolean;
  /** Show the per-row on/off switch. */
  toggles?: boolean;
  /** Show up / down buttons beside the drag handle. */
  buttons?: boolean;
  /** Cap the height in pixels (or any CSS length) and scroll inside. */
  maxHeight?: number | string;
  /** Line shown when the list is empty. */
  emptyText?: string;
}

/**
 * The priority list a player drags into the order they want — skill rotation,
 * auto-battle order, target preference, team slots.
 *
 *   const order = new ReorderList({
 *     title: 'Skill priority', numbered: true, toggles: true, buttons: true,
 *     items: [
 *       { id: 'heal', label: 'Sanctuary', note: 'when an ally is under 40%', art: 'fx-lotus-spring' },
 *       { id: 'nuke', label: 'Voidlance', note: 'on cooldown', art: 'blood-void-lance' },
 *     ],
 *   });
 *   order.on<string[]>('order:change', (ids) => save(ids));
 *
 * Dragging is not the only way to move a row. Every list also ships arrow
 * buttons and arrow-key handling, because a drag is the one interaction that
 * fails on a touch screen inside a scrolling panel — and a rotation editor that
 * only works with a mouse is no editor at all.
 */
export class ReorderList extends FuiComponent<ReorderListOptions> {
  private list: HTMLElement;
  private rows = new Map<string, HTMLElement>();
  private dragging: { id: string; from: number; startY: number; row: HTMLElement } | null = null;

  constructor(opts: ReorderListOptions) {
    const root = h('div', {
      class: 'fui fui-reorder',
      dataset: { numbered: String(!!opts.numbered) },
    });
    super(root, opts);

    if (opts.title) {
      root.appendChild(h('span', { class: 'fui-reorder__title fui-label', text: opts.title }));
    }

    this.list = h('div', {
      class: 'fui-reorder__list fui-scroll',
      attrs: { role: 'list' },
      style:
        opts.maxHeight != null
          ? { maxHeight: typeof opts.maxHeight === 'number' ? `${opts.maxHeight}px` : opts.maxHeight }
          : {},
    });
    root.appendChild(this.list);

    // Pointer capture means the drag survives the cursor leaving the row, and
    // releasing capture is the only teardown a pointer drag needs.
    this.onDestroy(() => this.endDrag());
    this.render();
  }

  /** The current order, as ids. */
  order(): string[] {
    return this.opts.items.map((i) => i.id);
  }

  /** Replace the rows wholesale. */
  setItems(items: ReorderItem[]): this {
    this.opts.items = items;
    this.render();
    return this;
  }

  /** Move a row to an index, clamped into range. */
  move(id: string, to: number, opts?: { silent?: boolean }): this {
    const items = this.opts.items;
    const from = items.findIndex((i) => i.id === id);
    if (from < 0) return this;
    // A locked row is an anchor: it neither moves nor lets anything past it.
    const lo = this.lastLockedBefore(from) + 1;
    const hi = this.firstLockedAfter(from) - 1;
    const target = Math.max(lo, Math.min(hi, Math.round(to)));
    if (items[from].locked || target === from) return this;
    const [row] = items.splice(from, 1);
    items.splice(target, 0, row);
    this.render();
    if (!opts?.silent) this.emit('order:change', this.order());
    return this;
  }

  /** Switch a row on or off without moving it. */
  setEnabled(id: string, on: boolean): this {
    const item = this.opts.items.find((i) => i.id === id);
    if (!item) return this;
    item.off = !on;
    this.render();
    this.emit('order:toggle', { id, on });
    return this;
  }

  private lastLockedBefore(index: number): number {
    for (let i = index - 1; i >= 0; i--) if (this.opts.items[i].locked) return i;
    return -1;
  }

  private firstLockedAfter(index: number): number {
    for (let i = index + 1; i < this.opts.items.length; i++) {
      if (this.opts.items[i].locked) return i;
    }
    return this.opts.items.length;
  }

  private render(): void {
    clear(this.list);
    this.rows.clear();

    if (this.opts.items.length === 0) {
      this.list.appendChild(
        h('p', {
          class: 'fui-reorder__empty',
          text: this.opts.emptyText ?? 'Nothing here yet.',
        }),
      );
      return;
    }

    this.opts.items.forEach((item, index) => {
      const row = h('div', {
        class: 'fui-reorder__row',
        dataset: { id: item.id },
        style: item.color ? { '--fui-reorder-ink': item.color } : {},
        attrs: { role: 'listitem', tabindex: 0 },
      });
      if (item.locked) row.classList.add('is-locked');
      if (item.off) row.classList.add('is-off');

      const handle = h('span', {
        class: 'fui-reorder__handle',
        attrs: { 'aria-hidden': 'true', title: item.locked ? 'Pinned' : 'Drag to reorder' },
      });
      if (!item.locked) handle.addEventListener('pointerdown', (ev) => this.startDrag(ev, item.id, row));
      row.appendChild(handle);

      if (this.opts.numbered) {
        row.appendChild(h('span', { class: 'fui-reorder__index fui-num', text: String(index + 1) }));
      }

      if (item.art) {
        row.appendChild(
          h('span', {
            class: 'fui-reorder__art',
            style: { backgroundImage: `var(--fui-img-${item.art})` },
          }),
        );
      } else if (item.glyph) {
        row.appendChild(
          h('span', {
            class: 'fui-reorder__glyph',
            style: { '--fui-glyph-src': `var(--fui-img-${item.glyph})` },
          }),
        );
      }

      const text = h('div', { class: 'fui-reorder__text' });
      text.appendChild(h('span', { class: 'fui-reorder__label', text: item.label }));
      if (item.note) text.appendChild(h('span', { class: 'fui-reorder__note', text: item.note }));
      row.appendChild(text);

      if (this.opts.toggles) {
        const toggle = h('button', {
          class: 'fui-reorder__toggle',
          attrs: {
            type: 'button',
            role: 'switch',
            'aria-checked': String(!item.off),
            'aria-label': `${item.label} enabled`,
          },
        });
        toggle.addEventListener('click', () => this.setEnabled(item.id, !!item.off));
        row.appendChild(toggle);
      }

      if (this.opts.buttons) {
        const nudge = (dir: -1 | 1, label: string) => {
          const btn = h('button', {
            class: `fui-reorder__nudge fui-reorder__nudge--${dir < 0 ? 'up' : 'down'}`,
            attrs: {
              type: 'button',
              'aria-label': `Move ${item.label} ${label}`,
              disabled: item.locked || undefined,
            },
          });
          btn.addEventListener('click', () => this.move(item.id, index + dir));
          return btn;
        };
        const stack = h('div', { class: 'fui-reorder__nudges' });
        stack.append(nudge(-1, 'up'), nudge(1, 'down'));
        row.appendChild(stack);
      }

      // Arrow keys move a focused row, which is the only way this works for
      // anyone not using a mouse.
      row.addEventListener('keydown', (ev) => {
        const key = (ev as KeyboardEvent).key;
        if (key !== 'ArrowUp' && key !== 'ArrowDown') return;
        ev.preventDefault();
        this.move(item.id, index + (key === 'ArrowUp' ? -1 : 1));
        this.rows.get(item.id)?.focus();
      });

      this.rows.set(item.id, row);
      this.list.appendChild(row);
    });
  }

  private startDrag(ev: Event, id: string, row: HTMLElement): void {
    const pe = ev as PointerEvent;
    pe.preventDefault();
    const from = this.opts.items.findIndex((i) => i.id === id);
    this.dragging = { id, from, startY: pe.clientY, row };
    row.classList.add('is-dragging');
    row.setPointerCapture?.(pe.pointerId);
    row.addEventListener('pointermove', this.onMove);
    row.addEventListener('pointerup', this.onUp);
    row.addEventListener('pointercancel', this.onUp);
  }

  private onMove = (ev: Event): void => {
    if (!this.dragging) return;
    const pe = ev as PointerEvent;
    const dy = pe.clientY - this.dragging.startY;
    this.dragging.row.style.transform = `translateY(${dy}px)`;

    // Rows are uniform, so one measurement converts the drag distance into a
    // number of slots — no per-row hit testing and no layout thrash.
    const step = this.dragging.row.offsetHeight + 4;
    const moved = Math.round(dy / step);
    const target = this.dragging.from + moved;
    const current = this.opts.items.findIndex((i) => i.id === this.dragging!.id);
    if (moved !== 0 && target !== current) {
      const row = this.dragging.row;
      this.move(this.dragging.id, target, { silent: true });
      // `render()` rebuilt the list, so the node under the pointer is new.
      const fresh = this.rows.get(this.dragging.id);
      if (fresh) {
        fresh.classList.add('is-dragging');
        this.dragging.row = fresh;
        this.dragging.from = this.opts.items.findIndex((i) => i.id === this.dragging!.id);
        this.dragging.startY = pe.clientY;
        fresh.setPointerCapture?.(pe.pointerId);
        fresh.addEventListener('pointermove', this.onMove);
        fresh.addEventListener('pointerup', this.onUp);
        fresh.addEventListener('pointercancel', this.onUp);
      }
      row.style.transform = '';
    }
  };

  private onUp = (): void => {
    const id = this.dragging?.id;
    this.endDrag();
    if (id) this.emit('order:change', this.order());
  };

  private endDrag(): void {
    if (!this.dragging) return;
    const { row } = this.dragging;
    row.style.transform = '';
    row.classList.remove('is-dragging');
    row.removeEventListener('pointermove', this.onMove);
    row.removeEventListener('pointerup', this.onUp);
    row.removeEventListener('pointercancel', this.onUp);
    this.dragging = null;
  }
}
