import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, commas } from '../core/dom.ts';

export interface ClanListing {
  id: string;
  name: string;
  /** Manifest asset id for the crest. */
  crest?: string;
  /** Guild level. */
  level?: number;
  /** Members in, members total. */
  members?: [number, number];
  /** Weekly activity score, 0–1, drawn as a meter. */
  activity?: number;
  /** Minimum player level to apply. */
  minLevel?: number;
  /** Applications are accepted without review. */
  autoAccept?: boolean;
  /** Recruitment blurb. */
  blurb?: string;
  /** Chips — language, region, focus. */
  tags?: string[];
  /** This player has already applied. */
  applied?: boolean;
  /** Weekly guild-war rank or similar. */
  rank?: number;
}

export interface ClanFinderOptions extends BaseOptions {
  /** Guilds to show. */
  clans: ClanListing[];
  /** Heading. */
  title?: string;
  /** The searching player's level, used to grey out guilds out of reach. */
  playerLevel?: number;
  /** Filter chips offered above the list. */
  filters?: string[];
  /** Filter selected first. */
  filter?: string;
  /** Show the "create a guild" call to action. */
  showCreate?: boolean;
}

/**
 * The guild browser a new player lands on: who is recruiting, how alive they
 * are, and whether the door is even open.
 *
 *   const finder = new ClanFinder({
 *     title: 'Find a guild', clans: listings, playerLevel: 34,
 *     filters: ['All', 'Auto-accept', 'English', 'Casual'], showCreate: true,
 *   });
 *   finder.on<ClanListing>('clan:apply', (clan) => guilds.apply(clan.id));
 *   finder.on<string>('clan:filter', (f) => guilds.search(f));
 *   finder.on('clan:create', () => openCreateDialog());
 *
 * Activity gets a meter rather than a "last active" date because the question a
 * player is really asking is "will anyone be here tomorrow", and a date makes
 * them do that arithmetic themselves. Full guilds and level-gated ones stay in
 * the list, marked — a browser that hides them looks empty and leaves the player
 * with nothing to aim at.
 */
export class ClanFinder extends FuiComponent<ClanFinderOptions> {
  private list: HTMLElement;
  private chips: HTMLElement | null = null;

  constructor(opts: ClanFinderOptions) {
    const root = h('div', { class: 'fui fui-clanfinder' });
    super(root, opts);
    this.opts.filter = opts.filter ?? opts.filters?.[0];

    const head = h('div', { class: 'fui-clanfinder__head' });
    head.appendChild(h('h3', { class: 'fui-clanfinder__title', text: opts.title ?? 'Find a guild' }));
    if (opts.showCreate) {
      const create = h('button', {
        class: 'fui-clanfinder__create',
        attrs: { type: 'button' },
        text: 'Create',
      });
      create.addEventListener('click', () => this.emit('clan:create'));
      head.appendChild(create);
    }
    root.appendChild(head);

    if (opts.filters?.length) {
      this.chips = h('div', { class: 'fui-clanfinder__filters' });
      for (const name of opts.filters) {
        const chip = h('button', {
          class: 'fui-clanfinder__filter',
          dataset: { filter: name },
          attrs: { type: 'button' },
          text: name,
        });
        chip.addEventListener('click', () => this.setFilter(name));
        this.chips.appendChild(chip);
      }
      root.appendChild(this.chips);
    }

    this.list = h('div', { class: 'fui-clanfinder__list' });
    root.appendChild(this.list);
    this.build();
  }

  /** Change the active filter chip. */
  setFilter(filter: string): this {
    this.opts.filter = filter;
    this.build();
    this.emit('clan:filter', filter);
    return this;
  }

  /** Apply to a guild. Auto-accept guilds emit `clan:join` instead. */
  apply(id: string): this {
    const clan = this.opts.clans.find((c) => c.id === id);
    if (!clan || clan.applied || this.locked(clan)) return this;
    clan.applied = true;
    this.build();
    this.emit(clan.autoAccept ? 'clan:join' : 'clan:apply', clan);
    return this;
  }

  /** Replace the listings — call after a search. */
  setClans(clans: ClanListing[]): this {
    this.opts.clans = clans;
    this.build();
    return this;
  }

  private locked(clan: ClanListing): boolean {
    if (clan.minLevel != null && (this.opts.playerLevel ?? Infinity) < clan.minLevel) return true;
    return !!clan.members && clan.members[0] >= clan.members[1];
  }

  private build(): void {
    if (this.chips) {
      for (const chip of Array.from(this.chips.children) as HTMLElement[]) {
        chip.dataset.on = chip.dataset.filter === this.opts.filter ? 'on' : 'off';
      }
    }

    clear(this.list);
    for (const clan of this.opts.clans) {
      const full = !!clan.members && clan.members[0] >= clan.members[1];
      const tooLow = clan.minLevel != null && (this.opts.playerLevel ?? Infinity) < clan.minLevel;

      const card = h('article', {
        class: 'fui-clanfinder__card',
        dataset: { state: clan.applied ? 'applied' : full ? 'full' : tooLow ? 'gated' : 'open' },
      });

      card.appendChild(
        h('span', {
          class: 'fui-clanfinder__crest',
          style: clan.crest ? { '--fui-clan-crest': `var(--fui-img-${clan.crest})` } : undefined,
        }),
      );

      const body = h('div', { class: 'fui-clanfinder__body' });
      const line = h('div', { class: 'fui-clanfinder__line' });
      line.appendChild(h('span', { class: 'fui-clanfinder__name', text: clan.name }));
      if (clan.level != null) {
        line.appendChild(h('span', { class: 'fui-clanfinder__level fui-num', text: `Lv ${clan.level}` }));
      }
      if (clan.rank != null) {
        line.appendChild(h('span', { class: 'fui-clanfinder__rank fui-num', text: `#${commas(clan.rank)}` }));
      }
      if (clan.autoAccept) {
        line.appendChild(h('span', { class: 'fui-clanfinder__open', text: 'Open' }));
      }
      body.appendChild(line);

      if (clan.blurb) body.appendChild(h('p', { class: 'fui-clanfinder__blurb', text: clan.blurb }));

      const facts = h('div', { class: 'fui-clanfinder__facts' });
      if (clan.members) {
        facts.appendChild(
          h('span', {
            class: 'fui-clanfinder__members fui-num',
            dataset: { full: full ? 'on' : 'off' },
            text: `${clan.members[0]} / ${clan.members[1]}`,
          }),
        );
      }
      if (clan.activity != null) {
        const meter = h('span', {
          class: 'fui-clanfinder__activity',
          style: { '--fui-clan-activity': String(Math.max(0, Math.min(1, clan.activity))) },
          attrs: { title: `Activity ${Math.round(clan.activity * 100)}%` },
        });
        meter.appendChild(h('span', { class: 'fui-clanfinder__activityfill' }));
        facts.appendChild(meter);
      }
      for (const tag of clan.tags ?? []) {
        facts.appendChild(h('span', { class: 'fui-clanfinder__tag', text: tag }));
      }
      if (clan.minLevel != null) {
        facts.appendChild(
          h('span', {
            class: 'fui-clanfinder__tag',
            dataset: { warn: tooLow ? 'on' : 'off' },
            text: `Lv ${clan.minLevel}+`,
          }),
        );
      }
      body.appendChild(facts);
      card.appendChild(body);

      const btn = h('button', {
        class: 'fui-clanfinder__apply',
        dataset: { state: clan.applied ? 'applied' : full ? 'full' : tooLow ? 'gated' : 'open' },
        attrs: { type: 'button', disabled: !!clan.applied || full || tooLow },
        text: clan.applied
          ? 'Applied'
          : full
            ? 'Full'
            : tooLow
              ? `Lv ${clan.minLevel}`
              : clan.autoAccept
                ? 'Join'
                : 'Apply',
      });
      btn.addEventListener('click', () => this.apply(clan.id));
      card.appendChild(btn);

      this.list.appendChild(card);
    }
  }
}
