import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface IconButtonOptions extends BaseOptions {
  /**
   * Prebuilt chrome that ships with its symbol painted in. Themes bind these
   * to real artwork, so `close` is the theme's close button — not a glyph on
   * a generic plate.
   */
  preset?: 'close' | 'back' | 'settings';
  /** Glyph asset id, masked so it takes the button's colour. */
  glyph?: string;
  /** Painted icon asset id, drawn as artwork rather than tinted. */
  art?: string;
  /** Plate shape under the symbol. */
  shape?: 'round' | 'square' | 'plate' | 'bare';
  /** Size in pixels. */
  size?: number;
  /** Accessible name. Also used as the title tooltip. */
  label?: string;
  /** Count badge in the corner — unread mail, pending requests. */
  badge?: number | string;
  /** Draw the badge as a plain dot, for "something changed" with no count. */
  dot?: boolean;
  /** Colour the symbol, overriding the theme's. */
  tone?: 'default' | 'accent' | 'danger' | 'success' | 'gold';
  /** Greyed out and unpressable. */
  disabled?: boolean;
  /** Convenience shorthand for `.on('click', ...)`. */
  onClick?: (ev: MouseEvent) => void;
}

/**
 * The single icon button every screen needs a dozen of: close, back, settings,
 * mail, filter, sound. `Button` is the one with a label; this is the one that
 * has to work at 32px with no room for words.
 *
 *   new IconButton({ preset: 'close', size: 40, label: 'Close', onClick: () => modal.close() });
 *   new IconButton({ glyph: 'glyph-spell-book', shape: 'round', badge: 3, label: 'Journal' });
 *
 * `preset` and `glyph` are different things on purpose. A preset is finished
 * artwork the theme supplies — its symbol is painted into the plate and cannot
 * be recoloured. A glyph is monochrome art masked over the button's own colour,
 * so it follows `tone`, hover and the disabled state for free. Reaching for a
 * painted icon in the `glyph` slot is the classic mistake: a full-colour PNG
 * masks to a solid block, so `art` exists for that case and draws it as an
 * image instead.
 *
 * An icon with no words needs a name, so `label` is required in practice: it
 * becomes both `aria-label` and the hover tooltip.
 */
export class IconButton extends FuiComponent<IconButtonOptions> {
  private badgeEl: HTMLElement | null = null;

  constructor(opts: IconButtonOptions = {}) {
    const root = h('button', {
      class: 'fui fui-iconbtn',
      dataset: {
        shape: opts.preset ? 'preset' : (opts.shape ?? 'round'),
        tone: opts.tone ?? 'default',
        ...(opts.preset ? { preset: opts.preset } : {}),
      },
      style: { '--fui-iconbtn-size': `${opts.size ?? 44}px` },
      attrs: {
        type: 'button',
        disabled: opts.disabled,
        'aria-label': opts.label ?? opts.preset ?? opts.glyph ?? 'Button',
        title: opts.label,
      },
    });
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-iconbtn__plate', attrs: { 'aria-hidden': 'true' } }));

    if (opts.glyph) {
      root.appendChild(
        h('span', {
          class: 'fui-iconbtn__glyph',
          style: { '--fui-iconbtn-glyph': `var(--fui-img-${opts.glyph})` },
        }),
      );
    } else if (opts.art) {
      root.appendChild(
        h('span', {
          class: 'fui-iconbtn__art',
          style: { '--fui-iconbtn-art': `var(--fui-img-${opts.art})` },
        }),
      );
    }

    if (opts.badge != null || opts.dot) {
      this.badgeEl = h('span', {
        class: 'fui-iconbtn__badge',
        dataset: { dot: opts.dot ? 'on' : 'off' },
        text: opts.dot ? '' : String(opts.badge),
      });
      root.appendChild(this.badgeEl);
    }

    if (opts.onClick) root.addEventListener('click', opts.onClick as EventListener);
  }

  /** Set or clear the corner badge. Zero and null both remove it. */
  setBadge(badge: number | string | null): this {
    const gone = badge == null || badge === 0 || badge === '';
    if (gone) {
      this.badgeEl?.remove();
      this.badgeEl = null;
      return this;
    }
    if (!this.badgeEl) {
      this.badgeEl = h('span', { class: 'fui-iconbtn__badge', dataset: { dot: 'off' } });
      this.el.appendChild(this.badgeEl);
    }
    this.badgeEl.dataset.dot = 'off';
    this.badgeEl.textContent = String(badge);
    return this;
  }

  /** Enable or disable it. */
  setDisabled(disabled: boolean): this {
    (this.el as HTMLButtonElement).disabled = disabled;
    return this;
  }
}
