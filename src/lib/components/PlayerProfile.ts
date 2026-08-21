import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clamp, commas, abbreviate } from '../core/dom.ts';

export interface ProfileBadge {
  label: string;
  /** Glyph asset id for the badge. */
  glyph?: string;
  color?: string;
  /** Tooltip explaining how it was earned. */
  note?: string;
}

export interface ShowcaseUnit {
  name?: string;
  /** Manifest asset id for the portrait. */
  art?: string;
  rarity?: Rarity;
  stars?: number;
  level?: number;
}

export interface PlayerProfileOptions extends BaseOptions {
  /** The player’s display name. */
  name: string;
  /** Avatar asset id. */
  avatar?: string;
  /** Banner art behind the header. */
  banner?: string;
  /** Account level, drawn in the ring around the avatar. */
  level?: number;
  /** Progress into the next level, 0–1. */
  levelProgress?: number;
  /** Clan tag in brackets. */
  clan?: string;
  /** Player-written line. */
  motto?: string;
  /** Arena tier, server, or any short status line. */
  rank?: string;
  /** Numbers worth bragging about. */
  stats?: Array<{ label: string; value: number | string }>;
  /** Earned badges. */
  badges?: ProfileBadge[];
  /** The champions this player chose to display. */
  showcase?: ShowcaseUnit[];
  /** Player id shown small, for adding as a friend. */
  playerId?: string;
  /** Show the add-friend button. */
  addable?: boolean;
  /** Width in pixels, or any CSS length such as `'100%'`. */
  width?: number | string;
}

/**
 * The profile card a player taps a name to see — avatar, level, clan, the
 * champions they chose to show off, and the badges they earned.
 *
 *   new PlayerProfile({
 *     name: 'Rhogar', avatar: 'tech-mech-suit', banner: 'bg-wide',
 *     level: 61, levelProgress: 0.42, clan: 'ASH', rank: 'Gold I',
 *     motto: 'Nightmare twice a week. Bring speed.',
 *     stats: [{ label: 'Power', value: 204_000 }, { label: 'Champions', value: 128 }],
 *     badges: [{ label: 'Season 12 top 100', glyph: 'glyph-trophy-cup', color: '#e8c14a' }],
 *     showcase: [{ art: 'blood-necromancer', rarity: 'legendary', stars: 6, level: 60 }],
 *     playerId: '8842-1190', addable: true,
 *   });
 *
 * The showcase is the point: it is the one place a player composes how they are
 * seen, so it gets the largest, best-framed real estate on the card.
 */
export class PlayerProfile extends FuiComponent<PlayerProfileOptions> {
  constructor(opts: PlayerProfileOptions) {
    const root = h('div', {
      class: 'fui fui-profile',
      style: {
        ...(opts.banner ? { '--fui-profile-banner': `var(--fui-img-${opts.banner})` } : {}),
        ...(opts.levelProgress != null
          ? { '--fui-profile-xp': String(clamp(opts.levelProgress, 0, 1)) }
          : {}),
        ...(opts.width != null
          ? { width: typeof opts.width === 'number' ? `${opts.width}px` : opts.width }
          : {}),
      },
    });
    super(root, opts);

    // ── Header ────────────────────────────────────────────────────────────
    const head = h('div', { class: 'fui-profile__head' });
    head.appendChild(h('span', { class: 'fui-profile__banner', attrs: { 'aria-hidden': 'true' } }));

    const avatar = h('div', { class: 'fui-profile__avatar' });
    const face = h('span', { class: 'fui-profile__face' });
    if (opts.avatar) face.style.backgroundImage = `var(--fui-img-${opts.avatar})`;
    avatar.appendChild(face);
    if (opts.level != null) {
      avatar.appendChild(h('span', { class: 'fui-profile__level fui-num', text: String(opts.level) }));
    }
    head.appendChild(avatar);

    const ident = h('div', { class: 'fui-profile__ident' });
    const line = h('div', { class: 'fui-profile__line' });
    line.appendChild(h('span', { class: 'fui-profile__name fui-title', text: opts.name }));
    if (opts.clan) line.appendChild(h('span', { class: 'fui-profile__clan', text: `[${opts.clan}]` }));
    ident.appendChild(line);
    if (opts.rank) ident.appendChild(h('span', { class: 'fui-profile__rank', text: opts.rank }));
    if (opts.playerId) {
      ident.appendChild(h('span', { class: 'fui-profile__id fui-num', text: `ID ${opts.playerId}` }));
    }
    head.appendChild(ident);

    if (opts.addable) {
      const add = h('button', {
        class: 'fui-profile__add',
        text: 'Add friend',
        attrs: { type: 'button' },
      });
      add.addEventListener('click', () => this.emit('profile:add', opts.playerId ?? opts.name));
      head.appendChild(add);
    }
    root.appendChild(head);

    if (opts.motto) {
      root.appendChild(h('p', { class: 'fui-profile__motto', text: opts.motto }));
    }

    if (opts.stats?.length) {
      const stats = h('div', { class: 'fui-profile__stats' });
      for (const stat of opts.stats) {
        const cell = h('div', { class: 'fui-profile__stat' });
        cell.appendChild(
          h('span', {
            class: 'fui-profile__stat-value fui-num',
            text: typeof stat.value === 'number' ? abbreviate(stat.value) : stat.value,
            attrs: { title: typeof stat.value === 'number' ? commas(stat.value) : '' },
          }),
        );
        cell.appendChild(h('span', { class: 'fui-profile__stat-label', text: stat.label }));
        stats.appendChild(cell);
      }
      root.appendChild(stats);
    }

    if (opts.showcase?.length) {
      const wrap = h('div', { class: 'fui-profile__showcase' });
      wrap.appendChild(h('span', { class: 'fui-profile__section fui-label', text: 'Showcase' }));
      const row = h('div', { class: 'fui-profile__units' });
      for (const unit of opts.showcase) {
        const cell = h('div', {
          class: 'fui-profile__unit',
          dataset: { rarity: unit.rarity ?? 'common' },
          attrs: { title: unit.name ?? '' },
        });
        const art = h('span', { class: 'fui-profile__unit-art' });
        if (unit.art) art.style.backgroundImage = `var(--fui-img-${unit.art})`;
        cell.appendChild(art);
        if (unit.level != null) {
          cell.appendChild(
            h('span', { class: 'fui-profile__unit-level fui-num', text: String(unit.level) }),
          );
        }
        if (unit.stars) {
          cell.appendChild(
            h('span', { class: 'fui-profile__unit-stars', text: '★'.repeat(clamp(unit.stars, 0, 6)) }),
          );
        }
        row.appendChild(cell);
      }
      wrap.appendChild(row);
      root.appendChild(wrap);
    }

    if (opts.badges?.length) {
      const wrap = h('div', { class: 'fui-profile__badges' });
      wrap.appendChild(h('span', { class: 'fui-profile__section fui-label', text: 'Badges' }));
      const row = h('div', { class: 'fui-profile__badge-row' });
      for (const badge of opts.badges) {
        const chip = h('span', {
          class: 'fui-profile__badge',
          style: badge.color ? { '--fui-profile-ink': badge.color } : {},
          attrs: { title: badge.note ?? badge.label },
        });
        if (badge.glyph) {
          chip.appendChild(
            h('span', {
              class: 'fui-profile__badge-glyph',
              style: { '--fui-glyph-src': `var(--fui-img-${badge.glyph})` },
            }),
          );
        }
        chip.appendChild(h('span', { text: badge.label }));
        row.appendChild(chip);
      }
      wrap.appendChild(row);
      root.appendChild(wrap);
    }
  }
}
