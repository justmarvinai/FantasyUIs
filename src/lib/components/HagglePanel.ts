import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear, clamp, commas } from '../core/dom.ts';

export interface HagglePanelOptions extends BaseOptions {
  /** What is being haggled over. */
  item: { name: string; art?: string; rarity?: Rarity; note?: string };
  /** What the merchant is asking. */
  asking: number;
  /** The lowest they will go. Never shown — it decides whether an offer lands. */
  floor: number;
  /** What the player can spend. */
  purse?: number;
  /** Who you are dealing with. */
  merchant?: { name: string; art?: string };
  /** How patient they are. Each rejected offer spends one. */
  patience?: number;
  /** Mood, 0–1. Insults drop it, fair offers lift it. */
  mood?: number;
  /** Currency glyph asset id. */
  glyph?: string;
  /** Currency name. */
  currency?: string;
  /** Label on the offer button. */
  action?: string;
}

/**
 * The haggle: an offer, a merchant's mood, and a patience that runs out. What
 * `ShopPanel` does at a fixed price, this does as a negotiation.
 *
 *   const deal = new HagglePanel({
 *     item: { name: 'Runeblade', art: 'weapon-runeblade', rarity: 'epic' },
 *     merchant: { name: 'Old Sabra', art: 'hero-lone-wanderer' },
 *     asking: 240_000, floor: 168_000, purse: 300_000, patience: 3, mood: 0.6,
 *     glyph: 'icon-coins', currency: 'gold',
 *   });
 *   deal.on<number>('haggle:deal', (price) => bag.buy(price));
 *   deal.on('haggle:walk', () => shop.close());
 *
 * The floor is never drawn — a haggle where the player can see the answer is
 * not a haggle. What they get instead is the merchant's *mood*, which moves
 * with how close the last offer was, and that is the honest signal: it tells
 * them whether to push without telling them where to stop. Patience is spent by
 * rejection, not by time, so thinking costs nothing and lowballing costs the
 * deal.
 */
export class HagglePanel extends FuiComponent<HagglePanelOptions> {
  private slider: HTMLInputElement;
  private offerEl: HTMLElement;
  private moodEl: HTMLElement;
  private replyEl: HTMLElement;
  private pipsEl: HTMLElement;
  private offer: number;
  private left: number;
  private mood: number;
  private closed = false;

  constructor(opts: HagglePanelOptions) {
    const root = h('div', { class: 'fui fui-haggle' });
    super(root, opts);
    this.offer = opts.asking;
    this.left = opts.patience ?? 3;
    this.mood = clamp(opts.mood ?? 0.5, 0, 1);

    const head = h('div', { class: 'fui-haggle__head' });
    const art = h('span', {
      class: 'fui-haggle__art',
      dataset: { rarity: opts.item.rarity ?? 'common' },
    });
    if (opts.item.art) art.style.backgroundImage = `var(--fui-img-${opts.item.art})`;
    head.appendChild(art);

    const names = h('div', { class: 'fui-haggle__names' });
    names.appendChild(h('span', { class: 'fui-haggle__item fui-title', text: opts.item.name }));
    if (opts.item.note) {
      names.appendChild(h('span', { class: 'fui-haggle__note', text: opts.item.note }));
    }
    names.appendChild(
      h('span', {
        class: 'fui-haggle__asking fui-num',
        text: `Asking ${commas(opts.asking)}${opts.currency ? ` ${opts.currency}` : ''}`,
      }),
    );
    head.appendChild(names);
    root.appendChild(head);

    const merchant = h('div', { class: 'fui-haggle__merchant' });
    const face = h('span', { class: 'fui-haggle__face' });
    if (opts.merchant?.art) face.style.backgroundImage = `var(--fui-img-${opts.merchant.art})`;
    merchant.appendChild(face);

    const mood = h('div', { class: 'fui-haggle__mood-wrap' });
    mood.appendChild(
      h('span', { class: 'fui-haggle__merchant-name', text: opts.merchant?.name ?? 'The merchant' }),
    );
    this.moodEl = h('span', { class: 'fui-haggle__mood' });
    this.moodEl.appendChild(h('span', { class: 'fui-haggle__mood-fill' }));
    mood.appendChild(this.moodEl);
    this.pipsEl = h('span', { class: 'fui-haggle__pips' });
    mood.appendChild(this.pipsEl);
    merchant.appendChild(mood);
    root.appendChild(merchant);

    this.replyEl = h('p', { class: 'fui-haggle__reply' });
    root.appendChild(this.replyEl);

    const offerRow = h('div', { class: 'fui-haggle__offer' });
    offerRow.appendChild(h('span', { class: 'fui-haggle__offer-label fui-label', text: 'Your offer' }));
    this.offerEl = h('span', { class: 'fui-haggle__offer-value fui-num' });
    offerRow.appendChild(this.offerEl);
    root.appendChild(offerRow);

    // A real range input, so keyboard and screen readers work for free.
    const top = Math.max(opts.asking, opts.purse ?? opts.asking);
    this.slider = h('input', {
      class: 'fui-haggle__slider',
      attrs: {
        type: 'range',
        min: String(Math.round(opts.asking * 0.3)),
        max: String(Math.round(top)),
        step: String(Math.max(1, Math.round(opts.asking / 200))),
        value: String(opts.asking),
        'aria-label': 'Your offer',
      },
    });
    this.slider.addEventListener('input', () => this.setOffer(Number(this.slider.value)));
    root.appendChild(this.slider);

    const actions = h('div', { class: 'fui-haggle__actions' });
    const walk = h('button', { class: 'fui-haggle__walk', text: 'Walk away', attrs: { type: 'button' } });
    walk.addEventListener('click', () => {
      this.closed = true;
      this.paint();
      this.emit('haggle:walk');
    });
    const push = h('button', {
      class: 'fui-haggle__push',
      text: opts.action ?? 'Offer',
      attrs: { type: 'button' },
    });
    push.addEventListener('click', () => this.propose());
    actions.append(walk, push);
    root.appendChild(actions);

    this.paint();
  }

  /** The offer on the table. */
  current(): number {
    return this.offer;
  }

  /** Offers left before the merchant walks. */
  patienceLeft(): number {
    return this.left;
  }

  /** How the merchant feels, 0–1. */
  moodLevel(): number {
    return this.mood;
  }

  /** Move the offer without proposing it. */
  setOffer(amount: number): this {
    this.offer = Math.round(clamp(amount, 0, Math.max(this.opts.asking, this.opts.purse ?? 0)));
    this.paint();
    return this;
  }

  /** Put the offer to the merchant. */
  propose(): this {
    if (this.closed) return this;
    const { floor, asking, purse } = this.opts;
    if (purse != null && this.offer > purse) {
      this.replyEl.textContent = 'You do not have that much on you.';
      this.el.dataset.state = 'poor';
      return this;
    }

    if (this.offer >= floor) {
      this.closed = true;
      this.el.dataset.state = 'deal';
      this.mood = clamp(this.mood + 0.2, 0, 1);
      this.replyEl.textContent =
        this.offer >= asking ? 'Done — and a pleasure.' : 'Hard bargain. Take it before I think again.';
      this.paint();
      this.emit('haggle:deal', this.offer);
      return this;
    }

    // How far off the offer is decides how much patience and mood it costs, so
    // a near miss is cheap and an insult is not.
    const gap = (floor - this.offer) / Math.max(1, floor);
    this.left -= 1;
    this.mood = clamp(this.mood - clamp(gap * 1.6, 0.05, 0.5), 0, 1);
    this.el.dataset.state = this.left <= 0 ? 'walked' : gap > 0.25 ? 'insulted' : 'close';
    this.replyEl.textContent =
      this.left <= 0
        ? 'Enough. Find another fool.'
        : gap > 0.25
          ? 'You insult the work. Try again, seriously this time.'
          : 'Close. Not close enough.';
    if (this.left <= 0) this.closed = true;
    this.paint();
    this.emit(this.left <= 0 ? 'haggle:walk' : 'haggle:reject', this.offer);
    return this;
  }

  private paint(): void {
    this.offerEl.textContent = `${commas(this.offer)}${this.opts.currency ? ` ${this.opts.currency}` : ''}`;
    this.slider.value = String(this.offer);
    this.slider.disabled = this.closed;
    this.moodEl.style.setProperty('--fui-haggle-mood', this.mood.toFixed(3));
    this.el.dataset.closed = String(this.closed);

    const overPurse = this.opts.purse != null && this.offer > this.opts.purse;
    this.offerEl.dataset.poor = String(overPurse);

    clear(this.pipsEl);
    for (let i = 0; i < (this.opts.patience ?? 3); i++) {
      const pip = h('span', { class: 'fui-haggle__pip' });
      if (i < this.left) pip.classList.add('is-on');
      this.pipsEl.appendChild(pip);
    }
  }
}
