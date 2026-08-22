import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface RibbonButtonOptions extends BaseOptions {
  /** The line the player reads. */
  label: string;
  /** Smaller line under it — a cost, a countdown, a subtitle. */
  note?: string;
  /** Glyph asset id drawn on the left. */
  glyph?: string;
  /** Ribbon shape. `arrow` points right, `banner` is a flat plaque. */
  variant?: 'arrow' | 'banner' | 'plain';
  /** Which way an `arrow` ribbon points. */
  direction?: 'right' | 'left';
  /** Colour wash over the ribbon art. */
  tone?: 'default' | 'gold' | 'danger' | 'success' | 'info';
  /** Width in pixels, or any CSS length. */
  width?: number | string;
  /** Draw a moving sheen — for the one CTA a screen is built around. */
  shine?: boolean;
  /** Greyed out and unpressable. */
  disabled?: boolean;
  /** Convenience shorthand for `.on('click', ...)`. */
  onClick?: (ev: MouseEvent) => void;
}

/**
 * The banner-shaped call to action: the wide ribbon a screen is built around —
 * Start Battle, Claim All, Summon ×10, Continue.
 *
 *   const start = new RibbonButton({
 *     label: 'Start battle', note: '−12 stamina', glyph: 'glyph-crossed-swords',
 *     variant: 'arrow', tone: 'gold', shine: true, width: 320,
 *   });
 *   start.on('ribbon:press', () => battle.begin());
 *
 * The ribbon art is 9-sliced from the theme's banner assets, so the pointed end
 * stays the shape it was painted at any width — a scaled background would
 * stretch the point into a wedge. `shine` is deliberately not the default: a
 * screen where three buttons all sweep has no primary action at all.
 */
export class RibbonButton extends FuiComponent<RibbonButtonOptions> {
  private labelEl: HTMLElement;
  private noteEl: HTMLElement | null = null;

  constructor(opts: RibbonButtonOptions) {
    const root = h('button', {
      class: 'fui fui-ribbonbtn',
      dataset: {
        variant: opts.variant ?? 'arrow',
        direction: opts.direction ?? 'right',
        tone: opts.tone ?? 'default',
        shine: opts.shine ? 'on' : 'off',
      },
      style: {
        ...(opts.width != null
          ? { width: typeof opts.width === 'number' ? `${opts.width}px` : opts.width }
          : {}),
      },
      attrs: { type: 'button', disabled: opts.disabled, 'aria-label': opts.label },
    });
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-ribbonbtn__art', attrs: { 'aria-hidden': 'true' } }));
    if (opts.shine) {
      root.appendChild(h('span', { class: 'fui-ribbonbtn__shine', attrs: { 'aria-hidden': 'true' } }));
    }

    const face = h('span', { class: 'fui-ribbonbtn__face' });
    if (opts.glyph) {
      face.appendChild(
        h('span', {
          class: 'fui-ribbonbtn__glyph',
          style: { '--fui-ribbon-glyph': `var(--fui-img-${opts.glyph})` },
        }),
      );
    }
    const stack = h('span', { class: 'fui-ribbonbtn__stack' });
    this.labelEl = h('span', { class: 'fui-ribbonbtn__label', text: opts.label });
    stack.appendChild(this.labelEl);
    if (opts.note) {
      this.noteEl = h('span', { class: 'fui-ribbonbtn__note', text: opts.note });
      stack.appendChild(this.noteEl);
    }
    face.appendChild(stack);
    root.appendChild(face);

    root.addEventListener('click', () => this.emit('ribbon:press', opts.label));
    if (opts.onClick) root.addEventListener('click', opts.onClick as EventListener);
  }

  /** Rewrite the ribbon in place. */
  set(label: string, note?: string): this {
    this.opts.label = label;
    this.labelEl.textContent = label;
    this.el.setAttribute('aria-label', label);
    if (note != null) {
      if (!this.noteEl) {
        this.noteEl = h('span', { class: 'fui-ribbonbtn__note' });
        this.labelEl.parentElement?.appendChild(this.noteEl);
      }
      this.noteEl.textContent = note;
    }
    return this;
  }

  /** Enable or disable it. */
  setDisabled(disabled: boolean): this {
    (this.el as HTMLButtonElement).disabled = disabled;
    return this;
  }
}
