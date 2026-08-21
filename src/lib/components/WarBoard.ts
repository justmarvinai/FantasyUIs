import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp, commas, duration } from '../core/dom.ts';

export interface WarSide {
  name: string;
  /** Crest asset id. */
  crest?: string;
  /** Stars, points, or whatever the war scores in. */
  score: number;
  /** Side colour. */
  color?: string;
}

export interface WarTarget {
  id: string;
  /** Who is being attacked — a player, a fortress, a node. */
  name: string;
  /** Avatar or structure asset id. */
  art?: string;
  /** Defender power, for deciding whether to commit. */
  power?: number;
  /** Stars already taken off this target, 0–3. */
  stars?: number;
  /** Best stars possible, usually 3. */
  maxStars?: number;
  /** Clan mate currently attacking it. */
  attacker?: string;
  /** Seconds left on that attacker's claim. */
  claimFor?: number;
  /** Fully cleared. */
  done?: boolean;
}

export interface WarBoardOptions extends BaseOptions {
  /** Your side. */
  us: WarSide;
  /** Theirs. */
  them: WarSide;
  /** The targets your clan can hit. */
  targets: WarTarget[];
  /** Heading over the board. */
  title?: string;
  /** Seconds left in the war. */
  endsIn?: number;
  /** Attacks the player still holds. */
  attacksLeft?: number;
  /** Cap the target list height and scroll inside. */
  maxHeight?: number | string;
}

/**
 * The clan war board: the score, the clock, and the list of targets with who is
 * already swinging at each one.
 *
 *   const war = new WarBoard({
 *     title: 'Clan war — day 2', endsIn: 20 * 3600, attacksLeft: 2,
 *     us: { name: 'Ashvale Covenant', score: 41, crest: 'crest-ember-shield' },
 *     them: { name: 'Iron Compact', score: 38, crest: 'crest-stone-guard' },
 *     targets: [{ id: 't1', name: 'Rhogar', power: 204_000, stars: 1, attacker: 'Solene', claimFor: 900 }],
 *   });
 *   war.on<string>('war:attack', (id) => battle.start(id));
 *
 * The claim is the mechanic this screen exists for: two clan mates burning
 * attacks on the same target is how wars are lost, so a claimed target says who
 * has it and how long the claim holds rather than merely being unavailable.
 */
export class WarBoard extends FuiComponent<WarBoardOptions> {
  private list: HTMLElement;
  private clock: HTMLElement | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: WarBoardOptions) {
    const root = h('div', { class: 'fui fui-war' });
    super(root, opts);

    if (opts.title || opts.endsIn != null) {
      const head = h('div', { class: 'fui-war__head' });
      if (opts.title) {
        head.appendChild(h('span', { class: 'fui-war__title fui-title', text: opts.title }));
      }
      if (opts.endsIn != null) {
        this.clock = h('span', { class: 'fui-war__clock fui-num' });
        head.appendChild(this.clock);
        this.timer = setInterval(() => this.tick(), 1000);
        this.onDestroy(() => this.stop());
        this.tick(false);
      }
      root.appendChild(head);
    }

    root.appendChild(this.scoreboard());

    if (opts.attacksLeft != null) {
      root.appendChild(
        h('p', {
          class: 'fui-war__attacks',
          text:
            opts.attacksLeft > 0
              ? `${opts.attacksLeft} ${opts.attacksLeft === 1 ? 'attack' : 'attacks'} left today`
              : 'No attacks left today',
        }),
      );
    }

    this.list = h('div', {
      class: 'fui-war__targets fui-scroll',
      style:
        opts.maxHeight != null
          ? { maxHeight: typeof opts.maxHeight === 'number' ? `${opts.maxHeight}px` : opts.maxHeight }
          : {},
    });
    root.appendChild(this.list);
    this.paint();
  }

  /** Who is ahead: `'us'`, `'them'` or `'tied'`. */
  leader(): 'us' | 'them' | 'tied' {
    if (this.opts.us.score === this.opts.them.score) return 'tied';
    return this.opts.us.score > this.opts.them.score ? 'us' : 'them';
  }

  /** Targets nobody has claimed and nobody has finished. */
  freeTargets(): WarTarget[] {
    return this.opts.targets.filter((t) => !t.done && !t.attacker);
  }

  /** Claim a target so no clan mate wastes an attack on it. */
  claim(id: string, by: string, seconds = 900): this {
    const target = this.opts.targets.find((t) => t.id === id);
    if (!target || target.done || target.attacker) return this;
    target.attacker = by;
    target.claimFor = seconds;
    this.paint();
    this.emit('war:claim', id);
    return this;
  }

  /** Update the score after a battle resolves. */
  setScore(us: number, them: number): this {
    this.opts.us.score = us;
    this.opts.them.score = them;
    const board = this.el.querySelector('.fui-war__score');
    if (board) board.replaceWith(this.scoreboard());
    return this;
  }

  /** Stop the war clock. Called on destroy. */
  stop(): this {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    return this;
  }

  private scoreboard(): HTMLElement {
    const { us, them } = this.opts;
    const total = Math.max(1, us.score + them.score);
    const board = h('div', {
      class: 'fui-war__score',
      dataset: { lead: this.leader() },
      style: {
        '--fui-war-us': us.color ?? 'var(--fui-accent)',
        '--fui-war-them': them.color ?? 'var(--fui-danger)',
        '--fui-war-split': `${((us.score / total) * 100).toFixed(2)}%`,
      },
    });

    const side = (s: WarSide, which: 'us' | 'them') => {
      const el = h('div', { class: `fui-war__side fui-war__side--${which}` });
      const crest = h('span', { class: 'fui-war__crest' });
      if (s.crest) crest.style.backgroundImage = `var(--fui-img-${s.crest})`;
      el.appendChild(crest);
      const text = h('div', { class: 'fui-war__side-text' });
      text.appendChild(h('span', { class: 'fui-war__side-name', text: s.name }));
      text.appendChild(h('span', { class: 'fui-war__side-score fui-num', text: commas(s.score) }));
      el.appendChild(text);
      return el;
    };

    board.appendChild(side(us, 'us'));
    const bar = h('div', { class: 'fui-war__bar' });
    bar.appendChild(h('span', { class: 'fui-war__bar-us' }));
    bar.appendChild(h('span', { class: 'fui-war__bar-them' }));
    board.appendChild(bar);
    board.appendChild(side(them, 'them'));
    return board;
  }

  private tick(repaint = true): void {
    if (this.opts.endsIn == null) return;
    if (repaint) this.opts.endsIn = Math.max(0, this.opts.endsIn - 1);
    if (this.clock) {
      this.clock.textContent =
        this.opts.endsIn > 0 ? `${duration(this.opts.endsIn)} left` : 'War over';
    }
    // Claims expire on the same second the war clock ticks, so one timer runs
    // both rather than a second interval racing the first.
    let dirty = false;
    for (const t of this.opts.targets) {
      if (t.claimFor != null && t.claimFor > 0) {
        t.claimFor -= 1;
        if (t.claimFor <= 0) {
          t.attacker = undefined;
          t.claimFor = undefined;
          dirty = true;
        }
      }
    }
    if (dirty && repaint) this.paint();
    if (this.opts.endsIn <= 0) this.stop();
  }

  private paint(): void {
    clear(this.list);
    for (const t of this.opts.targets) {
      const max = t.maxStars ?? 3;
      const stars = clamp(t.stars ?? 0, 0, max);
      const claimed = !!t.attacker;
      const row = h('div', {
        class: 'fui-war__target',
        dataset: { state: t.done ? 'done' : claimed ? 'claimed' : 'open' },
      });

      const art = h('span', { class: 'fui-war__target-art' });
      if (t.art) art.style.backgroundImage = `var(--fui-img-${t.art})`;
      row.appendChild(art);

      const text = h('div', { class: 'fui-war__target-text' });
      text.appendChild(h('span', { class: 'fui-war__target-name', text: t.name }));
      if (t.power != null) {
        text.appendChild(
          h('span', { class: 'fui-war__target-power fui-num', text: `${commas(t.power)} power` }),
        );
      }
      row.appendChild(text);

      const starRow = h('span', { class: 'fui-war__stars', attrs: { title: `${stars} of ${max}` } });
      for (let i = 0; i < max; i++) {
        const star = h('span', { class: 'fui-war__star' });
        if (i < stars) star.classList.add('is-on');
        starRow.appendChild(star);
      }
      row.appendChild(starRow);

      if (claimed) {
        row.appendChild(
          h('span', {
            class: 'fui-war__claim',
            text: `${t.attacker} · ${t.claimFor ? duration(t.claimFor) : 'in progress'}`,
          }),
        );
      } else {
        const attack = h('button', {
          class: 'fui-war__attack',
          text: t.done ? 'Cleared' : (this.opts.attacksLeft ?? 1) > 0 ? 'Attack' : 'No attacks',
          attrs: {
            type: 'button',
            disabled: t.done || (this.opts.attacksLeft ?? 1) <= 0 || undefined,
          },
        });
        attack.addEventListener('click', () => this.emit('war:attack', t.id));
        row.appendChild(attack);
      }
      this.list.appendChild(row);
    }
  }
}
