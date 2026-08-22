import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface DieSpec {
  /** Faces on the die — 4, 6, 8, 10, 12, 20, or anything else. */
  sides: number;
  /** How many of them. */
  count?: number;
  /** Die colour. */
  color?: string;
}

export interface RollResult {
  /** What each die showed, in the order they were rolled. */
  rolls: Array<{ sides: number; value: number }>;
  /** The dice added up, before the modifier. */
  subtotal: number;
  /** The modifier that was applied. */
  modifier: number;
  /** Subtotal plus modifier. */
  total: number;
  /** Every die came up maximum. */
  critical: boolean;
  /** Every die came up 1. */
  fumble: boolean;
  /** Against a target, whether the roll beat it. */
  success?: boolean;
}

export interface DiceRollerOptions extends BaseOptions {
  /** The pool to roll, e.g. `[{ sides: 20 }, { sides: 6, count: 2 }]`. */
  dice: DieSpec[];
  /** Flat bonus added to the total. */
  modifier?: number;
  /** Heading over the tray. */
  label?: string;
  /** Difficulty to beat. Set it and the result says hit or miss. */
  target?: number;
  /** Label on the roll button. */
  action?: string;
  /** Milliseconds the dice tumble before settling. */
  duration?: number;
  /** Die size in pixels. */
  size?: number;
  /** Keep the last few results under the tray. */
  history?: number;
}

/** A fair integer in 1..sides. */
function d(sides: number): number {
  return 1 + Math.floor(Math.random() * Math.max(1, Math.round(sides)));
}

/**
 * The dice tray: a pool, a modifier, a target to beat, and a roll that tumbles
 * before it settles. Skill checks, damage, loot rolls, tavern games.
 *
 *   const tray = new DiceRoller({
 *     label: 'Persuasion', dice: [{ sides: 20 }], modifier: 4, target: 15,
 *     history: 4, action: 'Roll',
 *   });
 *   tray.on<RollResult>('dice:result', (r) => story.resolve(r.success));
 *
 * The numbers are drawn the moment you press the button and the tumble is only
 * theatre played over a decided result — the same rule `SpinWheel` follows, and
 * for the same reason. `roll()` returns the result synchronously, so a
 * server-authoritative game can pass its own numbers to `show()` instead and
 * keep the animation.
 */
export class DiceRoller extends FuiComponent<DiceRollerOptions> {
  private tray: HTMLElement;
  private readout: HTMLElement;
  private verdict: HTMLElement;
  private log: HTMLElement | null = null;
  private button: HTMLButtonElement;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private past: RollResult[] = [];

  constructor(opts: DiceRollerOptions) {
    const root = h('div', {
      class: 'fui fui-dice',
      style: { '--fui-dice-size': `${opts.size ?? 46}px` },
    });
    super(root, opts);

    const head = h('div', { class: 'fui-dice__head' });
    if (opts.label) {
      head.appendChild(h('span', { class: 'fui-dice__label fui-label', text: opts.label }));
    }
    head.appendChild(h('span', { class: 'fui-dice__formula fui-num', text: this.formula() }));
    root.appendChild(head);

    this.tray = h('div', { class: 'fui-dice__tray' });
    root.appendChild(this.tray);
    this.paintDice(null);

    const foot = h('div', { class: 'fui-dice__foot' });
    this.readout = h('span', { class: 'fui-dice__total fui-num', text: '—' });
    foot.appendChild(this.readout);
    this.verdict = h('span', { class: 'fui-dice__verdict' });
    foot.appendChild(this.verdict);
    this.button = h('button', {
      class: 'fui-dice__roll',
      text: opts.action ?? 'Roll',
      attrs: { type: 'button' },
    });
    this.button.addEventListener('click', () => this.roll());
    foot.appendChild(this.button);
    root.appendChild(foot);

    if (opts.history) {
      this.log = h('div', { class: 'fui-dice__log' });
      root.appendChild(this.log);
    }

    this.onDestroy(() => this.cancel());
  }

  /** The pool written the way a player would say it — "2d6 + 1d20 + 4". */
  formula(): string {
    const parts = this.opts.dice.map((s) => `${s.count ?? 1}d${s.sides}`);
    const mod = this.opts.modifier ?? 0;
    if (mod) parts.push(mod > 0 ? `+${mod}` : String(mod));
    return parts.join(' ');
  }

  /** Roll the pool. The result is decided now; the tumble is theatre. */
  roll(): RollResult {
    const rolls: RollResult['rolls'] = [];
    for (const spec of this.opts.dice) {
      for (let i = 0; i < (spec.count ?? 1); i++) rolls.push({ sides: spec.sides, value: d(spec.sides) });
    }
    return this.show({ rolls });
  }

  /**
   * Play the tumble over numbers you already have — what a game does when the
   * server rolls and the client only animates.
   */
  show(result: { rolls: RollResult['rolls'] }): RollResult {
    this.cancel();
    const modifier = this.opts.modifier ?? 0;
    const subtotal = result.rolls.reduce((n, r) => n + r.value, 0);
    const total = subtotal + modifier;
    const full: RollResult = {
      rolls: result.rolls,
      subtotal,
      modifier,
      total,
      critical: result.rolls.length > 0 && result.rolls.every((r) => r.value === r.sides),
      fumble: result.rolls.length > 0 && result.rolls.every((r) => r.value === 1),
      ...(this.opts.target != null ? { success: total >= this.opts.target } : {}),
    };

    this.el.dataset.state = 'rolling';
    this.button.disabled = true;
    this.readout.textContent = '…';
    this.verdict.textContent = '';
    this.paintDice(null);
    this.emit('dice:roll', full);

    this.timer = setTimeout(() => {
      this.timer = null;
      this.settle(full);
    }, this.opts.duration ?? 700);
    return full;
  }

  /** The last few results, newest first. */
  results(): RollResult[] {
    return this.past;
  }

  /** Stop a roll in flight. Called on destroy. */
  cancel(): this {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    return this;
  }

  private settle(result: RollResult): void {
    this.paintDice(result);
    this.readout.textContent = String(result.total);
    this.el.dataset.state = result.critical
      ? 'critical'
      : result.fumble
        ? 'fumble'
        : result.success === false
          ? 'miss'
          : result.success === true
            ? 'hit'
            : 'settled';
    this.verdict.textContent = result.critical
      ? 'Critical'
      : result.fumble
        ? 'Fumble'
        : result.success === true
          ? `Beats ${this.opts.target}`
          : result.success === false
            ? `Misses ${this.opts.target}`
            : result.modifier
              ? `${result.subtotal} ${result.modifier > 0 ? '+' : '−'} ${Math.abs(result.modifier)}`
              : '';
    this.button.disabled = false;
    this.past = [result, ...this.past].slice(0, this.opts.history ?? 0);
    this.paintLog();
    this.emit('dice:result', result);
  }

  private paintDice(result: RollResult | null): void {
    clear(this.tray);
    let index = 0;
    for (const spec of this.opts.dice) {
      for (let i = 0; i < (spec.count ?? 1); i++, index++) {
        const roll = result?.rolls[index];
        const die = h('span', {
          class: 'fui-dice__die',
          dataset: {
            sides: String(spec.sides),
            max: String(!!roll && roll.value === spec.sides),
            one: String(!!roll && roll.value === 1),
          },
          style: {
            ...(spec.color ? { '--fui-dice-ink': spec.color } : {}),
            // Staggering by index keeps the tumble from looking mechanical
            // without needing a random number that SSR could not reproduce.
            '--fui-dice-delay': `${(index * 0.06).toFixed(2)}s`,
          },
        });
        die.appendChild(
          h('span', { class: 'fui-dice__face fui-num', text: roll ? String(roll.value) : '?' }),
        );
        die.appendChild(h('span', { class: 'fui-dice__sides', text: `d${spec.sides}` }));
        this.tray.appendChild(die);
      }
    }
  }

  private paintLog(): void {
    if (!this.log) return;
    clear(this.log);
    for (const r of this.past) {
      const row = h('span', {
        class: 'fui-dice__log-row fui-num',
        dataset: {
          verdict: r.critical ? 'critical' : r.fumble ? 'fumble' : r.success === false ? 'miss' : 'ok',
        },
        text: `${r.rolls.map((x) => x.value).join(' + ')}${
          r.modifier ? ` ${r.modifier > 0 ? '+' : '−'} ${Math.abs(r.modifier)}` : ''
        } = ${r.total}`,
      });
      this.log.appendChild(row);
    }
  }
}
