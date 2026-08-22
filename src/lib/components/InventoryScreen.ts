import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear, commas } from '../core/dom.ts';

export interface BagItem {
  id: string;
  name: string;
  /** Manifest asset id for the item art. */
  art?: string;
  rarity?: Rarity;
  /** Stack size. */
  qty?: number;
  /** Category, matched against the filter tabs. */
  type?: string;
  /** Item level or power. */
  power?: number;
  /** Flavour or effect text for the detail pane. */
  description?: string;
  /** Stat lines for the detail pane. */
  stats?: Record<string, string | number>;
  /** Equipped items are marked and cannot be sold. */
  equipped?: boolean;
  /** Marked as junk for a bulk sell. */
  junk?: boolean;
  /** Sale value. */
  value?: number;
}

export interface InventoryScreenOptions extends BaseOptions {
  /** Everything in the bag. */
  items: BagItem[];
  /** Filter tabs. The first is treated as "everything". */
  tabs?: string[];
  /** Tab shown first. */
  tab?: string;
  /** Total bag slots, used for the capacity readout. */
  slots?: number;
  /** Gold on hand. */
  gold?: number;
  /** Glyph asset id for the gold coin. */
  goldArt?: string;
  /** Heading. */
  title?: string;
  /** Actions offered on the selected item. */
  actions?: { id: string; label: string; tone?: 'primary' | 'danger' | 'plain' }[];
  /** Id of the item shown in the detail pane. */
  selected?: string;
}

/**
 * The bag screen: filter tabs, a slot grid, a detail pane, and the bulk actions
 * that stop a full bag becoming a chore.
 *
 *   const bag = new InventoryScreen({
 *     title: 'Backpack', items, tabs: ['All', 'Weapons', 'Armour', 'Consumables'],
 *     slots: 60, gold: 12_480, goldArt: 'glyph-trophy-cup',
 *     actions: [{ id: 'equip', label: 'Equip', tone: 'primary' }, { id: 'sell', label: 'Sell', tone: 'danger' }],
 *   });
 *   bag.on<{ action: string; item: BagItem }>('bag:action', ({ action, item }) => player.use(action, item));
 *   bag.on<BagItem[]>('bag:sell-junk', (items) => shop.sellAll(items));
 *
 * Capacity is printed as "48 / 60" beside the tabs and turns red before the bag
 * is actually full, because the moment worth warning about is the one where the
 * next drop is at risk — not the one after it has already been lost. Marking
 * junk is a per-item toggle that feeds one bulk sell, so the common case of
 * clearing twenty grey items is one confirmation instead of twenty.
 */
export class InventoryScreen extends FuiComponent<InventoryScreenOptions> {
  private grid: HTMLElement;
  private detail: HTMLElement;
  private tabRow: HTMLElement | null = null;
  private capEl: HTMLElement | null = null;
  private junkBtn: HTMLButtonElement;

  constructor(opts: InventoryScreenOptions) {
    const root = h('div', { class: 'fui fui-bagscreen' });
    super(root, opts);
    this.opts.tab = opts.tab ?? opts.tabs?.[0];
    this.opts.selected = opts.selected ?? opts.items[0]?.id;

    const head = h('div', { class: 'fui-bagscreen__head' });
    head.appendChild(h('h2', { class: 'fui-bagscreen__title', text: opts.title ?? 'Backpack' }));
    if (opts.slots != null) {
      this.capEl = h('span', { class: 'fui-bagscreen__cap fui-num' });
      head.appendChild(this.capEl);
    }
    if (opts.gold != null) {
      const purse = h('span', { class: 'fui-bagscreen__purse' });
      if (opts.goldArt) {
        purse.appendChild(
          h('span', {
            class: 'fui-bagscreen__coin',
            style: { '--fui-bag-coin': `var(--fui-img-${opts.goldArt})` },
          }),
        );
      }
      purse.appendChild(h('span', { class: 'fui-bagscreen__gold fui-num', text: commas(opts.gold) }));
      head.appendChild(purse);
    }
    root.appendChild(head);

    if (opts.tabs?.length) {
      this.tabRow = h('div', { class: 'fui-bagscreen__tabs', attrs: { role: 'tablist' } });
      for (const name of opts.tabs) {
        const tab = h('button', {
          class: 'fui-bagscreen__tab',
          dataset: { tab: name },
          attrs: { type: 'button', role: 'tab' },
          text: name,
        });
        tab.addEventListener('click', () => this.setTab(name));
        this.tabRow.appendChild(tab);
      }
      root.appendChild(this.tabRow);
    }

    const cols = h('div', { class: 'fui-bagscreen__cols' });
    this.grid = h('div', { class: 'fui-bagscreen__grid' });
    this.detail = h('div', { class: 'fui-bagscreen__detail' });
    cols.append(this.grid, this.detail);
    root.appendChild(cols);

    const foot = h('div', { class: 'fui-bagscreen__foot' });
    this.junkBtn = h('button', {
      class: 'fui-bagscreen__junk',
      attrs: { type: 'button' },
      text: 'Sell junk',
    });
    this.junkBtn.addEventListener('click', () => this.sellJunk());
    foot.appendChild(this.junkBtn);
    root.appendChild(foot);

    this.build();
  }

  /** Change the filter tab. */
  setTab(tab: string): this {
    this.opts.tab = tab;
    this.build();
    this.emit('bag:tab', tab);
    return this;
  }

  /** Show an item in the detail pane. */
  select(id: string): this {
    this.opts.selected = id;
    this.build();
    this.emit('bag:select', this.opts.items.find((i) => i.id === id));
    return this;
  }

  /** Flip an item's junk flag. */
  toggleJunk(id: string): this {
    const item = this.opts.items.find((i) => i.id === id);
    if (!item || item.equipped) return this;
    item.junk = !item.junk;
    this.build();
    return this;
  }

  /** Emit every junk-flagged item as one batch. */
  sellJunk(): this {
    const junk = this.opts.items.filter((i) => i.junk && !i.equipped);
    if (!junk.length) return this;
    this.opts.items = this.opts.items.filter((i) => !junk.includes(i));
    if (this.opts.gold != null) {
      this.opts.gold += junk.reduce((sum, i) => sum + (i.value ?? 0) * (i.qty ?? 1), 0);
    }
    if (!this.opts.items.some((i) => i.id === this.opts.selected)) {
      this.opts.selected = this.opts.items[0]?.id;
    }
    this.build();
    this.emit('bag:sell-junk', junk);
    return this;
  }

  private visible(): BagItem[] {
    const tab = this.opts.tab;
    const all = this.opts.tabs?.[0];
    if (!tab || tab === all) return this.opts.items;
    return this.opts.items.filter((i) => i.type === tab);
  }

  private build(): void {
    if (this.tabRow) {
      for (const tab of Array.from(this.tabRow.children) as HTMLElement[]) {
        const on = tab.dataset.tab === this.opts.tab;
        tab.dataset.state = on ? 'on' : 'off';
        tab.setAttribute('aria-selected', String(on));
      }
    }

    if (this.capEl && this.opts.slots != null) {
      const used = this.opts.items.length;
      this.capEl.textContent = `${used} / ${this.opts.slots}`;
      // Warn while there is still room to act, not once the bag is already full.
      this.capEl.dataset.level =
        used >= this.opts.slots ? 'full' : used / this.opts.slots >= 0.85 ? 'near' : 'ok';
    }

    clear(this.grid);
    for (const item of this.visible()) {
      const cell = h('button', {
        class: 'fui-bagscreen__slot',
        dataset: {
          id: item.id,
          ...(item.rarity ? { rarity: item.rarity } : {}),
          state: item.id === this.opts.selected ? 'on' : 'off',
          junk: item.junk ? 'on' : 'off',
        },
        attrs: { type: 'button', title: item.name },
      });
      cell.appendChild(
        h('span', {
          class: 'fui-bagscreen__art',
          style: item.art ? { '--fui-bag-art': `var(--fui-img-${item.art})` } : undefined,
        }),
      );
      if ((item.qty ?? 1) > 1) {
        cell.appendChild(h('span', { class: 'fui-bagscreen__qty fui-num', text: commas(item.qty ?? 1) }));
      }
      if (item.equipped) cell.appendChild(h('span', { class: 'fui-bagscreen__worn', text: 'E' }));
      cell.addEventListener('click', () => this.select(item.id));
      // Right-click marks junk — the gesture every looter already has muscle
      // memory for, with a long-press equivalent left to the host game.
      cell.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        this.toggleJunk(item.id);
      });
      this.grid.appendChild(cell);
    }
    for (let i = this.visible().length; i < Math.min(this.opts.slots ?? 0, 40); i += 1) {
      this.grid.appendChild(h('span', { class: 'fui-bagscreen__slot', dataset: { state: 'empty' } }));
    }

    this.paintDetail();

    const junk = this.opts.items.filter((i) => i.junk && !i.equipped);
    this.junkBtn.disabled = junk.length === 0;
    this.junkBtn.textContent = junk.length
      ? `Sell ${junk.length} junk · ${commas(junk.reduce((s, i) => s + (i.value ?? 0) * (i.qty ?? 1), 0))}`
      : 'Sell junk';
  }

  private paintDetail(): void {
    clear(this.detail);
    const item = this.opts.items.find((i) => i.id === this.opts.selected);
    if (!item) {
      this.detail.appendChild(h('p', { class: 'fui-bagscreen__empty', text: 'Nothing selected.' }));
      return;
    }

    this.detail.dataset.rarity = item.rarity ?? 'common';
    this.detail.appendChild(
      h('span', {
        class: 'fui-bagscreen__hero',
        style: item.art ? { '--fui-bag-art': `var(--fui-img-${item.art})` } : undefined,
      }),
    );
    this.detail.appendChild(h('h3', { class: 'fui-bagscreen__itemname', text: item.name }));
    const sub = [item.type, item.power != null ? `Power ${commas(item.power)}` : null]
      .filter(Boolean)
      .join(' · ');
    if (sub) this.detail.appendChild(h('span', { class: 'fui-bagscreen__sub', text: sub }));

    if (item.stats) {
      const stats = h('dl', { class: 'fui-bagscreen__stats' });
      for (const [key, value] of Object.entries(item.stats)) {
        stats.appendChild(h('dt', { class: 'fui-bagscreen__statkey', text: key }));
        stats.appendChild(h('dd', { class: 'fui-bagscreen__statval fui-num', text: String(value) }));
      }
      this.detail.appendChild(stats);
    }

    if (item.description) {
      this.detail.appendChild(h('p', { class: 'fui-bagscreen__desc', text: item.description }));
    }

    const actions = h('div', { class: 'fui-bagscreen__actions' });
    for (const action of this.opts.actions ?? []) {
      const btn = h('button', {
        class: 'fui-bagscreen__act',
        dataset: { tone: action.tone ?? 'plain' },
        attrs: { type: 'button', disabled: action.id === 'sell' && !!item.equipped },
        text: action.label,
      });
      btn.addEventListener('click', () => this.emit('bag:action', { action: action.id, item }));
      actions.appendChild(btn);
    }
    const mark = h('button', {
      class: 'fui-bagscreen__act',
      dataset: { tone: 'plain', junk: item.junk ? 'on' : 'off' },
      attrs: { type: 'button', disabled: !!item.equipped },
      text: item.junk ? 'Unmark junk' : 'Mark junk',
    });
    mark.addEventListener('click', () => this.toggleJunk(item.id));
    actions.appendChild(mark);
    this.detail.appendChild(actions);
  }
}
