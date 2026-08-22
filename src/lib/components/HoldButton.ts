import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp } from '../core/dom.ts';

export interface HoldButtonOptions extends BaseOptions {
  /** Label at rest. */
  label: string;
  /** Label while the player is holding. Defaults to `'Hold…'`. */
  holdLabel?: string;
  /** Label once it fires. */
  doneLabel?: string;
  /** Glyph asset id drawn before the label. */
  glyph?: string;
  /** Milliseconds the hold must last. */
  duration?: number;
  /** What kind of action this is. `danger` is the usual one. */
  tone?: 'danger' | 'gold' | 'accent' | 'success';
  /** Stretch to the container's width. */
  block?: boolean;
  /** Greyed out and unpressable. */
  disabled?: boolean;
  /** Show the ring instead of the sweeping bar. */
  variant?: 'bar' | 'ring';
}

/**
 * Press and hold to confirm — the button for actions with no undo: delete a
 * save, disband a guild, sell a legendary, abandon a raid.
 *
 *   const scrap = new HoldButton({
 *     label: 'Scrap item', holdLabel: 'Keep holding…', duration: 1200,
 *     tone: 'danger', glyph: 'glyph-hammer-hit',
 *   });
 *   scrap.on('hold:complete', () => inventory.scrap(item));
 *
 * `ConfirmSlider` asks for a drag; this asks for a hold, which is the better
 * fit on a mouse and the only one that works with a keyboard. Releasing early
 * rewinds the fill rather than snapping it to zero, so a slip reads as "not
 * yet" instead of "nothing happened" — and `hold:cancel` fires with how far
 * they got, which is what tells you the duration is too long.
 *
 * The fill is driven by rAF against a real timestamp rather than a CSS
 * transition, because the completion event and the visual have to agree: a bar
 * that finishes a frame before the handler fires is how players end up
 * scrapping things they thought they had let go of.
 */
export class HoldButton extends FuiComponent<HoldButtonOptions> {
  private labelEl: HTMLElement;
  private raf = 0;
  private startedAt = 0;
  private progress = 0;
  private holding = false;

  constructor(opts: HoldButtonOptions) {
    const root = h('button', {
      class: 'fui fui-holdbtn',
      dataset: { tone: opts.tone ?? 'danger', variant: opts.variant ?? 'bar', state: 'idle' },
      attrs: { type: 'button', disabled: opts.disabled, 'aria-label': opts.label },
    });
    if (opts.block) root.classList.add('fui-holdbtn--block');
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-holdbtn__plate', attrs: { 'aria-hidden': 'true' } }));
    root.appendChild(h('span', { class: 'fui-holdbtn__fill', attrs: { 'aria-hidden': 'true' } }));

    const face = h('span', { class: 'fui-holdbtn__face' });
    if (opts.glyph) {
      face.appendChild(
        h('span', {
          class: 'fui-holdbtn__glyph',
          style: { '--fui-hold-glyph': `var(--fui-img-${opts.glyph})` },
        }),
      );
    }
    this.labelEl = h('span', { class: 'fui-holdbtn__label', text: opts.label });
    face.appendChild(this.labelEl);
    root.appendChild(face);

    const begin = (ev: Event) => {
      if ((root as HTMLButtonElement).disabled || this.holding) return;
      ev.preventDefault();
      this.begin();
    };
    const end = () => this.release();

    root.addEventListener('pointerdown', begin);
    root.addEventListener('pointerup', end);
    root.addEventListener('pointerleave', end);
    root.addEventListener('pointercancel', end);
    // Space and Enter repeat while held, so the first one starts it and keyup
    // ends it — the same contract as the pointer.
    root.addEventListener('keydown', (ev) => {
      if (ev.key === ' ' || ev.key === 'Enter') begin(ev);
    });
    root.addEventListener('keyup', end);
    root.addEventListener('blur', end);

    this.onDestroy(() => this.stopRaf());
  }

  /** Start the hold programmatically. */
  begin(): this {
    this.holding = true;
    this.el.dataset.state = 'holding';
    this.labelEl.textContent = this.opts.holdLabel ?? 'Hold…';
    this.startedAt = 0;
    this.emit('hold:start');
    this.run();
    return this;
  }

  /** Let go. Fires `hold:cancel` unless it had already completed. */
  release(): this {
    if (!this.holding) return this;
    this.holding = false;
    if (this.el.dataset.state === 'done') return this;
    this.el.dataset.state = 'rewind';
    this.labelEl.textContent = this.opts.label;
    this.emit('hold:cancel', this.progress);
    this.run();
    return this;
  }

  /** Put it back to its resting state after a completed hold. */
  reset(): this {
    this.stopRaf();
    this.holding = false;
    this.progress = 0;
    this.el.dataset.state = 'idle';
    this.labelEl.textContent = this.opts.label;
    this.el.style.setProperty('--fui-hold-p', '0');
    return this;
  }

  private run(): void {
    this.stopRaf();
    const view = this.el.ownerDocument.defaultView;
    if (!view?.requestAnimationFrame) return;
    const duration = this.opts.duration ?? 1000;

    const step = (now: number) => {
      if (!this.startedAt) this.startedAt = now;
      const dt = now - this.startedAt;
      this.startedAt = now;

      // Rewind twice as fast as the fill: a slip should not cost the player the
      // whole hold over again, but it must be visible that ground was lost.
      this.progress = clamp(
        this.progress + (this.holding ? dt / duration : (-dt * 2) / duration),
        0,
        1,
      );
      this.el.style.setProperty('--fui-hold-p', String(this.progress));

      if (this.holding && this.progress >= 1) {
        this.stopRaf();
        this.el.dataset.state = 'done';
        this.labelEl.textContent = this.opts.doneLabel ?? this.opts.label;
        this.emit('hold:complete');
        return;
      }
      if (!this.holding && this.progress <= 0) {
        this.stopRaf();
        this.el.dataset.state = 'idle';
        return;
      }
      this.raf = view.requestAnimationFrame(step);
    };
    this.raf = view.requestAnimationFrame(step);
  }

  private stopRaf(): void {
    const view = this.el.ownerDocument.defaultView;
    if (this.raf && view?.cancelAnimationFrame) view.cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
