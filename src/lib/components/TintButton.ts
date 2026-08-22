import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h } from '../core/dom.ts';

const RARITY_TINT: Record<Rarity, string> = {
  common: 'var(--fui-rarity-common)',
  uncommon: 'var(--fui-rarity-uncommon)',
  rare: 'var(--fui-rarity-rare)',
  epic: 'var(--fui-rarity-epic)',
  legendary: 'var(--fui-rarity-legendary)',
  mythic: 'var(--fui-rarity-mythic)',
};

export interface TintButtonOptions extends BaseOptions {
  /** The label. */
  label: string;
  /** Glyph asset id drawn before it. */
  glyph?: string;
  /** Which ornament shape, `1`–`32`. */
  shape?: number;
  /** Any CSS colour or gradient for the ornament. Overrides `rarity`. */
  tint?: string;
  /** Take the tint from a rarity instead of naming a colour. */
  rarity?: Rarity;
  /** Ornament size. */
  scale?: number;
  /** Draw a filled centre behind the label. */
  filled?: boolean;
  /** Halo the ornament in its own colour. */
  glow?: boolean;
  /** Stretch to the container's width. */
  block?: boolean;
  /** Greyed out and unpressable. */
  disabled?: boolean;
  /** Convenience shorthand for `.on('click', ...)`. */
  onClick?: (ev: MouseEvent) => void;
}

/**
 * A button whose frame is a tintable ornament rather than painted plate art —
 * so one 400-byte PNG is a grey common button, a purple epic one and a gold
 * legendary one, and a faction's own colour costs nothing at all.
 *
 *   new TintButton({ label: 'Equip', rarity: 'legendary', shape: 7, glow: true });
 *   new TintButton({ label: 'Ashfall', tint: 'linear-gradient(160deg,#ffd98a,#7a3d05)', shape: 12 });
 *
 * `Button` wears the theme's painted button art and therefore looks like the
 * rest of the theme. This one is for the cases where the *colour is the
 * information* — rarity on a loot action, faction on a war board, element on a
 * hero pick. The ornament is 9-sliced as a `mask-border` over an arbitrary
 * paint, which is why a gradient works where a recoloured PNG could not.
 *
 * Browsers still ship only the prefixed `-webkit-mask-box-image`, so the rule
 * lives behind an `@supports` test with a plain white `border-image` as the
 * fallback — the button is never frameless, it is just untinted.
 */
export class TintButton extends FuiComponent<TintButtonOptions> {
  private labelEl: HTMLElement;

  constructor(opts: TintButtonOptions) {
    const shape = String(Math.min(32, Math.max(1, Math.round(opts.shape ?? 2)))).padStart(2, '0');
    const tint = opts.tint ?? (opts.rarity ? RARITY_TINT[opts.rarity] : undefined);

    const root = h('button', {
      class: 'fui fui-tintbtn',
      dataset: {
        fill: opts.filled ? 'solid' : 'hollow',
        ...(opts.rarity ? { rarity: opts.rarity } : {}),
      },
      style: {
        '--fui-tb-src': `var(--fui-img-deco-frame-${shape}${opts.filled ? '-scrim' : ''})`,
        '--fui-tb-scale': String(opts.scale ?? 0.6),
        ...(tint ? { '--fui-tb-tint': tint } : {}),
      },
      attrs: { type: 'button', disabled: opts.disabled, 'aria-label': opts.label },
    });
    if (opts.block) root.classList.add('fui-tintbtn--block');
    if (opts.glow) root.classList.add('fui-tintbtn--glow');
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-tintbtn__art', attrs: { 'aria-hidden': 'true' } }));

    const face = h('span', { class: 'fui-tintbtn__face' });
    if (opts.glyph) {
      face.appendChild(
        h('span', {
          class: 'fui-tintbtn__glyph',
          style: { '--fui-tb-glyph': `var(--fui-img-${opts.glyph})` },
        }),
      );
    }
    this.labelEl = h('span', { class: 'fui-tintbtn__label', text: opts.label });
    face.appendChild(this.labelEl);
    root.appendChild(face);

    if (opts.onClick) root.addEventListener('click', opts.onClick as EventListener);
    root.addEventListener('click', () => this.emit('tint:press', opts.label));
  }

  /** Recolour it — after a rarity upgrade, or a faction change. */
  setTint(tint: string): this {
    this.opts.tint = tint;
    this.el.style.setProperty('--fui-tb-tint', tint);
    return this;
  }

  /** Recolour from a rarity. */
  setRarity(rarity: Rarity): this {
    this.opts.rarity = rarity;
    this.el.dataset.rarity = rarity;
    return this.setTint(RARITY_TINT[rarity]);
  }

  /** Rewrite the label. */
  setLabel(label: string): this {
    this.opts.label = label;
    this.labelEl.textContent = label;
    this.el.setAttribute('aria-label', label);
    return this;
  }
}
