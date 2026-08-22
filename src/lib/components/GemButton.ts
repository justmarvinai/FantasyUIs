import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface GemButtonOptions extends BaseOptions {
  /** Label under the gem. Omit for a bare orb. */
  label?: string;
  /** Glyph asset id inside the gem. */
  glyph?: string;
  /** Painted icon asset id inside the gem, drawn as art. */
  art?: string;
  /** Diameter in pixels. */
  size?: number;
  /** Gem colour. Any CSS colour. */
  color?: string;
  /** Slowly breathe, to draw the eye to the one thing worth pressing. */
  pulse?: boolean;
  /** Turning ring of runes around the gem. */
  ring?: boolean;
  /** Count badge — pulls left, energy, tickets. */
  badge?: number | string;
  /** Charging up: 0–1, drawn as a filling arc around the rim. */
  charge?: number;
  /** Greyed out and unpressable. */
  disabled?: boolean;
  /** Convenience shorthand for `.on('click', ...)`. */
  onClick?: (ev: MouseEvent) => void;
}

/**
 * The big round gem a screen is organised around: Summon, Spin, Start, Enter.
 * `Button` is the one you have ten of; this is the one you have exactly one of.
 *
 *   const summon = new GemButton({
 *     label: 'Summon ×10', glyph: 'glyph-celestial-body', size: 132,
 *     color: '#c2764a', pulse: true, ring: true, badge: 3,
 *   });
 *   summon.on('gem:press', () => banner.pull(10));
 *
 * The gem is drawn rather than textured — a stack of radial gradients for the
 * dome, the rim light and the inner shadow — so it takes any colour a game
 * wants for a faction, an element or a season without a new asset. `charge`
 * turns the rim into a filling arc, which is how a free-pull timer or a
 * summoning gauge reads without a second control beside it.
 *
 * `pulse` is off by default on purpose. It is the loudest thing this library
 * can do, and it only means anything while it is the only thing doing it.
 */
export class GemButton extends FuiComponent<GemButtonOptions> {
  private badgeEl: HTMLElement | null = null;

  constructor(opts: GemButtonOptions = {}) {
    const root = h('button', {
      class: 'fui fui-gembtn',
      dataset: { pulse: opts.pulse ? 'on' : 'off', ring: opts.ring ? 'on' : 'off' },
      style: {
        '--fui-gem-size': `${opts.size ?? 120}px`,
        '--fui-gem-charge': String(Math.max(0, Math.min(1, opts.charge ?? 0))),
        ...(opts.color ? { '--fui-gem-ink': opts.color } : {}),
      },
      attrs: {
        type: 'button',
        disabled: opts.disabled,
        'aria-label': opts.label ?? 'Activate',
      },
    });
    super(root, opts);

    const orb = h('span', { class: 'fui-gembtn__orb', attrs: { 'aria-hidden': 'true' } });
    if (opts.ring) orb.appendChild(h('span', { class: 'fui-gembtn__ring' }));
    if (opts.charge != null) orb.appendChild(h('span', { class: 'fui-gembtn__arc' }));
    orb.appendChild(h('span', { class: 'fui-gembtn__dome' }));
    if (opts.glyph) {
      orb.appendChild(
        h('span', {
          class: 'fui-gembtn__glyph',
          style: { '--fui-gem-glyph': `var(--fui-img-${opts.glyph})` },
        }),
      );
    } else if (opts.art) {
      orb.appendChild(
        h('span', {
          class: 'fui-gembtn__art',
          style: { '--fui-gem-art': `var(--fui-img-${opts.art})` },
        }),
      );
    }
    root.appendChild(orb);

    if (opts.badge != null) {
      this.badgeEl = h('span', { class: 'fui-gembtn__badge fui-num', text: String(opts.badge) });
      root.appendChild(this.badgeEl);
    }

    if (opts.label) root.appendChild(h('span', { class: 'fui-gembtn__label', text: opts.label }));

    root.addEventListener('click', () => this.emit('gem:press', opts.label));
    if (opts.onClick) root.addEventListener('click', opts.onClick as EventListener);
  }

  /** Fill the rim arc, 0–1. */
  setCharge(charge: number): this {
    this.opts.charge = Math.max(0, Math.min(1, charge));
    this.el.style.setProperty('--fui-gem-charge', String(this.opts.charge));
    return this;
  }

  /** Set or clear the badge. */
  setBadge(badge: number | string | null): this {
    if (badge == null || badge === 0 || badge === '') {
      this.badgeEl?.remove();
      this.badgeEl = null;
      return this;
    }
    if (!this.badgeEl) {
      this.badgeEl = h('span', { class: 'fui-gembtn__badge fui-num' });
      this.el.appendChild(this.badgeEl);
    }
    this.badgeEl.textContent = String(badge);
    return this;
  }

  /** Turn the breathing animation on or off. */
  setPulse(pulse: boolean): this {
    this.opts.pulse = pulse;
    this.el.dataset.pulse = pulse ? 'on' : 'off';
    return this;
  }
}
