import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface TierEntry {
  id: string;
  label?: string;
  /** Manifest asset id for the entry's art. */
  art?: string;
  rarity?: Rarity;
  /** Small note under the art — a role, a patch, a win rate. */
  note?: string;
  /** Which tier row it currently sits in. Unset entries go to the tray. */
  tier?: string;
}

export interface Tier {
  id: string;
  label: string;
  /** Row colour. Falls back to the standard S-to-D ramp. */
  color?: string;
  /** Line under the tier letter. */
  note?: string;
}

export interface TierListOptions extends BaseOptions {
  /** The rows, best first. */
  tiers: Tier[];
  /** Everything being ranked. Entries with no `tier` start in the tray. */
  entries: TierEntry[];
  /** Heading over the board. */
  title?: string;
  /** Line under the heading — the patch, the mode, who made the list. */
  subtitle?: string;
  /** Entry size in pixels. */
  size?: number;
  /** Show the unranked tray under the rows. */
  tray?: boolean;
  /** Label over the tray. */
  trayLabel?: string;
  /** Read-only: no dragging, no moving. */
  readonly?: boolean;
}

const RAMP = ['#e04a4a', '#e08a3c', '#dcc846', '#6bbf5c', '#4a8ede', '#8d6fd9'];

/**
 * The tier list: S through D, entries dragged between rows. A meta page, an
 * in-game champion ranking, a personal "who do I build next" board.
 *
 *   const list = new TierList({
 *     title: 'Clan boss tier list', subtitle: 'Patch 1.14 · Nightmare',
 *     tray: true,
 *     tiers: [{ id: 's', label: 'S' }, { id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
 *     entries: [
 *       { id: 'vex', label: 'Vexhollow', art: 'blood-necromancer', rarity: 'legendary', tier: 's' },
 *       { id: 'grix', label: 'Grixmaul', art: 'hero-vanguard', rarity: 'epic' },
 *     ],
 *   });
 *   list.on<TierEntry[]>('tier:change', (entries) => save(entries));
 *
 * Dragging works off HTML's own drag-and-drop, so an entry can be carried
 * between rows, dropped on the tray, or dropped on nothing and stay where it
 * was. Rows colour themselves from the standard S-to-D ramp by position, which
 * means a five-tier and an eight-tier board both look right with no palette.
 */
export class TierList extends FuiComponent<TierListOptions> {
  private board: HTMLElement;
  private trayEl: HTMLElement | null = null;
  private held: string | null = null;

  constructor(opts: TierListOptions) {
    const root = h('div', {
      class: 'fui fui-tiers',
      style: { '--fui-tiers-size': `${opts.size ?? 54}px` },
    });
    super(root, opts);

    if (opts.title || opts.subtitle) {
      const head = h('div', { class: 'fui-tiers__head' });
      if (opts.title) {
        head.appendChild(h('span', { class: 'fui-tiers__title fui-title', text: opts.title }));
      }
      if (opts.subtitle) {
        head.appendChild(h('span', { class: 'fui-tiers__sub', text: opts.subtitle }));
      }
      root.appendChild(head);
    }

    this.board = h('div', { class: 'fui-tiers__board' });
    root.appendChild(this.board);

    if (opts.tray ?? true) {
      const tray = h('div', { class: 'fui-tiers__tray' });
      tray.appendChild(
        h('span', { class: 'fui-tiers__tray-label fui-label', text: opts.trayLabel ?? 'Unranked' }),
      );
      this.trayEl = h('div', { class: 'fui-tiers__slots', dataset: { tier: '' } });
      tray.appendChild(this.trayEl);
      root.appendChild(tray);
      if (!opts.readonly) this.wireDrop(this.trayEl, undefined);
    }
    this.render();
  }

  /** Entries in one tier, in order. */
  tier(id: string): TierEntry[] {
    return this.opts.entries.filter((e) => e.tier === id);
  }

  /** Every entry with its current tier. */
  value(): TierEntry[] {
    return this.opts.entries;
  }

  /** Move an entry to a tier, or to the tray with `undefined`. */
  place(entryId: string, tier: string | undefined): this {
    const entry = this.opts.entries.find((e) => e.id === entryId);
    if (!entry || entry.tier === tier) return this;
    entry.tier = tier;
    this.render();
    this.emit('tier:change', this.opts.entries);
    return this;
  }

  /** Take a row's colour from the standard ramp by position. */
  private colorOf(tier: Tier, index: number): string {
    return tier.color ?? RAMP[Math.min(index, RAMP.length - 1)];
  }

  private wireDrop(host: HTMLElement, tier: string | undefined): void {
    host.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      host.dataset.over = 'true';
    });
    host.addEventListener('dragleave', () => delete host.dataset.over);
    host.addEventListener('drop', (ev) => {
      ev.preventDefault();
      delete host.dataset.over;
      // The dragged id is kept on the component as well as in the transfer,
      // because Safari will not read `dataTransfer` during `dragover`.
      const id = (ev as DragEvent).dataTransfer?.getData('text/plain') || this.held;
      if (id) this.place(id, tier);
      this.held = null;
    });
  }

  private render(): void {
    clear(this.board);
    if (this.trayEl) clear(this.trayEl);

    this.opts.tiers.forEach((tier, index) => {
      const row = h('div', {
        class: 'fui-tiers__row',
        style: { '--fui-tiers-ink': this.colorOf(tier, index) },
      });
      const badge = h('div', { class: 'fui-tiers__badge' });
      badge.appendChild(h('span', { class: 'fui-tiers__letter', text: tier.label }));
      if (tier.note) badge.appendChild(h('span', { class: 'fui-tiers__note', text: tier.note }));
      row.appendChild(badge);

      const slots = h('div', { class: 'fui-tiers__slots', dataset: { tier: tier.id } });
      for (const entry of this.tier(tier.id)) slots.appendChild(this.buildEntry(entry));
      if (!this.opts.readonly) this.wireDrop(slots, tier.id);
      row.appendChild(slots);
      this.board.appendChild(row);
    });

    if (this.trayEl) {
      for (const entry of this.opts.entries.filter((e) => !e.tier)) {
        this.trayEl.appendChild(this.buildEntry(entry));
      }
    }
  }

  private buildEntry(entry: TierEntry): HTMLElement {
    const el = h('div', {
      class: 'fui-tiers__entry',
      dataset: { id: entry.id, rarity: entry.rarity ?? 'common' },
      attrs: {
        title: entry.label ?? entry.id,
        draggable: this.opts.readonly ? undefined : 'true',
      },
    });
    const art = h('span', { class: 'fui-tiers__art' });
    if (entry.art) art.style.backgroundImage = `var(--fui-img-${entry.art})`;
    el.appendChild(art);
    if (entry.label) el.appendChild(h('span', { class: 'fui-tiers__name', text: entry.label }));
    if (entry.note) el.appendChild(h('span', { class: 'fui-tiers__meta', text: entry.note }));

    if (!this.opts.readonly) {
      el.addEventListener('dragstart', (ev) => {
        this.held = entry.id;
        (ev as DragEvent).dataTransfer?.setData('text/plain', entry.id);
        el.classList.add('is-held');
      });
      el.addEventListener('dragend', () => {
        this.held = null;
        el.classList.remove('is-held');
      });
    }
    return el;
  }
}
