import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, commas } from '../core/dom.ts';

export interface CraftPanelOptions extends BaseOptions {
  /** Card name. */
  name: string;
  /** Rarity — sets the gem colour and the dust prices. */
  rarity?: Rarity;
  /** Manifest asset id for the art. */
  art?: string;
  /** Copies owned. */
  owned?: number;
  /** Copies allowed — 1 for a legendary, 2 otherwise. */
  limit?: number;
  /** Dust to craft one. */
  craftCost?: number;
  /** Dust returned for disenchanting one. */
  dustValue?: number;
  /** Dust on hand. */
  dust?: number;
  /** Golden crafting is a separate, dearer track. */
  golden?: boolean;
  /** Golden craft cost. */
  goldenCost?: number;
  /** Golden copies owned. */
  goldenOwned?: number;
}

/**
 * Craft and disenchant. Two buttons that move a card between your collection
 * and a pile of dust, with the arithmetic spelled out on both.
 *
 *   const craft = new CraftPanel({
 *     name: 'Vexhollow the Unmade', rarity: 'legendary', art: 'blood-necromancer',
 *     owned: 0, limit: 1, craftCost: 1600, dustValue: 400, dust: 2400,
 *   });
 *   craft.on<number>('craft:make', (cost) => collection.craft(card, cost));
 *   craft.on<number>('craft:melt', (value) => collection.disenchant(card));
 *
 * Disenchanting is the destructive half and the one games make too easy, so it
 * refuses while the card is in a deck and prints how much dust it returns —
 * which is always less than it cost, and worth saying out loud. Crafting refuses
 * at the copy limit rather than letting a player buy a third copy they can never
 * run, and refuses when the dust is short with the shortfall named.
 *
 * The two prices sit on their own buttons rather than in a shared readout,
 * because they are different numbers pointing in opposite directions and a
 * single "value" line is how players end up dusting a card they meant to make.
 */
export class CraftPanel extends FuiComponent<CraftPanelOptions> {
  private makeBtn: HTMLButtonElement;
  private meltBtn: HTMLButtonElement;
  private ownedEl: HTMLElement;
  private dustEl: HTMLElement;
  private noteEl: HTMLElement;

  constructor(opts: CraftPanelOptions) {
    const root = h('div', {
      class: 'fui fui-craft',
      dataset: { rarity: opts.rarity ?? 'common' },
      style: opts.art ? { '--fui-craft-art': `var(--fui-img-${opts.art})` } : undefined,
    });
    super(root, opts);

    const head = h('div', { class: 'fui-craft__head' });
    head.appendChild(h('span', { class: 'fui-craft__art', attrs: { 'aria-hidden': 'true' } }));
    const names = h('div', { class: 'fui-craft__names' });
    names.appendChild(h('span', { class: 'fui-craft__name', text: opts.name }));
    this.ownedEl = h('span', { class: 'fui-craft__owned fui-num' });
    names.appendChild(this.ownedEl);
    head.appendChild(names);
    root.appendChild(head);

    const purse = h('div', { class: 'fui-craft__purse' });
    purse.appendChild(h('span', { class: 'fui-craft__dustmark', attrs: { 'aria-hidden': 'true' }, text: '✦' }));
    this.dustEl = h('span', { class: 'fui-craft__dust fui-num' });
    purse.appendChild(this.dustEl);
    root.appendChild(purse);

    const actions = h('div', { class: 'fui-craft__actions' });
    this.makeBtn = h('button', { class: 'fui-craft__btn', dataset: { act: 'make' }, attrs: { type: 'button' } });
    this.makeBtn.addEventListener('click', () => this.make());
    this.meltBtn = h('button', { class: 'fui-craft__btn', dataset: { act: 'melt' }, attrs: { type: 'button' } });
    this.meltBtn.addEventListener('click', () => this.melt());
    actions.append(this.makeBtn, this.meltBtn);
    root.appendChild(actions);

    this.noteEl = h('p', { class: 'fui-craft__note' });
    root.appendChild(this.noteEl);

    this.paint();
  }

  /** Craft a copy. Refuses at the limit or when the dust is short. */
  make(): boolean {
    const reason = this.whyNotMake();
    if (reason) {
      this.refuse(reason);
      return false;
    }
    const cost = this.opts.craftCost ?? 0;
    this.opts.owned = (this.opts.owned ?? 0) + 1;
    if (this.opts.dust != null) this.opts.dust -= cost;
    this.paint();
    this.emit('craft:make', cost);
    return true;
  }

  /** Disenchant a copy. Refuses when there is none spare. */
  melt(): boolean {
    const reason = this.whyNotMelt();
    if (reason) {
      this.refuse(reason);
      return false;
    }
    const value = this.opts.dustValue ?? 0;
    this.opts.owned = (this.opts.owned ?? 0) - 1;
    if (this.opts.dust != null) this.opts.dust += value;
    this.paint();
    this.emit('craft:melt', value);
    return true;
  }

  /** Update dust on hand. */
  setDust(dust: number): this {
    this.opts.dust = dust;
    this.paint();
    return this;
  }

  /** Why crafting is refused right now, or `null` if it would go through. */
  whyNotMake(): string | null {
    const limit = this.opts.limit ?? 2;
    if ((this.opts.owned ?? 0) >= limit) {
      return limit === 1 ? 'You already own this legendary' : `You already own ${limit} copies`;
    }
    const cost = this.opts.craftCost ?? 0;
    if (this.opts.dust != null && this.opts.dust < cost) {
      return `${commas(cost - this.opts.dust)} more dust needed`;
    }
    return null;
  }

  /** Why disenchanting is refused right now, or `null` if it would go through. */
  whyNotMelt(): string | null {
    if ((this.opts.owned ?? 0) <= 0) return 'You do not own this card';
    return null;
  }

  private refuse(reason: string): void {
    this.noteEl.textContent = reason;
    this.noteEl.dataset.tone = 'bad';
    this.el.dataset.refused = 'on';
    void this.el.offsetWidth;
    this.el.dataset.refused = 'off';
    this.emit('craft:refused', reason);
  }

  private paint(): void {
    const o = this.opts;
    const limit = o.limit ?? 2;
    const owned = o.owned ?? 0;

    this.ownedEl.textContent = `${owned} / ${limit} owned`;
    this.ownedEl.dataset.state = owned >= limit ? 'full' : owned > 0 ? 'some' : 'none';
    this.dustEl.textContent = commas(o.dust ?? 0);

    const makeWhy = this.whyNotMake();
    this.makeBtn.textContent = `Craft — ${commas(o.craftCost ?? 0)} ✦`;
    this.makeBtn.dataset.state = makeWhy ? 'blocked' : 'open';
    this.makeBtn.setAttribute('title', makeWhy ?? `Craft ${o.name}`);

    const meltWhy = this.whyNotMelt();
    this.meltBtn.textContent = `Disenchant — ${commas(o.dustValue ?? 0)} ✦`;
    this.meltBtn.dataset.state = meltWhy ? 'blocked' : 'open';
    this.meltBtn.setAttribute('title', meltWhy ?? `Disenchant ${o.name}`);

    // Said out loud, because it is always less than it cost.
    const loss = (o.craftCost ?? 0) - (o.dustValue ?? 0);
    this.noteEl.textContent =
      owned > 0 && loss > 0 ? `Disenchanting loses ${commas(loss)} dust against crafting.` : '';
    this.noteEl.dataset.tone = 'plain';
    this.noteEl.dataset.empty = this.noteEl.textContent ? 'off' : 'on';
  }
}
