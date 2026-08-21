import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear, abbreviate, duration } from '../core/dom.ts';

export interface IdleReward {
  id?: string;
  label: string;
  /** How many were earned. */
  amount: number;
  /** Manifest asset id for the reward art. */
  art?: string;
  /** Glyph asset id, used when there is no square art. */
  glyph?: string;
  rarity?: Rarity;
}

export interface IdleRewardsOptions extends BaseOptions {
  /** What piled up while the player was away. */
  rewards: IdleReward[];
  /** Seconds spent away. */
  awayFor: number;
  /** Seconds the game keeps accruing before it stops. */
  cap?: number;
  /** Heading over the panel. */
  title?: string;
  /** Where the loot came from — a stage name, a camp, an expedition. */
  source?: string;
  /** Background art asset id. */
  art?: string;
  /** Label on the collect button. */
  action?: string;
  /** Multiplier offered for watching an ad or spending a gem. */
  boost?: { multiplier: number; label: string; cost?: string };
}

/**
 * The "while you were away" panel — the idle haul a mobile RPG hands over on
 * login. `DailyRewards` pays for showing up; this pays for the hours in
 * between.
 *
 *   const idle = new IdleRewards({
 *     title: 'While you were away', source: 'Emberwood Vale',
 *     awayFor: 7 * 3600, cap: 8 * 3600,
 *     rewards: [{ label: 'Gold', amount: 184_000, glyph: 'icon-coins' }],
 *     boost: { multiplier: 2, label: 'Double it', cost: 'Watch an ad' },
 *   });
 *   idle.on('idle:collect', () => bank.add(idle.totals()));
 *
 * When the away time has hit the cap the panel says so plainly and shows how
 * much was lost to it, because a silent cap is how an idle game quietly trains
 * players to distrust it. `totals()` applies the boost if one was taken, so the
 * number the player sees is the number that is granted.
 */
export class IdleRewards extends FuiComponent<IdleRewardsOptions> {
  private grid: HTMLElement;
  private boosted = false;
  private boostBtn: HTMLButtonElement | null = null;

  constructor(opts: IdleRewardsOptions) {
    const root = h('div', {
      class: 'fui fui-idle',
      style: opts.art ? { '--fui-idle-art': `var(--fui-img-${opts.art})` } : {},
    });
    super(root, opts);

    const head = h('div', { class: 'fui-idle__head' });
    if (opts.title) {
      head.appendChild(h('span', { class: 'fui-idle__title fui-title', text: opts.title }));
    }
    if (opts.source) {
      head.appendChild(h('span', { class: 'fui-idle__source', text: opts.source }));
    }
    root.appendChild(head);

    const capped = this.isCapped();
    const clock = h('div', { class: 'fui-idle__clock', dataset: { capped: String(capped) } });
    clock.appendChild(
      h('span', {
        class: 'fui-idle__away fui-num',
        text: duration(Math.min(opts.awayFor, opts.cap ?? opts.awayFor)),
      }),
    );
    clock.appendChild(
      h('span', {
        class: 'fui-idle__away-label',
        text: capped ? 'collected before the cap' : 'of rewards collected',
      }),
    );
    root.appendChild(clock);

    if (capped && opts.cap != null) {
      root.appendChild(
        h('p', {
          class: 'fui-idle__lost',
          text: `${duration(opts.awayFor - opts.cap)} was lost past the ${duration(opts.cap)} cap.`,
        }),
      );
    }

    this.grid = h('div', { class: 'fui-idle__grid' });
    root.appendChild(this.grid);

    const actions = h('div', { class: 'fui-idle__actions' });
    if (opts.boost) {
      this.boostBtn = h('button', {
        class: 'fui-idle__boost',
        attrs: { type: 'button' },
      });
      this.boostBtn.appendChild(
        h('span', { class: 'fui-idle__boost-label', text: opts.boost.label }),
      );
      if (opts.boost.cost) {
        this.boostBtn.appendChild(
          h('span', { class: 'fui-idle__boost-cost', text: opts.boost.cost }),
        );
      }
      this.boostBtn.addEventListener('click', () => this.applyBoost());
      actions.appendChild(this.boostBtn);
    }
    const collect = h('button', {
      class: 'fui-idle__collect',
      text: opts.action ?? 'Collect',
      attrs: { type: 'button' },
    });
    collect.addEventListener('click', () => this.emit('idle:collect', this.totals()));
    actions.appendChild(collect);
    root.appendChild(actions);

    this.paint();
  }

  /** True when the away time ran past the accrual cap. */
  isCapped(): boolean {
    return this.opts.cap != null && this.opts.awayFor > this.opts.cap;
  }

  /** The haul as it will be granted, boost included. */
  totals(): IdleReward[] {
    const mult = this.boosted ? (this.opts.boost?.multiplier ?? 1) : 1;
    return this.opts.rewards.map((r) => ({ ...r, amount: Math.round(r.amount * mult) }));
  }

  /** Take the multiplier. The grid updates so the promise matches the payout. */
  applyBoost(): this {
    if (this.boosted || !this.opts.boost) return this;
    this.boosted = true;
    this.el.dataset.boosted = 'true';
    if (this.boostBtn) this.boostBtn.disabled = true;
    this.paint();
    this.emit('idle:boost', this.opts.boost.multiplier);
    return this;
  }

  private paint(): void {
    clear(this.grid);
    for (const reward of this.totals()) {
      const cell = h('div', {
        class: 'fui-idle__reward',
        dataset: { rarity: reward.rarity ?? 'common' },
        attrs: { title: reward.label },
      });
      const art = h('span', { class: 'fui-idle__art' });
      if (reward.art) art.style.backgroundImage = `var(--fui-img-${reward.art})`;
      else if (reward.glyph) {
        art.classList.add('is-glyph');
        art.style.setProperty('--fui-glyph-src', `var(--fui-img-${reward.glyph})`);
      }
      cell.appendChild(art);
      cell.appendChild(
        h('span', { class: 'fui-idle__amount fui-num', text: abbreviate(reward.amount) }),
      );
      cell.appendChild(h('span', { class: 'fui-idle__label', text: reward.label }));
      this.grid.appendChild(cell);
    }
  }
}
