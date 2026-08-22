import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface GiftFriend {
  id: string;
  name: string;
  /** Manifest asset id for the portrait. */
  art?: string;
  /** A gift from them is waiting to be taken. */
  incoming?: boolean;
  /** Today's gift to them has already gone. */
  sent?: boolean;
  /** Last seen, already formatted — `'2d ago'`, `'Online'`. */
  seen?: string;
  /** Online right now. */
  online?: boolean;
}

export interface GiftPanelOptions extends BaseOptions {
  /** The friends list. */
  friends: GiftFriend[];
  /** Heading. */
  title?: string;
  /** What is being exchanged, e.g. `'Stamina'`. */
  currency?: string;
  /** Glyph asset id for the gift token. */
  giftArt?: string;
  /** How many gifts can still be sent today. */
  sendsLeft?: number;
  /** Daily send cap. */
  sendCap?: number;
  /** How many can still be claimed today. */
  claimsLeft?: number;
}

/**
 * The daily friend-gift round: send to everyone, take everything waiting, and
 * see both daily caps before spending any of them.
 *
 *   const gifts = new GiftPanel({
 *     title: 'Stamina', currency: 'Stamina', giftArt: 'glyph-health-potion',
 *     friends, sendsLeft: 14, sendCap: 20, claimsLeft: 9,
 *   });
 *   gifts.on<string[]>('gift:send', (ids) => social.sendGifts(ids));
 *   gifts.on<string[]>('gift:claim', (ids) => social.claimGifts(ids));
 *
 * Both bulk buttons emit an array — one for a single row, many for "send all" —
 * so a caller writes one handler and batches one request instead of firing
 * twenty. The cap is checked before the batch is built, so "Send all" with four
 * sends left sends to the first four rather than failing the whole action.
 */
export class GiftPanel extends FuiComponent<GiftPanelOptions> {
  private list: HTMLElement;
  private sendAllBtn: HTMLButtonElement;
  private claimAllBtn: HTMLButtonElement;
  private meter: HTMLElement;

  constructor(opts: GiftPanelOptions) {
    const root = h('div', { class: 'fui fui-giftpanel' });
    super(root, opts);

    const head = h('div', { class: 'fui-giftpanel__head' });
    head.appendChild(h('h3', { class: 'fui-giftpanel__title', text: opts.title ?? 'Gifts' }));
    this.meter = h('span', { class: 'fui-giftpanel__meter fui-num' });
    head.appendChild(this.meter);
    root.appendChild(head);

    const bulk = h('div', { class: 'fui-giftpanel__bulk' });
    this.sendAllBtn = h('button', {
      class: 'fui-giftpanel__bulkbtn',
      dataset: { act: 'send' },
      attrs: { type: 'button' },
      text: 'Send all',
    });
    this.sendAllBtn.addEventListener('click', () => this.sendAll());
    this.claimAllBtn = h('button', {
      class: 'fui-giftpanel__bulkbtn',
      dataset: { act: 'claim' },
      attrs: { type: 'button' },
      text: 'Claim all',
    });
    this.claimAllBtn.addEventListener('click', () => this.claimAll());
    bulk.append(this.claimAllBtn, this.sendAllBtn);
    root.appendChild(bulk);

    this.list = h('div', { class: 'fui-giftpanel__list' });
    root.appendChild(this.list);
    this.build();
  }

  /** Send to one friend. */
  send(id: string): this {
    return this.sendMany([id]);
  }

  /** Take one waiting gift. */
  claim(id: string): this {
    return this.claimMany([id]);
  }

  /** Send to everyone who has not had one today, up to the daily cap. */
  sendAll(): this {
    const ids = this.opts.friends.filter((f) => !f.sent).map((f) => f.id);
    return this.sendMany(this.opts.sendsLeft != null ? ids.slice(0, this.opts.sendsLeft) : ids);
  }

  /** Take everything waiting, up to the daily cap. */
  claimAll(): this {
    const ids = this.opts.friends.filter((f) => f.incoming).map((f) => f.id);
    return this.claimMany(this.opts.claimsLeft != null ? ids.slice(0, this.opts.claimsLeft) : ids);
  }

  private sendMany(ids: string[]): this {
    const going = ids.filter((id) => {
      const friend = this.opts.friends.find((f) => f.id === id);
      return friend && !friend.sent;
    });
    if (!going.length) return this;
    for (const id of going) {
      const friend = this.opts.friends.find((f) => f.id === id);
      if (friend) friend.sent = true;
    }
    if (this.opts.sendsLeft != null) {
      this.opts.sendsLeft = Math.max(0, this.opts.sendsLeft - going.length);
    }
    this.build();
    this.emit('gift:send', going);
    return this;
  }

  private claimMany(ids: string[]): this {
    const taking = ids.filter((id) => this.opts.friends.find((f) => f.id === id)?.incoming);
    if (!taking.length) return this;
    for (const id of taking) {
      const friend = this.opts.friends.find((f) => f.id === id);
      if (friend) friend.incoming = false;
    }
    if (this.opts.claimsLeft != null) {
      this.opts.claimsLeft = Math.max(0, this.opts.claimsLeft - taking.length);
    }
    this.build();
    this.emit('gift:claim', taking);
    return this;
  }

  private build(): void {
    const waiting = this.opts.friends.filter((f) => f.incoming).length;
    const toSend = this.opts.friends.filter((f) => !f.sent).length;

    this.meter.textContent =
      this.opts.sendsLeft != null && this.opts.sendCap != null
        ? `${this.opts.sendsLeft} / ${this.opts.sendCap} sends left`
        : `${waiting} waiting`;

    this.claimAllBtn.disabled = waiting === 0 || this.opts.claimsLeft === 0;
    this.claimAllBtn.dataset.count = String(waiting);
    this.sendAllBtn.disabled = toSend === 0 || this.opts.sendsLeft === 0;

    clear(this.list);
    for (const friend of this.opts.friends) {
      const row = h('div', {
        class: 'fui-giftpanel__row',
        dataset: { online: friend.online ? 'on' : 'off' },
      });
      row.appendChild(
        h('span', {
          class: 'fui-giftpanel__art',
          style: friend.art ? { '--fui-gift-art': `var(--fui-img-${friend.art})` } : undefined,
        }),
      );
      const body = h('div', { class: 'fui-giftpanel__body' });
      body.appendChild(h('span', { class: 'fui-giftpanel__name', text: friend.name }));
      body.appendChild(
        h('span', {
          class: 'fui-giftpanel__seen',
          text: friend.online ? 'Online' : (friend.seen ?? ''),
        }),
      );
      row.appendChild(body);

      // Claim outranks send: a waiting gift is the thing the player came for.
      if (friend.incoming) {
        const btn = h('button', {
          class: 'fui-giftpanel__act',
          dataset: { act: 'claim', glyph: this.opts.giftArt ? 'on' : 'off' },
          style: this.opts.giftArt ? { '--fui-gift-glyph': `var(--fui-img-${this.opts.giftArt})` } : undefined,
          attrs: { type: 'button', disabled: this.opts.claimsLeft === 0 },
          text: 'Claim',
        });
        btn.addEventListener('click', () => this.claim(friend.id));
        row.appendChild(btn);
      } else {
        const btn = h('button', {
          class: 'fui-giftpanel__act',
          dataset: { act: friend.sent ? 'sent' : 'send', glyph: this.opts.giftArt && !friend.sent ? 'on' : 'off' },
          style: this.opts.giftArt ? { '--fui-gift-glyph': `var(--fui-img-${this.opts.giftArt})` } : undefined,
          attrs: { type: 'button', disabled: !!friend.sent || this.opts.sendsLeft === 0 },
          text: friend.sent ? 'Sent' : 'Send',
        });
        btn.addEventListener('click', () => this.send(friend.id));
        row.appendChild(btn);
      }
      this.list.appendChild(row);
    }
  }
}
