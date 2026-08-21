import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, commas, abbreviate } from '../core/dom.ts';

export type ClanRank = 'leader' | 'officer' | 'veteran' | 'member' | 'recruit';

export interface ClanMember {
  id: string;
  name: string;
  /** Avatar asset id. */
  art?: string;
  rank?: ClanRank;
  level?: number;
  power?: number;
  /** Contribution this cycle — boss damage, donations, points. */
  contribution?: number;
  /** Relative time since last seen, e.g. `'2h'`. Omit when online. */
  lastSeen?: string;
  online?: boolean;
  /** Days in the clan. */
  joined?: string;
  /** This row is the local player. */
  you?: boolean;
}

export interface ClanRosterOptions extends BaseOptions {
  /** Every member of the clan, in any order — the table sorts them. */
  members: ClanMember[];
  /** Heading over the table. */
  title?: string;
  /** Member cap, shown beside the count. */
  capacity?: number;
  /** Column to sort by first. */
  sort?: 'rank' | 'contribution' | 'power' | 'lastSeen';
  /** Cap the height in pixels (or any CSS length) and scroll inside. */
  maxHeight?: number | string;
  /** Show the contribution bar behind each row. */
  bars?: boolean;
  /** The local player can promote, demote and kick. */
  canManage?: boolean;
  /** Line shown when the clan has no members yet. */
  emptyText?: string;
}

const RANK_ORDER: Record<ClanRank, number> = {
  leader: 0, officer: 1, veteran: 2, member: 3, recruit: 4,
};
const RANK_LABEL: Record<ClanRank, string> = {
  leader: 'Leader', officer: 'Officer', veteran: 'Veteran', member: 'Member', recruit: 'Recruit',
};

/**
 * The clan member table: rank, power, this cycle's contribution and how long
 * since anyone saw them. `ClanCard` is the clan seen from outside; this is the
 * inside, and it is where a leader decides who to keep.
 *
 *   const roster = new ClanRoster({
 *     title: 'Ashvale Covenant', capacity: 30, sort: 'contribution', bars: true, canManage: true,
 *     members: [
 *       { id: 'a', name: 'Rhogar', rank: 'leader', power: 204_000, contribution: 48_200_000, online: true },
 *       { id: 'b', name: 'Drab', rank: 'recruit', power: 48_200, contribution: 0, lastSeen: '9d' },
 *     ],
 *   });
 *   roster.on<string>('clan:kick', (id) => confirmKick(id));
 *
 * Contribution bars scale against the top contributor, and a member who has
 * done nothing this cycle is flagged — those two together are the entire reason
 * this screen exists.
 */
export class ClanRoster extends FuiComponent<ClanRosterOptions> {
  private body: HTMLElement;
  private countEl: HTMLElement | null = null;
  private sort: NonNullable<ClanRosterOptions['sort']>;

  constructor(opts: ClanRosterOptions) {
    const root = h('div', { class: 'fui fui-croster' });
    // The manage buttons add a fifth column, so the header has to match.
    if (opts.canManage) root.classList.add('fui-croster--manage');
    super(root, opts);
    this.sort = opts.sort ?? 'rank';

    const head = h('div', { class: 'fui-croster__head' });
    if (opts.title) {
      head.appendChild(h('span', { class: 'fui-croster__title fui-title', text: opts.title }));
    }
    this.countEl = h('span', { class: 'fui-croster__count fui-num' });
    head.appendChild(this.countEl);

    const sorts: Array<[NonNullable<ClanRosterOptions['sort']>, string]> = [
      ['rank', 'Rank'],
      ['contribution', 'Contribution'],
      ['power', 'Power'],
      ['lastSeen', 'Activity'],
    ];
    const tabs = h('div', { class: 'fui-croster__sorts' });
    for (const [key, label] of sorts) {
      const btn = h('button', {
        class: 'fui-croster__sort',
        dataset: { key },
        text: label,
        attrs: { type: 'button' },
      });
      btn.addEventListener('click', () => this.setSort(key));
      tabs.appendChild(btn);
    }
    head.appendChild(tabs);
    root.appendChild(head);

    const cols = h('div', { class: 'fui-croster__cols' });
    cols.appendChild(h('span', { class: 'fui-croster__col', text: 'Member' }));
    cols.appendChild(h('span', { class: 'fui-croster__col', text: 'Power' }));
    cols.appendChild(h('span', { class: 'fui-croster__col', text: 'Contribution' }));
    cols.appendChild(h('span', { class: 'fui-croster__col', text: 'Seen' }));
    if (opts.canManage) cols.appendChild(h('span', { class: 'fui-croster__col' }));
    root.appendChild(cols);

    this.body = h('div', { class: 'fui-croster__body fui-scroll' });
    if (opts.maxHeight != null) {
      this.body.style.maxHeight =
        typeof opts.maxHeight === 'number' ? `${opts.maxHeight}px` : opts.maxHeight;
    }
    root.appendChild(this.body);
    this.render();
  }

  /** Change the sort column. */
  setSort(sort: NonNullable<ClanRosterOptions['sort']>): this {
    this.sort = sort;
    this.render();
    this.emit('clan:sort', sort);
    return this;
  }

  setMembers(members: ClanMember[]): this {
    this.opts.members = members;
    this.render();
    return this;
  }

  /** Members who have contributed nothing this cycle. */
  inactive(): ClanMember[] {
    return this.opts.members.filter((m) => !m.contribution);
  }

  private render(): void {
    clear(this.body);
    const members = [...this.opts.members];

    members.sort((a, b) => {
      switch (this.sort) {
        case 'contribution': return (b.contribution ?? 0) - (a.contribution ?? 0);
        case 'power': return (b.power ?? 0) - (a.power ?? 0);
        // Online first, then whoever was seen most recently.
        case 'lastSeen': return Number(!!b.online) - Number(!!a.online);
        default:
          return (
            (RANK_ORDER[a.rank ?? 'member'] - RANK_ORDER[b.rank ?? 'member']) ||
            (b.contribution ?? 0) - (a.contribution ?? 0)
          );
      }
    });

    // Bars scale against the top contributor, so the gap between first and last
    // is the thing the eye reads.
    const peak = Math.max(1, ...members.map((m) => m.contribution ?? 0));

    if (members.length === 0) {
      this.body.appendChild(
        h('p', { class: 'fui-croster__empty', text: this.opts.emptyText ?? 'No members yet.' }),
      );
    }

    for (const m of members) {
      const rank = m.rank ?? 'member';
      const row = h('div', {
        class: 'fui-croster__row',
        dataset: { rank },
        style: this.opts.bars
          ? { '--fui-croster-p': String((m.contribution ?? 0) / peak) }
          : {},
      });
      if (m.you) row.classList.add('is-you');
      if (!m.contribution) row.classList.add('is-idle');

      const who = h('div', { class: 'fui-croster__who' });
      const avatar = h('span', { class: 'fui-croster__avatar' });
      if (m.art) avatar.style.backgroundImage = `var(--fui-img-${m.art})`;
      if (m.online) avatar.appendChild(h('span', { class: 'fui-croster__pip' }));
      who.appendChild(avatar);

      const names = h('div', { class: 'fui-croster__names' });
      names.appendChild(h('span', { class: 'fui-croster__name', text: m.name }));
      const sub = h('div', { class: 'fui-croster__sub' });
      sub.appendChild(h('span', { class: 'fui-croster__rank', text: RANK_LABEL[rank] }));
      if (m.level != null) sub.appendChild(h('span', { text: `Lv ${m.level}` }));
      if (m.joined) sub.appendChild(h('span', { text: m.joined }));
      names.appendChild(sub);
      who.appendChild(names);
      row.appendChild(who);

      row.appendChild(
        h('span', {
          class: 'fui-croster__power fui-num',
          text: m.power != null ? abbreviate(m.power) : '—',
          attrs: { title: m.power != null ? commas(m.power) : '' },
        }),
      );
      row.appendChild(
        h('span', {
          class: 'fui-croster__contrib fui-num',
          text: m.contribution ? abbreviate(m.contribution) : '—',
          attrs: { title: m.contribution ? commas(m.contribution) : 'Nothing this cycle' },
        }),
      );
      row.appendChild(
        h('span', {
          class: 'fui-croster__seen',
          text: m.online ? 'Online' : (m.lastSeen ?? '—'),
        }),
      );

      if (this.opts.canManage && rank !== 'leader') {
        const menu = h('div', { class: 'fui-croster__manage' });
        for (const [action, label] of [['promote', '▲'], ['demote', '▼'], ['kick', '×']] as const) {
          const btn = h('button', {
            class: `fui-croster__act fui-croster__act--${action}`,
            text: label,
            attrs: { type: 'button', 'aria-label': `${action} ${m.name}`, title: action },
          });
          btn.addEventListener('click', () => this.emit(`clan:${action}`, m.id));
          menu.appendChild(btn);
        }
        row.appendChild(menu);
      }

      this.body.appendChild(row);
    }

    for (const btn of Array.from(this.el.querySelectorAll('.fui-croster__sort'))) {
      btn.classList.toggle('is-on', (btn as HTMLElement).dataset.key === this.sort);
    }
    if (this.countEl) {
      const online = members.filter((m) => m.online).length;
      this.countEl.textContent = this.opts.capacity
        ? `${members.length}/${this.opts.capacity} · ${online} online`
        : `${members.length} members · ${online} online`;
    }
  }
}
