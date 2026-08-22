import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear, clamp, commas } from '../core/dom.ts';

export interface WishTarget {
  id: string;
  name: string;
  /** Manifest asset id for the portrait. */
  art?: string;
  rarity?: Rarity;
  /** Base pull rate, 0–1. Printed as a percentage. */
  chance?: number;
  /** Already owned — still listed, drawn as a duplicate. */
  owned?: boolean;
  /** One line of flavour or a role tag. */
  note?: string;
}

export interface WishListOptions extends BaseOptions {
  /** Everything on the banner the player can aim at. */
  targets: WishTarget[];
  /** Id of the chosen target. */
  selected?: string;
  /** Pulls done since the last top-rarity result. */
  pity?: number;
  /** Pull count where the rate starts climbing. */
  softPity?: number;
  /** Pull count where the top rarity is certain. */
  hardPity?: number;
  /** The next top-rarity result is guaranteed to be the chosen target. */
  guaranteed?: boolean;
  /** Currency name, e.g. `'Astral Shards'`. */
  currency?: string;
  /** Glyph asset id for the currency. */
  currencyArt?: string;
  /** How much of it the player holds. */
  balance?: number;
  /** Cost of a single wish. */
  cost?: number;
  /** Heading. */
  title?: string;
}

/**
 * The wish-targeting panel of a gacha banner: pick what the pity is being saved
 * for, see how close it is, and pull without leaving the screen.
 *
 *   const wishes = new WishList({
 *     title: 'Path of the Ember', targets: heroes, selected: 'pyre-knight',
 *     pity: 61, softPity: 74, hardPity: 90, guaranteed: true,
 *     currency: 'Astral Shards', currencyArt: 'glyph-celestial-body', balance: 3200, cost: 160,
 *   });
 *   wishes.on<{ id: string; count: number }>('wish:pull', ({ id, count }) => banner.pull(id, count));
 *
 * Pity is drawn as one bar with the soft-pity threshold marked on it rather than
 * as a bare "61/90", because the number players actually plan around is *how
 * many more* — and the interesting point is where the rate jumps, not the
 * ceiling. Affordability is checked against the balance before the pull button
 * is enabled, so the panel never offers a wish the player cannot pay for.
 */
export class WishList extends FuiComponent<WishListOptions> {
  private list: HTMLElement;
  private bar: HTMLElement;
  private pityText: HTMLElement;
  private buttons: HTMLButtonElement[] = [];
  private balanceEl: HTMLElement | null = null;

  constructor(opts: WishListOptions) {
    const root = h('div', { class: 'fui fui-wishlist' });
    super(root, opts);
    this.opts.selected = opts.selected ?? opts.targets[0]?.id;

    const head = h('div', { class: 'fui-wishlist__head' });
    head.appendChild(h('h3', { class: 'fui-wishlist__title', text: opts.title ?? 'Wish' }));
    if (opts.balance != null) {
      const purse = h('span', { class: 'fui-wishlist__purse' });
      if (opts.currencyArt) {
        purse.appendChild(
          h('span', {
            class: 'fui-wishlist__coin',
            style: { '--fui-wish-coin': `var(--fui-img-${opts.currencyArt})` },
          }),
        );
      }
      this.balanceEl = h('span', { class: 'fui-wishlist__balance fui-num', text: commas(opts.balance) });
      purse.appendChild(this.balanceEl);
      head.appendChild(purse);
    }
    root.appendChild(head);

    // ── Pity ──
    const pity = h('div', { class: 'fui-wishlist__pity' });
    this.bar = h('div', { class: 'fui-wishlist__bar' });
    this.bar.appendChild(h('span', { class: 'fui-wishlist__fill' }));
    this.bar.appendChild(h('span', { class: 'fui-wishlist__soft' }));
    pity.appendChild(this.bar);
    this.pityText = h('p', { class: 'fui-wishlist__pitytext' });
    pity.appendChild(this.pityText);
    root.appendChild(pity);

    // ── Targets ──
    this.list = h('div', { class: 'fui-wishlist__list' });
    root.appendChild(this.list);

    // ── Pull ──
    const actions = h('div', { class: 'fui-wishlist__actions' });
    for (const count of [1, 10]) {
      const btn = h('button', {
        class: 'fui-wishlist__pull',
        dataset: { count: String(count) },
        attrs: { type: 'button' },
      });
      btn.appendChild(h('span', { class: 'fui-wishlist__pulllabel', text: `Wish ×${count}` }));
      if (opts.cost != null) {
        btn.appendChild(
          h('span', { class: 'fui-wishlist__price fui-num', text: commas(opts.cost * count) }),
        );
      }
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        this.emit('wish:pull', { id: this.opts.selected, count });
      });
      this.buttons.push(btn);
      actions.appendChild(btn);
    }
    root.appendChild(actions);

    this.build();
    this.paint();
  }

  /** Aim the pity at a different target. */
  select(id: string): this {
    if (!this.opts.targets.some((t) => t.id === id)) return this;
    this.opts.selected = id;
    this.paint();
    this.emit('wish:target', id);
    return this;
  }

  /** Update the pity counter and the guarantee. */
  setPity(pity: number, guaranteed = this.opts.guaranteed): this {
    this.opts.pity = Math.max(0, pity);
    this.opts.guaranteed = guaranteed;
    this.paint();
    return this;
  }

  /** Update the purse. Buttons the player can no longer afford grey out. */
  setBalance(balance: number): this {
    this.opts.balance = balance;
    if (this.balanceEl) this.balanceEl.textContent = commas(balance);
    this.paint();
    return this;
  }

  private build(): void {
    clear(this.list);
    for (const target of this.opts.targets) {
      const row = h('button', {
        class: 'fui-wishlist__target',
        dataset: {
          ...(target.rarity ? { rarity: target.rarity } : {}),
          owned: target.owned ? 'on' : 'off',
        },
        attrs: { type: 'button' },
      });
      row.appendChild(
        h('span', {
          class: 'fui-wishlist__art',
          style: target.art ? { '--fui-wish-art': `var(--fui-img-${target.art})` } : undefined,
        }),
      );
      const body = h('span', { class: 'fui-wishlist__body' });
      body.appendChild(h('span', { class: 'fui-wishlist__name', text: target.name }));
      if (target.note) body.appendChild(h('span', { class: 'fui-wishlist__note', text: target.note }));
      row.appendChild(body);
      if (target.chance != null) {
        row.appendChild(
          h('span', {
            class: 'fui-wishlist__rate fui-num',
            text: `${(target.chance * 100).toFixed(target.chance < 0.01 ? 2 : 1)}%`,
          }),
        );
      }
      row.appendChild(h('span', { class: 'fui-wishlist__tick' }));
      row.addEventListener('click', () => this.select(target.id));
      row.dataset.id = target.id;
      this.list.appendChild(row);
    }
  }

  private paint(): void {
    for (const row of Array.from(this.list.children) as HTMLElement[]) {
      const on = row.dataset.id === this.opts.selected;
      row.dataset.state = on ? 'chosen' : 'off';
      row.setAttribute('aria-pressed', String(on));
    }

    const pity = this.opts.pity ?? 0;
    const hard = this.opts.hardPity ?? 90;
    const soft = this.opts.softPity ?? Math.round(hard * 0.82);
    this.el.style.setProperty('--fui-wish-pity', String(clamp(pity / hard, 0, 1)));
    this.el.style.setProperty('--fui-wish-soft', String(clamp(soft / hard, 0, 1)));
    this.el.dataset.phase = pity >= soft ? 'soft' : 'early';

    const left = Math.max(0, hard - pity);
    const toSoft = Math.max(0, soft - pity);
    const chosen = this.opts.targets.find((t) => t.id === this.opts.selected);
    this.pityText.textContent = this.opts.guaranteed
      ? `Guaranteed — the next ★ is ${chosen?.name ?? 'your pick'}. ${left} wishes at most.`
      : toSoft > 0
        ? `${toSoft} wishes until the rate climbs · ${left} until guaranteed`
        : `Rate is climbing — ${left} wishes until guaranteed`;

    const cost = this.opts.cost;
    const balance = this.opts.balance;
    for (const btn of this.buttons) {
      const count = Number(btn.dataset.count);
      btn.disabled = cost != null && balance != null && cost * count > balance;
    }
  }
}
