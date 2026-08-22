import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface ArrowButtonOptions extends BaseOptions {
  /** Which way it points. */
  direction?: 'left' | 'right' | 'up' | 'down';
  /** Size in pixels. */
  size?: number;
  /** Plate under the arrow. */
  shape?: 'round' | 'square' | 'bare';
  /** Label beside the arrow — a page number, a chapter name. */
  label?: string;
  /** Accessible name. Defaults to the direction. */
  title?: string;
  /** Nothing further in this direction. */
  disabled?: boolean;
  /** Hold it to repeat, e.g. scrubbing a long list. */
  repeat?: boolean;
  /** Milliseconds between repeats while held. */
  repeatEvery?: number;
  /** Convenience shorthand for `.on('click', ...)`. */
  onClick?: (ev: MouseEvent) => void;
}

/**
 * The directional nav button: carousel arrows, page turns, chapter steps,
 * roster paging. Small, everywhere, and worth having once rather than
 * re-drawn per screen.
 *
 *   const next = new ArrowButton({ direction: 'right', shape: 'round', title: 'Next hero' });
 *   next.on('arrow:press', () => roster.next());
 *
 *   const scrub = new ArrowButton({ direction: 'down', repeat: true, repeatEvery: 90 });
 *   scrub.on('arrow:press', () => list.scrollBy(40));
 *
 * The arrow is a CSS chevron rather than a glyph asset, so it is sharp at any
 * size, takes the button's colour, and cannot be the thing that is still
 * loading when a player wants to page. `repeat` starts after a short delay and
 * then fires on an interval — the same contract as a keyboard's auto-repeat —
 * and every timer it starts is registered for teardown, because a held arrow on
 * a screen that navigates away is the easiest leak in this whole library to
 * write by accident.
 */
export class ArrowButton extends FuiComponent<ArrowButtonOptions> {
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private repeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: ArrowButtonOptions = {}) {
    const direction = opts.direction ?? 'right';
    const root = h('button', {
      class: 'fui fui-arrowbtn',
      dataset: { direction, shape: opts.shape ?? 'round' },
      style: { '--fui-arrow-size': `${opts.size ?? 40}px` },
      attrs: {
        type: 'button',
        disabled: opts.disabled,
        'aria-label': opts.title ?? `${direction[0].toUpperCase()}${direction.slice(1)}`,
        title: opts.title,
      },
    });
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-arrowbtn__plate', attrs: { 'aria-hidden': 'true' } }));
    root.appendChild(h('span', { class: 'fui-arrowbtn__chevron', attrs: { 'aria-hidden': 'true' } }));
    if (opts.label) root.appendChild(h('span', { class: 'fui-arrowbtn__label', text: opts.label }));

    root.addEventListener('click', () => this.fire());
    if (opts.onClick) root.addEventListener('click', opts.onClick as EventListener);

    if (opts.repeat) {
      const start = () => {
        this.stopRepeat();
        // A delay before the first repeat, then a steady interval — the same
        // contract a keyboard's auto-repeat has trained everyone to expect.
        this.holdTimer = setTimeout(() => {
          this.repeatTimer = setInterval(() => this.fire(), opts.repeatEvery ?? 110);
        }, 380);
      };
      root.addEventListener('pointerdown', start);
      root.addEventListener('pointerup', () => this.stopRepeat());
      root.addEventListener('pointerleave', () => this.stopRepeat());
      root.addEventListener('pointercancel', () => this.stopRepeat());
      root.addEventListener('blur', () => this.stopRepeat());
      this.onDestroy(() => this.stopRepeat());
    }
  }

  /** Emit a press. Called on click and on every repeat tick. */
  fire(): this {
    if ((this.el as HTMLButtonElement).disabled) return this;
    this.emit('arrow:press', this.opts.direction ?? 'right');
    return this;
  }

  /** Grey it out when there is nothing further this way. */
  setDisabled(disabled: boolean): this {
    (this.el as HTMLButtonElement).disabled = disabled;
    if (disabled) this.stopRepeat();
    return this;
  }

  private stopRepeat(): void {
    if (this.holdTimer) clearTimeout(this.holdTimer);
    if (this.repeatTimer) clearInterval(this.repeatTimer);
    this.holdTimer = null;
    this.repeatTimer = null;
  }
}
