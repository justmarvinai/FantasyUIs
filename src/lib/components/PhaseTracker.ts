import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp } from '../core/dom.ts';

export interface BattlePhase {
  id: string;
  /** Label under the node. */
  label: string;
  /** Glyph asset id drawn inside the node. */
  icon?: string;
  /** One line explaining what happens here, shown for the active phase. */
  hint?: string;
  /** Phases the player has no input in are drawn as automatic. */
  auto?: boolean;
}

export interface PhaseTrackerOptions extends BaseOptions {
  /** The phases of one round, in order. */
  phases: BattlePhase[];
  /** Id of the phase happening now. Defaults to the first. */
  current?: string;
  /** Round number, printed at the head of the track. */
  round?: number;
  /** Whose round it is. Colours the track. */
  side?: 'you' | 'foe' | 'neutral';
  /** Label for the side, e.g. `'Your turn'`. */
  sideLabel?: string;
  /** Seconds on the clock for the current phase. Omit for no timer. */
  seconds?: number;
  /** Lay the track out top-to-bottom. */
  vertical?: boolean;
  /** Let the player click a phase to jump to it. */
  interactive?: boolean;
}

/**
 * The round structure of a turn-based fight — upkeep, draw, main, combat, end —
 * with the current step lit, a clock on it, and the round counter beside it.
 *
 *   const phases = new PhaseTracker({
 *     round: 3, side: 'you', sideLabel: 'Your turn', seconds: 30, interactive: true,
 *     phases: [
 *       { id: 'upkeep', label: 'Upkeep', icon: 'glyph-hourglass', auto: true, hint: 'Effects tick down.' },
 *       { id: 'main', label: 'Main', icon: 'glyph-spell-book', hint: 'Play cards and move.' },
 *       { id: 'combat', label: 'Combat', icon: 'glyph-crossed-swords', hint: 'Declare attacks.' },
 *     ],
 *     current: 'main',
 *   });
 *   phases.on<string>('phase:change', (id) => engine.enterPhase(id));
 *   phases.on('phase:timeout', () => phases.advance());
 *
 * `advance()` past the last phase rolls the round over and fires `phase:round`,
 * so the caller never has to track where the end of a round is. The clock is a
 * one-second interval rather than a CSS animation because the number and the
 * ring have to agree — an animated ring that finishes half a second after the
 * digit hits zero is the sort of thing players screenshot.
 */
export class PhaseTracker extends FuiComponent<PhaseTrackerOptions> {
  private track: HTMLElement;
  private hint: HTMLElement;
  private clock: HTMLElement | null = null;
  private roundEl: HTMLElement | null = null;
  private nodes = new Map<string, HTMLElement>();
  private ticker: ReturnType<typeof setInterval> | null = null;
  private left = 0;

  constructor(opts: PhaseTrackerOptions) {
    const root = h('div', {
      class: 'fui fui-phasetracker',
      dataset: {
        side: opts.side ?? 'neutral',
        axis: opts.vertical ? 'y' : 'x',
      },
    });
    super(root, opts);
    this.opts.current = opts.current ?? opts.phases[0]?.id;

    const head = h('div', { class: 'fui-phasetracker__head' });
    if (opts.round != null) {
      this.roundEl = h('span', { class: 'fui-phasetracker__round fui-num', text: `Round ${opts.round}` });
      head.appendChild(this.roundEl);
    }
    if (opts.sideLabel) {
      head.appendChild(h('span', { class: 'fui-phasetracker__side', text: opts.sideLabel }));
    }
    if (opts.seconds != null) {
      this.clock = h('span', { class: 'fui-phasetracker__clock fui-num' });
      head.appendChild(this.clock);
    }
    if (head.childElementCount) root.appendChild(head);

    this.track = h('div', { class: 'fui-phasetracker__track' });
    root.appendChild(this.track);

    this.hint = h('p', { class: 'fui-phasetracker__hint' });
    root.appendChild(this.hint);

    this.build();
    if (opts.seconds != null) this.startClock(opts.seconds);
    this.onDestroy(() => this.stopClock());
  }

  /** Move to a phase by id. */
  setPhase(id: string): this {
    if (!this.nodes.has(id) || id === this.opts.current) return this;
    this.opts.current = id;
    this.paint();
    if (this.opts.seconds != null) this.startClock(this.opts.seconds);
    this.emit('phase:change', id);
    return this;
  }

  /** Step to the next phase, rolling the round over at the end. */
  advance(): this {
    const order = this.opts.phases;
    const at = order.findIndex((p) => p.id === this.opts.current);
    const next = order[(at + 1) % order.length];
    if (at === order.length - 1) {
      this.setRound((this.opts.round ?? 1) + 1);
      this.emit('phase:round', this.opts.round);
    }
    return this.setPhase(next.id);
  }

  /** Set the round number. */
  setRound(round: number): this {
    this.opts.round = round;
    if (this.roundEl) this.roundEl.textContent = `Round ${round}`;
    return this;
  }

  /** Restart the clock on the current phase. */
  startClock(seconds: number): this {
    this.stopClock();
    this.opts.seconds = seconds;
    this.left = seconds;
    this.paintClock();
    if (!this.clock) return this;
    this.ticker = setInterval(() => {
      this.left = Math.max(0, this.left - 1);
      this.paintClock();
      if (this.left === 0) {
        this.stopClock();
        this.emit('phase:timeout', this.opts.current);
      }
    }, 1000);
    return this;
  }

  /** Stop the clock without changing phase. */
  stopClock(): this {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    return this;
  }

  private build(): void {
    clear(this.track);
    this.nodes.clear();
    this.opts.phases.forEach((phase, i) => {
      if (i > 0) this.track.appendChild(h('span', { class: 'fui-phasetracker__link' }));
      const node = h('button', {
        class: 'fui-phasetracker__node',
        dataset: { auto: phase.auto ? 'on' : 'off' },
        attrs: {
          type: 'button',
          disabled: !this.opts.interactive,
          'aria-label': phase.label,
        },
      });
      node.appendChild(
        h('span', {
          class: 'fui-phasetracker__mark',
          style: phase.icon ? { '--fui-phase-glyph': `var(--fui-img-${phase.icon})` } : undefined,
          dataset: { glyph: phase.icon ? 'on' : 'off' },
          text: phase.icon ? '' : String(i + 1),
        }),
      );
      node.appendChild(h('span', { class: 'fui-phasetracker__label', text: phase.label }));
      if (this.opts.interactive) node.addEventListener('click', () => this.setPhase(phase.id));
      this.nodes.set(phase.id, node);
      this.track.appendChild(node);
    });
    this.paint();
  }

  private paint(): void {
    const at = this.opts.phases.findIndex((p) => p.id === this.opts.current);
    this.opts.phases.forEach((phase, i) => {
      const node = this.nodes.get(phase.id);
      if (!node) return;
      node.dataset.state = i < at ? 'done' : i === at ? 'active' : 'ahead';
      node.setAttribute('aria-current', i === at ? 'step' : 'false');
    });
    // Published for callers who want to drive their own art off the round's
    // progress — a background that brightens toward the end of a turn, say.
    const span = Math.max(1, this.opts.phases.length - 1);
    this.el.style.setProperty('--fui-phase-progress', String(clamp(at / span, 0, 1)));
    this.hint.textContent = this.opts.phases[at]?.hint ?? '';
    this.hint.dataset.empty = this.hint.textContent ? 'off' : 'on';
  }

  private paintClock(): void {
    if (!this.clock) return;
    this.clock.textContent = `${this.left}s`;
    this.clock.dataset.low = this.left <= 5 ? 'on' : 'off';
    const total = this.opts.seconds || 1;
    this.el.style.setProperty('--fui-phase-clock', String(clamp(this.left / total, 0, 1)));
  }
}
