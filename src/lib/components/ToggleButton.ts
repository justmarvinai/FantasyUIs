import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface ToggleButtonOptions extends BaseOptions {
  /** Label when off. */
  label: string;
  /** Label when on. Defaults to the same text. */
  onLabel?: string;
  /** Glyph asset id when off. */
  glyph?: string;
  /** Glyph asset id when on — a crossed-out speaker, a lit flame. */
  onGlyph?: string;
  /** Start pressed. */
  pressed?: boolean;
  /** Shape. `square` is the compact HUD toggle, `wide` takes a label. */
  variant?: 'wide' | 'square';
  /** Size in pixels for the `square` variant. */
  size?: number;
  /** Colour when pressed. */
  tone?: 'accent' | 'gold' | 'success' | 'danger';
  /** Show a lit pip in the corner while on. */
  pip?: boolean;
  /** Greyed out and unpressable. */
  disabled?: boolean;
  /** Convenience shorthand for the change event. */
  onChange?: (pressed: boolean) => void;
}

/**
 * A button that stays pressed: auto-battle, mute, lock formation, show grid,
 * skip cutscenes. The theme ships both an idle and a lit plate, so the pressed
 * state is a different piece of artwork rather than a filter over the same one.
 *
 *   const auto = new ToggleButton({
 *     label: 'Auto', onLabel: 'Auto on', glyph: 'glyph-hourglass',
 *     variant: 'square', tone: 'gold', pip: true,
 *   });
 *   auto.on<boolean>('toggle:change', (on) => battle.setAuto(on));
 *
 * `Toggle` is the settings-row switch, with a track and a knob; this is a
 * *button* that happens to latch, for the places a switch would be wrong — a
 * combat HUD, a toolbar, a filter row. It carries `aria-pressed` rather than a
 * checkbox role, which is the difference a screen reader needs to describe it
 * as an action that is currently on rather than as a setting.
 */
export class ToggleButton extends FuiComponent<ToggleButtonOptions> {
  private labelEl: HTMLElement | null = null;
  private glyphEl: HTMLElement | null = null;

  constructor(opts: ToggleButtonOptions) {
    const root = h('button', {
      class: 'fui fui-togglebtn',
      dataset: {
        variant: opts.variant ?? 'wide',
        tone: opts.tone ?? 'accent',
        pressed: opts.pressed ? 'on' : 'off',
      },
      style: { '--fui-toggle-size': `${opts.size ?? 52}px` },
      attrs: {
        type: 'button',
        disabled: opts.disabled,
        'aria-pressed': String(!!opts.pressed),
        'aria-label': opts.label,
        title: opts.label,
      },
    });
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-togglebtn__art', attrs: { 'aria-hidden': 'true' } }));

    const face = h('span', { class: 'fui-togglebtn__face' });
    if (opts.glyph || opts.onGlyph) {
      this.glyphEl = h('span', { class: 'fui-togglebtn__glyph' });
      face.appendChild(this.glyphEl);
    }
    // A square toggle with a glyph is glyph-only; a square toggle *without* one
    // still needs its text, because "×2" on a speed button is exactly the case
    // where a square button carries a label rather than a symbol.
    if ((opts.variant ?? 'wide') === 'wide' || !opts.glyph) {
      this.labelEl = h('span', { class: 'fui-togglebtn__label', text: opts.label });
      face.appendChild(this.labelEl);
    }
    root.appendChild(face);

    if (opts.pip) root.appendChild(h('span', { class: 'fui-togglebtn__pip', attrs: { 'aria-hidden': 'true' } }));

    root.addEventListener('click', () => this.toggle());
    this.paint();
  }

  /** Flip it. */
  toggle(): this {
    return this.set(!this.opts.pressed);
  }

  /** Set the state. Emits `toggle:change` only when it actually changes. */
  set(pressed: boolean): this {
    if (pressed === !!this.opts.pressed) return this;
    this.opts.pressed = pressed;
    this.paint();
    this.emit('toggle:change', pressed);
    this.opts.onChange?.(pressed);
    return this;
  }

  /** Whether it is currently pressed. */
  get value(): boolean {
    return !!this.opts.pressed;
  }

  private paint(): void {
    const on = !!this.opts.pressed;
    const o = this.opts;
    this.el.dataset.pressed = on ? 'on' : 'off';
    this.el.setAttribute('aria-pressed', String(on));

    const label = on ? (o.onLabel ?? o.label) : o.label;
    if (this.labelEl) this.labelEl.textContent = label;
    this.el.setAttribute('aria-label', label);
    this.el.setAttribute('title', label);

    const glyph = on ? (o.onGlyph ?? o.glyph) : o.glyph;
    if (this.glyphEl) {
      if (glyph) this.glyphEl.style.setProperty('--fui-toggle-glyph', `var(--fui-img-${glyph})`);
      else this.glyphEl.style.removeProperty('--fui-toggle-glyph');
    }
  }
}
