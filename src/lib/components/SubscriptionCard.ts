import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, commas } from '../core/dom.ts';

export interface SubscriptionPerk {
  /** What the perk gives. */
  text: string;
  /** Glyph asset id for the bullet. */
  icon?: string;
  /** Draw it as the headline perk. */
  highlight?: boolean;
}

export interface SubscriptionCardOptions extends BaseOptions {
  /** Product name, e.g. `'Adventurer's Pact'`. */
  title: string;
  /** One line under the title. */
  tagline?: string;
  /** Manifest asset id for the banner art. */
  art?: string;
  /** What it costs, already formatted — `'$4.99'`, `'480 gems'`. */
  price?: string;
  /** Struck-through original price. */
  wasPrice?: string;
  /** Corner ribbon, e.g. `'Best value'`. */
  badge?: string;
  /** Everything it includes. */
  perks: SubscriptionPerk[];
  /** Days left on an active subscription. Omit when not owned. */
  daysLeft?: number;
  /** Total days in a term, used for the remaining-time bar. */
  termDays?: number;
  /** The daily gift is still waiting. */
  claimable?: boolean;
  /** What the daily gift is, e.g. `'90 gems'`. */
  dailyReward?: string;
  /** Glyph asset id for the daily gift. */
  dailyArt?: string;
  /** How many days in a row it has been collected. */
  streak?: number;
}

/**
 * The monthly pass card: what it costs, what it includes, how long is left on
 * it, and the daily gift waiting to be tapped.
 *
 *   const pact = new SubscriptionCard({
 *     title: "Adventurer's Pact", tagline: '30 days of daily shards',
 *     art: 'banner-guild', price: '$4.99', wasPrice: '$7.99', badge: 'Best value',
 *     perks: [{ text: '300 shards now', icon: 'glyph-celestial-body', highlight: true }],
 *     daysLeft: 18, termDays: 30, claimable: true, dailyReward: '90 shards', streak: 12,
 *   });
 *   pact.on('sub:claim', () => wallet.grantDaily());
 *   pact.on('sub:buy', () => store.checkout('pact'));
 *
 * The card has two lives and only ever shows one of them: unowned, it is an
 * offer with a price; owned, it is a claim button with a countdown. Rendering
 * both — the mistake that makes a shop card feel like an upsell after you have
 * already paid — is why `claim()` re-renders the footer rather than toggling a
 * class over a merged layout.
 */
export class SubscriptionCard extends FuiComponent<SubscriptionCardOptions> {
  private footer: HTMLElement;

  constructor(opts: SubscriptionCardOptions) {
    const root = h('div', {
      class: 'fui fui-subcard',
      dataset: { owned: opts.daysLeft != null ? 'on' : 'off' },
    });
    super(root, opts);

    const banner = h('div', {
      class: 'fui-subcard__banner',
      style: opts.art ? { '--fui-sub-art': `var(--fui-img-${opts.art})` } : undefined,
    });
    const stack = h('div', { class: 'fui-subcard__stack' });
    stack.appendChild(h('h3', { class: 'fui-subcard__title', text: opts.title }));
    if (opts.tagline) stack.appendChild(h('p', { class: 'fui-subcard__tagline', text: opts.tagline }));
    banner.appendChild(stack);
    if (opts.badge) banner.appendChild(h('span', { class: 'fui-subcard__badge', text: opts.badge }));
    root.appendChild(banner);

    const perks = h('ul', { class: 'fui-subcard__perks' });
    for (const perk of opts.perks) {
      const li = h('li', {
        class: 'fui-subcard__perk',
        dataset: { highlight: perk.highlight ? 'on' : 'off', glyph: perk.icon ? 'on' : 'off' },
        style: perk.icon ? { '--fui-sub-glyph': `var(--fui-img-${perk.icon})` } : undefined,
      });
      li.appendChild(h('span', { class: 'fui-subcard__perktext', text: perk.text }));
      perks.appendChild(li);
    }
    root.appendChild(perks);

    this.footer = h('div', { class: 'fui-subcard__footer' });
    root.appendChild(this.footer);
    this.paintFooter();
  }

  /** Take the daily gift. */
  claim(): this {
    if (!this.opts.claimable) return this;
    this.opts.claimable = false;
    this.opts.streak = (this.opts.streak ?? 0) + 1;
    this.paintFooter();
    this.emit('sub:claim', { reward: this.opts.dailyReward, streak: this.opts.streak });
    return this;
  }

  /** Update the term, e.g. after a renewal. Passing `undefined` un-owns it. */
  setDays(daysLeft: number | undefined, claimable = this.opts.claimable): this {
    this.opts.daysLeft = daysLeft;
    this.opts.claimable = claimable;
    this.el.dataset.owned = daysLeft != null ? 'on' : 'off';
    this.paintFooter();
    return this;
  }

  private paintFooter(): void {
    clear(this.footer);
    const o = this.opts;

    if (o.daysLeft == null) {
      const price = h('div', { class: 'fui-subcard__pricing' });
      if (o.wasPrice) price.appendChild(h('span', { class: 'fui-subcard__was', text: o.wasPrice }));
      price.appendChild(h('span', { class: 'fui-subcard__price', text: o.price ?? '' }));
      this.footer.appendChild(price);

      const buy = h('button', {
        class: 'fui-subcard__cta',
        dataset: { mode: 'buy' },
        attrs: { type: 'button' },
        text: 'Subscribe',
      });
      buy.addEventListener('click', () => this.emit('sub:buy', o.title));
      this.footer.appendChild(buy);
      return;
    }

    const term = h('div', { class: 'fui-subcard__term' });
    term.appendChild(
      h('span', {
        class: 'fui-subcard__days fui-num',
        text: `${commas(o.daysLeft)} ${o.daysLeft === 1 ? 'day' : 'days'} left`,
      }),
    );
    const bar = h('span', { class: 'fui-subcard__bar' });
    const pct = o.termDays ? Math.max(0, Math.min(1, o.daysLeft / o.termDays)) : 1;
    bar.appendChild(h('span', { class: 'fui-subcard__fill', style: { width: `${pct * 100}%` } }));
    term.appendChild(bar);
    if (o.streak) {
      term.appendChild(h('span', { class: 'fui-subcard__streak fui-num', text: `${o.streak}-day streak` }));
    }
    this.footer.appendChild(term);

    const claim = h('button', {
      class: 'fui-subcard__cta',
      dataset: { mode: o.claimable ? 'claim' : 'done', glyph: o.dailyArt ? 'on' : 'off' },
      style: o.dailyArt ? { '--fui-sub-daily': `var(--fui-img-${o.dailyArt})` } : undefined,
      attrs: { type: 'button', disabled: !o.claimable },
      text: o.claimable ? `Claim ${o.dailyReward ?? 'daily'}` : 'Claimed today',
    });
    claim.addEventListener('click', () => this.claim());
    this.footer.appendChild(claim);
  }
}
