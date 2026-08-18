import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface Friend {
  id: string;
  name: string;
  /** Avatar asset id. */
  art?: string;
  level?: number;
  /** Presence. `online` shows a live pip, `offline` shows `lastSeen`. */
  status?: 'online' | 'idle' | 'in-battle' | 'offline';
  /** Shown when offline, e.g. "2h ago". */
  lastSeen?: string;
  /** Total power, shown beside the name. */
  power?: number;
  /** Their lead champion, lent out as a support unit. */
  supportArt?: string;
  /** A gift can be sent right now. */
  giftReady?: boolean;
  /** A gift is waiting to be collected from them. */
  giftPending?: boolean;
  /** Clan tag in brackets. */
  clan?: string;
}

export interface FriendListOptions extends BaseOptions {
  friends: Friend[];
  title?: string;
  /** Cap the height in pixels (or any CSS length) and scroll inside. */
  maxHeight?: number | string;
  /** Show the "Send all / Claim all" bar. */
  bulkGifts?: boolean;
  /** Cap shown in the header, e.g. 50. */
  capacity?: number;
  emptyText?: string;
}

/**
 * The friends panel a social RPG runs its daily gift loop through: presence,
 * power, the support champion they lend, and the two buttons that matter.
 *
 *   const friends = new FriendList({
 *     title: 'Friends', capacity: 50, bulkGifts: true, maxHeight: 340,
 *     friends: [
 *       { id: 'a', name: 'Rhogar', art: 'tech-mech-suit', level: 61, status: 'online',
 *         power: 204_000, supportArt: 'fire-phoenix-rise', giftReady: true },
 *     ],
 *   });
 *   friends.on<string>('friend:gift', (id) => sendGift(id));
 *   friends.on('friend:gift-all', (ids) => sendGifts(ids));
 *
 * Online friends sort to the top automatically, because a list where the person
 * you can actually play with is buried is the common failure here.
 */
export class FriendList extends FuiComponent<FriendListOptions> {
  private body: HTMLElement;
  private friends: Friend[];
  private countEl: HTMLElement | null = null;

  constructor(opts: FriendListOptions) {
    const root = h('div', { class: 'fui fui-friends' });
    super(root, opts);
    this.friends = [...opts.friends];

    const head = h('div', { class: 'fui-friends__head' });
    head.appendChild(h('span', { class: 'fui-friends__title fui-label', text: opts.title ?? 'Friends' }));
    this.countEl = h('span', { class: 'fui-friends__count fui-num' });
    head.appendChild(this.countEl);

    if (opts.bulkGifts) {
      const send = h('button', {
        class: 'fui-friends__bulk',
        text: 'Send all',
        attrs: { type: 'button' },
      });
      send.addEventListener('click', () =>
        this.emit('friend:gift-all', this.friends.filter((f) => f.giftReady).map((f) => f.id)),
      );
      const claim = h('button', {
        class: 'fui-friends__bulk fui-friends__bulk--claim',
        text: 'Claim all',
        attrs: { type: 'button' },
      });
      claim.addEventListener('click', () =>
        this.emit('friend:claim-all', this.friends.filter((f) => f.giftPending).map((f) => f.id)),
      );
      head.append(send, claim);
    }
    root.appendChild(head);

    this.body = h('div', { class: 'fui-friends__body fui-scroll' });
    if (opts.maxHeight != null) {
      this.body.style.maxHeight =
        typeof opts.maxHeight === 'number' ? `${opts.maxHeight}px` : opts.maxHeight;
    }
    root.appendChild(this.body);
    this.render();
  }

  setFriends(friends: Friend[]): this {
    this.friends = [...friends];
    this.render();
    return this;
  }

  /** Mark one friend's gift as sent, without a full rebuild. */
  markSent(id: string): this {
    const friend = this.friends.find((f) => f.id === id);
    if (friend) friend.giftReady = false;
    this.render();
    return this;
  }

  private render(): void {
    clear(this.body);

    // Online first, then idle / in-battle, then offline — a friend you can
    // actually play with should never be buried under a screen of offline ones.
    const rank: Record<string, number> = { online: 0, 'in-battle': 1, idle: 2, offline: 3 };
    const sorted = [...this.friends].sort(
      (a, b) => (rank[a.status ?? 'offline'] ?? 3) - (rank[b.status ?? 'offline'] ?? 3),
    );

    if (sorted.length === 0) {
      this.body.appendChild(
        h('p', { class: 'fui-friends__empty', text: this.opts.emptyText ?? 'No friends yet.' }),
      );
    }

    for (const friend of sorted) {
      const status = friend.status ?? 'offline';
      const row = h('div', { class: 'fui-friends__row', dataset: { status } });

      const avatar = h('span', { class: 'fui-friends__avatar' });
      if (friend.art) avatar.style.backgroundImage = `var(--fui-img-${friend.art})`;
      avatar.appendChild(h('span', { class: 'fui-friends__pip' }));
      row.appendChild(avatar);

      const main = h('div', { class: 'fui-friends__main' });
      const line = h('div', { class: 'fui-friends__line' });
      line.appendChild(h('span', { class: 'fui-friends__name', text: friend.name }));
      if (friend.clan) line.appendChild(h('span', { class: 'fui-friends__clan', text: `[${friend.clan}]` }));
      main.appendChild(line);

      const meta = h('div', { class: 'fui-friends__meta' });
      if (friend.level != null) meta.appendChild(h('span', { text: `Lv ${friend.level}` }));
      if (friend.power != null) {
        meta.appendChild(h('span', { class: 'fui-num', text: friend.power.toLocaleString('en-US') }));
      }
      meta.appendChild(
        h('span', {
          class: 'fui-friends__status',
          text: status === 'offline' ? (friend.lastSeen ?? 'Offline') : status.replace('-', ' '),
        }),
      );
      main.appendChild(meta);
      row.appendChild(main);

      if (friend.supportArt) {
        row.appendChild(
          h('span', {
            class: 'fui-friends__support',
            style: { backgroundImage: `var(--fui-img-${friend.supportArt})` },
            attrs: { title: 'Support champion' },
          }),
        );
      }

      if (friend.giftPending) {
        const claim = h('button', {
          class: 'fui-friends__action fui-friends__action--claim',
          text: 'Claim',
          attrs: { type: 'button' },
        });
        claim.addEventListener('click', () => this.emit('friend:claim', friend.id));
        row.appendChild(claim);
      } else {
        const gift = h('button', {
          class: 'fui-friends__action',
          text: 'Gift',
          attrs: { type: 'button', disabled: !friend.giftReady || undefined },
        });
        gift.addEventListener('click', () => this.emit('friend:gift', friend.id));
        row.appendChild(gift);
      }

      this.body.appendChild(row);
    }

    if (this.countEl) {
      const online = this.friends.filter((f) => (f.status ?? 'offline') !== 'offline').length;
      const cap = this.opts.capacity;
      this.countEl.textContent = cap
        ? `${online} online · ${this.friends.length}/${cap}`
        : `${online} online`;
    }
  }
}
