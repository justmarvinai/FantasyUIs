import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear, duration } from '../core/dom.ts';

export interface Bounty {
  id: string;
  title: string;
  /** What the contract asks for. */
  objective?: string;
  /** Manifest asset id for the target's portrait. */
  art?: string;
  /** Difficulty tier, which colours the pin and border. */
  tier?: Rarity;
  /** Recommended power or level. */
  requirement?: string;
  /** Reward lines, e.g. `['120,000 gold', '2 Ancient Shards']`. */
  rewards?: string[];
  /** Glyph asset id for the reward icon. */
  rewardGlyph?: string;
  /** Already taken by the player. */
  taken?: boolean;
  /** Finished and ready to hand in. */
  complete?: boolean;
  /** Seconds until this contract expires. */
  expiresIn?: number;
}

export interface QuestBoardOptions extends BaseOptions {
  /** The contracts pinned to the board. */
  bounties: Bounty[];
  /** Heading over the board. */
  title?: string;
  /** How many contracts can be active at once. */
  slots?: number;
  /** Seconds until the board refreshes with new contracts. */
  refreshIn?: number;
  /** Rerolls left today. Shows the reroll button when set. */
  rerolls?: number;
  /** Columns in the grid. */
  columns?: number;
  /** Line shown when the board has nothing on it. */
  emptyText?: string;
}

/**
 * The bounty board a hub town pins its contracts to — several offers, a limit
 * on how many can be active, a refresh timer and a reroll.
 *
 *   const board = new QuestBoard({
 *     title: 'Bounty board', slots: 3, rerolls: 2, refreshIn: 4 * 3600,
 *     bounties: [
 *       { id: 'b1', title: 'Cull the Rotmire', objective: 'Slay 30 bog wardens',
 *         tier: 'rare', requirement: '80k power', rewards: ['120,000 gold'], expiresIn: 7200 },
 *     ],
 *   });
 *   board.on<string>('quest:accept', (id) => accept(id));
 *
 * `QuestLog` tracks what you already took; this is where you take it from. The
 * slot counter is enforced here, so Accept goes dead once the board is full
 * rather than failing on the server.
 */
export class QuestBoard extends FuiComponent<QuestBoardOptions> {
  private grid: HTMLElement;
  private countEl: HTMLElement | null = null;
  private timeEl: HTMLElement | null = null;
  private remaining: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: QuestBoardOptions) {
    const root = h('div', {
      class: 'fui fui-board2',
      style: { '--fui-board-cols': String(opts.columns ?? 2) },
    });
    super(root, opts);
    this.remaining = opts.refreshIn ?? 0;

    const head = h('div', { class: 'fui-board2__head' });
    if (opts.title) {
      head.appendChild(h('span', { class: 'fui-board2__title fui-title', text: opts.title }));
    }
    if (opts.slots != null) {
      this.countEl = h('span', { class: 'fui-board2__count fui-num' });
      head.appendChild(this.countEl);
    }
    if (opts.refreshIn != null) {
      this.timeEl = h('span', { class: 'fui-board2__timer fui-num' });
      head.appendChild(this.timeEl);
      this.timer = setInterval(() => this.tick(), 1000);
      this.onDestroy(() => this.stop());
      this.tick(false);
    }
    if (opts.rerolls != null) {
      const reroll = h('button', {
        class: 'fui-board2__reroll',
        text: `Reroll (${opts.rerolls})`,
        attrs: { type: 'button', disabled: opts.rerolls <= 0 || undefined },
      });
      reroll.addEventListener('click', () => this.emit('quest:reroll'));
      head.appendChild(reroll);
    }
    root.appendChild(head);

    this.grid = h('div', { class: 'fui-board2__grid' });
    root.appendChild(this.grid);
    this.setBounties(opts.bounties);
  }

  /** Replace the contracts on the board. */
  setBounties(bounties: Bounty[]): this {
    this.opts.bounties = bounties;
    clear(this.grid);

    if (bounties.length === 0) {
      this.grid.appendChild(
        h('p', {
          class: 'fui-board2__empty',
          text: this.opts.emptyText ?? 'The board is bare. Check back after the refresh.',
        }),
      );
    }

    for (const b of bounties) {
      const card = h('article', {
        class: 'fui-board2__card',
        dataset: { tier: b.tier ?? 'common', state: b.complete ? 'complete' : b.taken ? 'taken' : 'open' },
      });

      // A paper pin holds each contract to the board — the detail that makes it
      // read as a noticeboard rather than a list of cards.
      card.appendChild(h('span', { class: 'fui-board2__pin', attrs: { 'aria-hidden': 'true' } }));

      const top = h('div', { class: 'fui-board2__top' });
      if (b.art) {
        top.appendChild(
          h('span', { class: 'fui-board2__art', style: { backgroundImage: `var(--fui-img-${b.art})` } }),
        );
      }
      const titles = h('div', { class: 'fui-board2__titles' });
      titles.appendChild(h('h3', { class: 'fui-board2__name', text: b.title }));
      if (b.objective) {
        titles.appendChild(h('p', { class: 'fui-board2__objective', text: b.objective }));
      }
      top.appendChild(titles);
      card.appendChild(top);

      const meta = h('div', { class: 'fui-board2__meta' });
      if (b.requirement) meta.appendChild(h('span', { class: 'fui-board2__req', text: b.requirement }));
      if (b.expiresIn) {
        meta.appendChild(
          h('span', { class: 'fui-board2__expiry fui-num', text: `${duration(b.expiresIn)} left` }),
        );
      }
      if (meta.childNodes.length) card.appendChild(meta);

      if (b.rewards?.length) {
        const rewards = h('div', { class: 'fui-board2__rewards' });
        for (const r of b.rewards) {
          const line = h('span', { class: 'fui-board2__reward' });
          if (b.rewardGlyph) {
            line.appendChild(
              h('span', {
                class: 'fui-board2__reward-glyph',
                style: { '--fui-glyph-src': `var(--fui-img-${b.rewardGlyph})` },
              }),
            );
          }
          line.appendChild(h('span', { text: r }));
          rewards.appendChild(line);
        }
        card.appendChild(rewards);
      }

      const full = this.isFull() && !b.taken && !b.complete;
      const btn = h('button', {
        class: 'fui-board2__action',
        text: b.complete ? 'Hand in' : b.taken ? 'Abandon' : full ? 'Board full' : 'Accept',
        attrs: { type: 'button', disabled: full || undefined },
      });
      btn.addEventListener('click', () => {
        if (b.complete) this.emit('quest:turnin', b.id);
        else if (b.taken) this.emit('quest:abandon', b.id);
        else this.emit('quest:accept', b.id);
      });
      card.appendChild(btn);

      this.grid.appendChild(card);
    }
    this.paintCount();
    return this;
  }

  /** How many contracts are currently accepted. */
  activeCount(): number {
    return this.opts.bounties.filter((b) => b.taken || b.complete).length;
  }

  /** True when no more contracts can be accepted. */
  isFull(): boolean {
    return this.opts.slots != null && this.activeCount() >= this.opts.slots;
  }

  /** Stop the refresh countdown. Called on destroy. */
  stop(): this {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    return this;
  }

  private tick(advance = true): void {
    if (advance && this.remaining > 0) this.remaining -= 1;
    if (this.timeEl) {
      this.timeEl.textContent = this.remaining > 0 ? `Refreshes in ${duration(this.remaining)}` : 'Refreshing…';
    }
    if (advance && this.remaining === 0) {
      this.stop();
      this.emit('quest:refresh');
    }
  }

  private paintCount(): void {
    if (!this.countEl || this.opts.slots == null) return;
    this.countEl.textContent = `${this.activeCount()} / ${this.opts.slots} taken`;
    this.countEl.classList.toggle('is-full', this.isFull());
  }
}
