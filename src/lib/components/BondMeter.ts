import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp, commas } from '../core/dom.ts';

export interface BondReward {
  /** Bond level this unlocks at. */
  level: number;
  /** What it gives — a line of voice work, a stat, a skin. */
  label: string;
  claimed?: boolean;
}

export interface BondMeterOptions extends BaseOptions {
  /** Whose bond this is. */
  name?: string;
  /** Manifest asset id for the portrait. */
  art?: string;
  /** Current bond level. */
  level?: number;
  /** Highest bond level available. */
  maxLevel?: number;
  /** Points into the current level. */
  value?: number;
  /** Points needed to finish the current level. */
  next?: number;
  /** Rewards along the track. */
  rewards?: BondReward[];
  /** Heart / bond glyph asset id. Defaults to the theme's heart. */
  art0?: string;
  /** Accent colour for the meter. */
  color?: string;
  /** How the bond is raised, e.g. "Win battles together". */
  hint?: string;
  /** Drop the reward track and hint, leaving the portrait and meter. */
  compact?: boolean;
}

/**
 * The affection track collection games hang voice lines, art and small stat
 * bumps off — bond level, friendship, trust. It is a second progression axis
 * that levelling does not touch, so it needs its own readout.
 *
 *   const bond = new BondMeter({
 *     name: 'Vexhollow', art: 'blood-necromancer',
 *     level: 4, maxLevel: 10, value: 320, next: 500,
 *     hint: 'Win battles with Vexhollow in the team',
 *     rewards: [
 *       { level: 3, label: 'Voice line', claimed: true },
 *       { level: 5, label: '+5% HP' },
 *     ],
 *   });
 *   bond.gain(120);
 *
 * `gain()` carries points over into the next level rather than clamping, so a
 * single large award can push through more than one level and still fire an
 * event for each.
 */
export class BondMeter extends FuiComponent<BondMeterOptions> {
  private level: number;
  private value: number;
  private fill: HTMLElement;
  private levelEl: HTMLElement;
  private countEl: HTMLElement;
  private pips: HTMLElement | null = null;

  constructor(opts: BondMeterOptions = {}) {
    const root = h('div', {
      class: 'fui fui-bond',
      style: {
        '--fui-bond-heart': `var(--fui-img-${opts.art0 ?? 'icon-heart'})`,
        ...(opts.color ? { '--fui-bond-ink': opts.color } : {}),
      },
    });
    if (opts.compact) root.classList.add('fui-bond--compact');
    super(root, opts);

    this.level = clamp(opts.level ?? 0, 0, opts.maxLevel ?? 10);
    this.value = Math.max(0, opts.value ?? 0);

    if (opts.art || opts.name) {
      const who = h('div', { class: 'fui-bond__who' });
      const art = h('span', { class: 'fui-bond__art' });
      if (opts.art) art.style.backgroundImage = `var(--fui-img-${opts.art})`;
      who.appendChild(art);
      who.appendChild(h('span', { class: 'fui-bond__heart', attrs: { 'aria-hidden': 'true' } }));
      root.appendChild(who);
    }

    const main = h('div', { class: 'fui-bond__main' });

    const head = h('div', { class: 'fui-bond__head' });
    if (opts.name) head.appendChild(h('span', { class: 'fui-bond__name', text: opts.name }));
    this.levelEl = h('span', { class: 'fui-bond__level fui-num' });
    head.appendChild(this.levelEl);
    main.appendChild(head);

    this.fill = h('span', { class: 'fui-bond__fill' });
    const track = h('div', { class: 'fui-bond__track' }, this.fill);
    this.countEl = h('span', { class: 'fui-bond__count fui-num' });
    track.appendChild(this.countEl);
    main.appendChild(track);

    if (opts.rewards?.length) {
      this.pips = h('div', { class: 'fui-bond__rewards' });
      main.appendChild(this.pips);
    }
    if (opts.hint) {
      main.appendChild(h('span', { class: 'fui-bond__hint', text: opts.hint }));
    }
    root.appendChild(main);

    this.paint();
  }

  /** Current level and points into it. */
  get(): { level: number; value: number } {
    return { level: this.level, value: this.value };
  }

  /**
   * Award bond points. Overflow carries into the next level, so one large
   * award can cross several and each fires its own event.
   */
  gain(points: number): this {
    const next = this.opts.next ?? 100;
    const max = this.opts.maxLevel ?? 10;
    this.value += Math.max(0, points);
    while (this.value >= next && this.level < max) {
      this.value -= next;
      this.level += 1;
      this.emit('bond:level', this.level);
      const reward = this.opts.rewards?.find((r) => r.level === this.level);
      if (reward) this.emit('bond:reward', reward);
    }
    if (this.level >= max) this.value = Math.min(this.value, next);
    this.paint();
    this.emit('bond:change', this.get());
    return this;
  }

  set(level: number, value = 0): this {
    this.level = clamp(level, 0, this.opts.maxLevel ?? 10);
    this.value = Math.max(0, value);
    this.paint();
    return this;
  }

  private paint(): void {
    const next = this.opts.next ?? 100;
    const max = this.opts.maxLevel ?? 10;
    const maxed = this.level >= max;
    const pct = maxed ? 1 : clamp(this.value / Math.max(1, next), 0, 1);

    this.fill.style.width = `${(pct * 100).toFixed(2)}%`;
    this.levelEl.textContent = maxed ? `Bond ${max} · Max` : `Bond ${this.level}`;
    this.countEl.textContent = maxed ? 'Bonded' : `${commas(this.value)} / ${commas(next)}`;
    this.el.classList.toggle('is-max', maxed);
    this.el.style.setProperty('--fui-bond-p', String(pct));

    if (this.pips) {
      while (this.pips.firstChild) this.pips.removeChild(this.pips.firstChild);
      for (const reward of this.opts.rewards ?? []) {
        const state = reward.claimed
          ? 'claimed'
          : this.level >= reward.level
            ? 'ready'
            : 'locked';
        const pip = h('span', {
          class: 'fui-bond__reward',
          dataset: { state },
          attrs: { title: `Bond ${reward.level} — ${reward.label}` },
        });
        pip.appendChild(h('span', { class: 'fui-bond__reward-dot' }));
        pip.appendChild(h('span', { class: 'fui-bond__reward-label', text: reward.label }));
        this.pips.appendChild(pip);
      }
    }
  }
}
