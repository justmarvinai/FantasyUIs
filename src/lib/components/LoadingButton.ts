import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export type LoadingState = 'idle' | 'busy' | 'done' | 'failed';

export interface LoadingButtonOptions extends BaseOptions {
  /** Label at rest. */
  label: string;
  /** Label while the work is in flight. */
  busyLabel?: string;
  /** Label after it succeeds. */
  doneLabel?: string;
  /** Label after it fails. */
  failLabel?: string;
  /** Glyph asset id before the label. */
  glyph?: string;
  /** Milliseconds the done/failed state holds before returning to idle. `0` keeps it. */
  settle?: number;
  /** Stretch to the container's width. */
  block?: boolean;
  /** Tone of the resting button. */
  tone?: 'default' | 'gold' | 'danger';
  /** Greyed out and unpressable. */
  disabled?: boolean;
}

/**
 * A button that owns the round-trip: press it, it goes busy and stops taking
 * presses, then reports what happened. For anything that talks to a server —
 * claim, submit, join, purchase, retry.
 *
 *   const claim = new LoadingButton({ label: 'Claim', busyLabel: 'Claiming…', doneLabel: 'Claimed' });
 *   claim.on('load:press', async () => {
 *     try { await api.claim(); claim.succeed(); }
 *     catch (err) { claim.fail(String(err)); }
 *   });
 *
 * Double-submission is the bug this exists to kill: the button disables itself
 * the instant it goes busy, so a second tap during a slow request cannot send a
 * second claim. It never leaves busy on its own — only `succeed()` or `fail()`
 * ends it — because a spinner that times out optimistically is how a UI ends up
 * disagreeing with the server about whether something happened.
 *
 * A failure returns to a pressable state rather than staying dead, and the
 * reason goes in the title: an action a player cannot retry and cannot
 * understand is worse than one that simply did not work.
 */
export class LoadingButton extends FuiComponent<LoadingButtonOptions> {
  private labelEl: HTMLElement;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: LoadingButtonOptions) {
    const root = h('button', {
      class: 'fui fui-loadbtn',
      dataset: { state: 'idle', tone: opts.tone ?? 'default' },
      attrs: { type: 'button', disabled: opts.disabled, 'aria-live': 'polite' },
    });
    if (opts.block) root.classList.add('fui-loadbtn--block');
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-loadbtn__art', attrs: { 'aria-hidden': 'true' } }));

    const face = h('span', { class: 'fui-loadbtn__face' });
    if (opts.glyph) {
      face.appendChild(
        h('span', {
          class: 'fui-loadbtn__glyph',
          style: { '--fui-load-glyph': `var(--fui-img-${opts.glyph})` },
        }),
      );
    }
    face.appendChild(h('span', { class: 'fui-loadbtn__spinner', attrs: { 'aria-hidden': 'true' } }));
    face.appendChild(h('span', { class: 'fui-loadbtn__tick', attrs: { 'aria-hidden': 'true' } }));
    this.labelEl = h('span', { class: 'fui-loadbtn__label', text: opts.label });
    face.appendChild(this.labelEl);
    root.appendChild(face);

    root.addEventListener('click', () => {
      if (this.opts.disabled || this.state === 'busy') return;
      this.start();
      this.emit('load:press', this.opts.label);
    });

    this.onDestroy(() => {
      if (this.settleTimer) clearTimeout(this.settleTimer);
    });
  }

  /** What it is doing right now. */
  get state(): LoadingState {
    return (this.el.dataset.state as LoadingState) ?? 'idle';
  }

  /** Go busy. Disables itself, so a second tap cannot send a second request. */
  start(): this {
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.set('busy', this.opts.busyLabel ?? 'Working…');
    (this.el as HTMLButtonElement).disabled = true;
    return this;
  }

  /** The work landed. */
  succeed(): this {
    this.set('done', this.opts.doneLabel ?? this.opts.label);
    (this.el as HTMLButtonElement).disabled = true;
    this.el.removeAttribute('title');
    this.emit('load:done');
    this.armSettle();
    return this;
  }

  /** The work failed. The button becomes pressable again. */
  fail(reason?: string): this {
    this.set('failed', this.opts.failLabel ?? 'Try again');
    (this.el as HTMLButtonElement).disabled = false;
    if (reason) this.el.setAttribute('title', reason);
    this.emit('load:failed', reason);
    this.armSettle();
    return this;
  }

  /** Back to rest, whatever it was doing. */
  reset(): this {
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = null;
    this.set('idle', this.opts.label);
    (this.el as HTMLButtonElement).disabled = !!this.opts.disabled;
    this.el.removeAttribute('title');
    return this;
  }

  private set(state: LoadingState, label: string): void {
    this.el.dataset.state = state;
    this.labelEl.textContent = label;
    this.el.setAttribute('aria-busy', String(state === 'busy'));
  }

  private armSettle(): void {
    const settle = this.opts.settle ?? 1400;
    if (settle <= 0) return;
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => this.reset(), settle);
  }
}
