import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clamp, commas } from '../core/dom.ts';

export interface SeasonReward {
  id: string;
  name: string;
  /** Manifest asset id for the art. */
  art?: string;
  rarity?: Rarity;
  /** How many. */
  qty?: number;
}

export interface SeasonStat {
  /** What was counted, e.g. `'Battles won'`. */
  label: string;
  /** The number, already formatted or raw. */
  value: string | number;
  /** Change against last season, e.g. `'+18'`. */
  delta?: string;
  /** Glyph asset id for the row. */
  icon?: string;
}

export interface SeasonEndScreenOptions extends BaseOptions {
  /** Season name. */
  season: string;
  /** Manifest asset id for the backdrop. */
  art?: string;
  /** Rank reached, e.g. `'Emberguard II'`. */
  rank?: string;
  /** Manifest asset id for the rank emblem. */
  rankArt?: string;
  /** Where the player finished on the ladder. */
  placement?: number;
  /** How many took part, for the placement percentile. */
  entrants?: number;
  /** The season's numbers. */
  stats?: SeasonStat[];
  /** What the rank paid out. */
  rewards?: SeasonReward[];
  /** Rank the player starts next season at. */
  nextRank?: string;
  /** When the next season opens, already formatted. */
  nextStarts?: string;
  /** Label for the claim button. */
  claimLabel?: string;
  /** Rewards have already been taken. */
  claimed?: boolean;
}

/**
 * The season wrap-up: where the player landed, what they did all season, and
 * the rewards the rank paid out.
 *
 *   const wrap = new SeasonEndScreen({
 *     season: 'Season 4 — Emberfall', rank: 'Emberguard II', rankArt: 'decor-crest',
 *     placement: 1_284, entrants: 96_500, stats: seasonStats, rewards: seasonRewards,
 *     nextRank: 'Ashbound V', nextStarts: 'in 3 days',
 *   });
 *   wrap.on<SeasonReward[]>('season:claim', (rewards) => inbox.grant(rewards));
 *
 * Placement is printed with its percentile worked out for the player — "1,284th
 * of 96,500 · top 2%" — because the raw pair means nothing without the division
 * and every player does it anyway. The soft reset to next season's starting
 * rank is stated on the same screen rather than discovered later, which is the
 * single most common complaint about competitive seasons that end quietly.
 */
export class SeasonEndScreen extends FuiComponent<SeasonEndScreenOptions> {
  private claimBtn: HTMLButtonElement;

  constructor(opts: SeasonEndScreenOptions) {
    const root = h('div', {
      class: 'fui fui-seasonend',
      style: opts.art ? { '--fui-season-art': `var(--fui-img-${opts.art})` } : undefined,
    });
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-seasonend__kicker', text: 'Season complete' }));
    root.appendChild(h('h2', { class: 'fui-seasonend__season', text: opts.season }));

    // ── Rank ──
    const crest = h('div', { class: 'fui-seasonend__crest' });
    crest.appendChild(
      h('span', {
        class: 'fui-seasonend__emblem',
        style: opts.rankArt ? { '--fui-season-emblem': `var(--fui-img-${opts.rankArt})` } : undefined,
      }),
    );
    if (opts.rank) crest.appendChild(h('span', { class: 'fui-seasonend__rank', text: opts.rank }));
    if (opts.placement != null) {
      // A decimal below 10%, an integer above: rounding 1.33% to "1%" throws
      // away the part of the number a top-of-ladder player actually cares
      // about, and "top 12.4%" is false precision.
      const share = opts.entrants ? clamp((opts.placement / opts.entrants) * 100, 0, 100) : 0;
      const pct =
        opts.entrants != null && opts.entrants > 0
          ? ` · top ${Math.max(0.1, share).toFixed(share < 10 ? 1 : 0)}%`
          : '';
      crest.appendChild(
        h('span', {
          class: 'fui-seasonend__place fui-num',
          text: `${commas(opts.placement)}${ordinal(opts.placement)}${
            opts.entrants != null ? ` of ${commas(opts.entrants)}` : ''
          }${pct}`,
        }),
      );
    }
    root.appendChild(crest);

    // ── Stats ──
    if (opts.stats?.length) {
      const stats = h('div', { class: 'fui-seasonend__stats' });
      for (const stat of opts.stats) {
        const row = h('div', { class: 'fui-seasonend__stat' });
        row.appendChild(
          h('span', {
            class: 'fui-seasonend__staticon',
            dataset: { glyph: stat.icon ? 'on' : 'off' },
            style: stat.icon ? { '--fui-season-glyph': `var(--fui-img-${stat.icon})` } : undefined,
          }),
        );
        row.appendChild(h('span', { class: 'fui-seasonend__statlabel', text: stat.label }));
        row.appendChild(
          h('span', {
            class: 'fui-seasonend__statvalue fui-num',
            text: typeof stat.value === 'number' ? commas(stat.value) : stat.value,
          }),
        );
        if (stat.delta) {
          row.appendChild(
            h('span', {
              class: 'fui-seasonend__delta fui-num',
              dataset: { dir: stat.delta.trim().startsWith('-') ? 'down' : 'up' },
              text: stat.delta,
            }),
          );
        }
        stats.appendChild(row);
      }
      root.appendChild(stats);
    }

    // ── Rewards ──
    if (opts.rewards?.length) {
      const box = h('div', { class: 'fui-seasonend__rewards' });
      box.appendChild(h('h3', { class: 'fui-seasonend__rewardtitle', text: 'Season rewards' }));
      const grid = h('div', { class: 'fui-seasonend__grid' });
      for (const reward of opts.rewards) {
        const tile = h('div', {
          class: 'fui-seasonend__reward',
          dataset: { ...(reward.rarity ? { rarity: reward.rarity } : {}) },
          attrs: { title: reward.name },
        });
        tile.appendChild(
          h('span', {
            class: 'fui-seasonend__rewardart',
            style: reward.art ? { '--fui-season-reward': `var(--fui-img-${reward.art})` } : undefined,
          }),
        );
        if ((reward.qty ?? 1) > 1) {
          tile.appendChild(
            h('span', { class: 'fui-seasonend__rewardqty fui-num', text: `×${commas(reward.qty ?? 1)}` }),
          );
        }
        tile.appendChild(h('span', { class: 'fui-seasonend__rewardname', text: reward.name }));
        grid.appendChild(tile);
      }
      box.appendChild(grid);
      root.appendChild(box);
    }

    // ── Next season ──
    if (opts.nextRank || opts.nextStarts) {
      const next = h('p', { class: 'fui-seasonend__next' });
      next.textContent = [
        opts.nextRank ? `Next season you start at ${opts.nextRank}` : null,
        opts.nextStarts ? `Opens ${opts.nextStarts}` : null,
      ]
        .filter(Boolean)
        .join(' · ');
      root.appendChild(next);
    }

    this.claimBtn = h('button', {
      class: 'fui-seasonend__claim',
      attrs: { type: 'button', disabled: !!opts.claimed },
      dataset: { state: opts.claimed ? 'done' : 'open' },
      text: opts.claimed ? 'Claimed' : (opts.claimLabel ?? 'Claim rewards'),
    });
    this.claimBtn.addEventListener('click', () => this.claim());
    root.appendChild(this.claimBtn);
  }

  /** Take the season rewards. */
  claim(): this {
    if (this.opts.claimed) return this;
    this.opts.claimed = true;
    this.claimBtn.disabled = true;
    this.claimBtn.dataset.state = 'done';
    this.claimBtn.textContent = 'Claimed';
    this.emit('season:claim', this.opts.rewards ?? []);
    return this;
  }
}

/** English ordinal suffix — 1st, 2nd, 3rd, 11th. */
function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return 'th';
  switch (n % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}
