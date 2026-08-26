import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp } from '../core/dom.ts';

export interface TurnRopeOptions extends BaseOptions {
  /** Seconds in a turn before the rope appears. */
  turnSeconds?: number;
  /** Seconds the rope itself burns for. */
  ropeSeconds?: number;
  /** Seconds already elapsed this turn. */
  elapsed?: number;
  /** Rope length in pixels. */
  length?: number;
  /** Lay it out vertically, for a side rail. */
  vertical?: boolean;
  /** Start burning immediately. */
  auto?: boolean;
  /** Print the seconds left beside the rope. */
  showSeconds?: boolean;
}

/**
 * The turn timer, as a burning rope. A bar counting down says "you have time";
 * a rope shortening with a flame on the end says "hurry up", and every card
 * game that ships one knows the difference.
 *
 *   const rope = new TurnRope({ turnSeconds: 75, ropeSeconds: 15, auto: true, length: 260 });
 *   rope.on('rope:ignite', () => sfx.play('rope-light'));
 *   rope.on('rope:out', () => game.endTurn());
 *   turn.on('start', () => rope.restart());
 *
 * Nothing is drawn for the first minute: the rope *appears* at the ignite point,
 * which is what makes it a warning rather than a clock. Two events come out of
 * it — `rope:ignite` when the burn starts and `rope:out` when it finishes — so a
 * game can play a sound at the first and force the turn at the second without
 * polling anything.
 *
 * The burn is driven by rAF against a real timestamp rather than a CSS
 * transition, because the flame's position and the forced end of turn have to be
 * the same number. A rope that visibly still has an inch left when the turn ends
 * is the kind of thing players record and post.
 */
export class TurnRope extends FuiComponent<TurnRopeOptions> {
  private secondsEl: HTMLElement | null = null;
  private raf = 0;
  private startedAt = 0;
  private elapsed = 0;
  private ignited = false;

  constructor(opts: TurnRopeOptions = {}) {
    const root = h('div', {
      class: 'fui fui-turnrope',
      dataset: { axis: opts.vertical ? 'y' : 'x', lit: 'off' },
      style: { '--fui-rope-len': `${opts.length ?? 240}px`, '--fui-rope-burn': '0' },
      attrs: { role: 'timer', 'aria-live': 'off' },
    });
    super(root, opts);

    const track = h('div', { class: 'fui-turnrope__track' });
    track.appendChild(h('span', { class: 'fui-turnrope__cord', attrs: { 'aria-hidden': 'true' } }));
    track.appendChild(h('span', { class: 'fui-turnrope__flame', attrs: { 'aria-hidden': 'true' } }));
    root.appendChild(track);

    if (opts.showSeconds) {
      this.secondsEl = h('span', { class: 'fui-turnrope__seconds fui-num' });
      root.appendChild(this.secondsEl);
    }

    this.elapsed = opts.elapsed ?? 0;
    this.paint();
    this.onDestroy(() => this.stop());
    if (opts.auto) this.start();
  }

  /** Start (or resume) the turn clock. */
  start(): this {
    this.stop();
    const view = this.el.ownerDocument.defaultView;
    if (!view?.requestAnimationFrame) return this;
    this.startedAt = 0;

    const turn = this.opts.turnSeconds ?? 75;
    const rope = this.opts.ropeSeconds ?? 15;

    const step = (now: number) => {
      if (!this.startedAt) this.startedAt = now;
      this.elapsed += (now - this.startedAt) / 1000;
      this.startedAt = now;

      const igniteAt = Math.max(0, turn - rope);
      if (!this.ignited && this.elapsed >= igniteAt) {
        this.ignited = true;
        this.emit('rope:ignite');
      }
      this.paint();

      if (this.elapsed >= turn) {
        this.stop();
        this.emit('rope:out');
        return;
      }
      this.raf = view.requestAnimationFrame(step);
    };
    this.raf = view.requestAnimationFrame(step);
    return this;
  }

  /** Freeze it where it is. */
  stop(): this {
    const view = this.el.ownerDocument.defaultView;
    if (this.raf && view?.cancelAnimationFrame) view.cancelAnimationFrame(this.raf);
    this.raf = 0;
    return this;
  }

  /** Back to a fresh turn and start again. */
  restart(): this {
    this.stop();
    this.elapsed = 0;
    this.ignited = false;
    this.paint();
    return this.start();
  }

  /** Seconds left in the turn. */
  get remaining(): number {
    return Math.max(0, (this.opts.turnSeconds ?? 75) - this.elapsed);
  }

  private paint(): void {
    const turn = this.opts.turnSeconds ?? 75;
    const rope = this.opts.ropeSeconds ?? 15;
    const igniteAt = Math.max(0, turn - rope);
    // Nothing is drawn for the first minute: the rope *appears* at the ignite
    // point, which is what makes it a warning rather than a clock.
    const burn = this.elapsed <= igniteAt ? 0 : clamp((this.elapsed - igniteAt) / rope, 0, 1);

    this.el.style.setProperty('--fui-rope-burn', String(burn));
    this.el.dataset.lit = burn > 0 ? 'on' : 'off';
    this.el.dataset.urgent = burn > 0.66 ? 'on' : 'off';

    if (this.secondsEl) {
      const left = Math.ceil(this.remaining);
      this.secondsEl.textContent = `${left}s`;
      this.secondsEl.dataset.urgent = left <= rope ? 'on' : 'off';
    }
    this.el.setAttribute('aria-label', `${Math.ceil(this.remaining)} seconds left in turn`);
  }
}
