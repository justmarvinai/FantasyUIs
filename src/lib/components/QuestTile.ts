import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp } from '../core/dom.ts';

export interface QuestTileOptions extends BaseOptions {
  /** Quest name. */
  name: string;
  /** What has to be done. */
  requirement: string;
  /** Glyph asset id for the sigil. */
  glyph?: string;
  /** Manifest asset id for painted art behind the sigil. */
  art?: string;
  /** Progress so far. */
  progress?: number;
  /** Progress needed. */
  goal?: number;
  /** What completing it gives, e.g. `'Ragnaros, Lightlord'`. */
  reward?: string;
  /** Manifest asset id for the reward's art. */
  rewardArt?: string;
  /** Already finished — the tile flips to its reward face. */
  complete?: boolean;
  /** Which side of the board it belongs to. */
  side?: 'friendly' | 'enemy';
  /** Tile width in pixels. */
  size?: number;
  /** A sidequest, which is smaller and expires. */
  minor?: boolean;
}

/**
 * The quest sitting above a hero: what it wants, how far along it is, and what
 * it pays out. It is a card that stays on the board and counts, which nothing
 * else in a card game does.
 *
 *   const quest = new QuestTile({
 *     name: 'Fire Plumes Heart', requirement: 'Play 7 Taunt minions',
 *     glyph: 'glyph-magic-flame', progress: 4, goal: 7, reward: 'Sulfuras',
 *     rewardArt: 'weapon-magma-sword',
 *   });
 *   game.on('taunt', () => quest.advance());
 *   quest.on('quest:complete', () => board.grant(reward));
 *
 * `advance()` fires `quest:complete` exactly once, on the tick that crosses the
 * goal, and further calls do nothing — which is what stops a quest paying out
 * twice when two triggers land in the same game action.
 *
 * Progress is drawn as pips rather than a bar when the goal is small, and as a
 * bar past seven. A "4/7" bar is harder to read than four filled pips, and
 * every quest in the genre has a small, countable goal.
 */
export class QuestTile extends FuiComponent<QuestTileOptions> {
  private progressEl: HTMLElement;
  private countEl: HTMLElement;
  private fired = false;

  constructor(opts: QuestTileOptions) {
    const root = h('div', {
      class: 'fui fui-questtile',
      dataset: {
        side: opts.side ?? 'friendly',
        complete: opts.complete ? 'on' : 'off',
        minor: opts.minor ? 'on' : 'off',
      },
      style: {
        '--fui-quest-w': `${opts.size ?? 232}px`,
        ...(opts.art ? { '--fui-quest-art': `var(--fui-img-${opts.art})` } : {}),
        ...(opts.glyph ? { '--fui-quest-glyph': `var(--fui-img-${opts.glyph})` } : {}),
        ...(opts.rewardArt ? { '--fui-quest-reward': `var(--fui-img-${opts.rewardArt})` } : {}),
      },
      attrs: { role: 'status' },
    });
    super(root, opts);
    this.fired = !!opts.complete;

    root.appendChild(h('span', { class: 'fui-questtile__sigil', attrs: { 'aria-hidden': 'true' } }));

    const body = h('div', { class: 'fui-questtile__body' });
    body.appendChild(h('span', { class: 'fui-questtile__name', text: opts.name }));
    body.appendChild(h('span', { class: 'fui-questtile__req', text: opts.requirement }));
    this.progressEl = h('div', { class: 'fui-questtile__progress' });
    body.appendChild(this.progressEl);
    root.appendChild(body);

    this.countEl = h('span', { class: 'fui-questtile__count fui-num' });
    root.appendChild(this.countEl);

    if (opts.reward) {
      const reward = h('div', { class: 'fui-questtile__reward' });
      // No art, no disc: an empty circle beside "Draw 2 cards" reads as a
      // picture that failed to load rather than as a reward with no picture.
      if (opts.rewardArt) {
        reward.appendChild(h('span', { class: 'fui-questtile__rewardart', attrs: { 'aria-hidden': 'true' } }));
      }
      reward.appendChild(h('span', { class: 'fui-questtile__rewardname', text: opts.reward }));
      root.appendChild(reward);
    }

    this.paint();
  }

  /** Move the quest on by `n`. Fires `quest:complete` once, at the goal. */
  advance(n = 1): this {
    const goal = this.opts.goal ?? 1;
    const before = this.opts.progress ?? 0;
    this.opts.progress = Math.min(goal, before + n);
    this.paint();

    if (this.opts.progress > before) {
      this.el.dataset.ticked = 'on';
      void this.el.offsetWidth;
      this.el.dataset.ticked = 'off';
    }
    // Once, on the tick that crosses the goal — two triggers in one game action
    // must not pay out twice.
    if (!this.fired && this.opts.progress >= goal) {
      this.fired = true;
      this.opts.complete = true;
      this.el.dataset.complete = 'on';
      this.emit('quest:complete', this.opts.reward);
    }
    return this;
  }

  /** Set progress directly. */
  setProgress(progress: number): this {
    this.opts.progress = clamp(progress, 0, this.opts.goal ?? 1);
    this.paint();
    return this;
  }

  private paint(): void {
    const goal = this.opts.goal ?? 1;
    const done = this.opts.progress ?? 0;

    this.countEl.textContent = `${done}/${goal}`;
    this.countEl.dataset.near = goal - done <= 1 && done < goal ? 'on' : 'off';
    this.el.style.setProperty('--fui-quest-fill', String(clamp(done / goal, 0, 1)));

    // Pips below eight, a bar above: "4/7" is harder to read than four filled
    // pips, and every quest in the genre has a small, countable goal.
    this.progressEl.textContent = '';
    if (goal <= 7) {
      this.progressEl.dataset.style = 'pips';
      for (let i = 0; i < goal; i += 1) {
        this.progressEl.appendChild(
          h('span', { class: 'fui-questtile__pip', dataset: { on: i < done ? 'on' : 'off' } }),
        );
      }
    } else {
      this.progressEl.dataset.style = 'bar';
      this.progressEl.appendChild(h('span', { class: 'fui-questtile__bar' }));
    }

    this.el.setAttribute(
      'aria-label',
      `${this.opts.name}: ${this.opts.requirement}. ${done} of ${goal}.`,
    );
  }
}
