import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface RadialItem {
  id: string;
  label: string;
  icon: string;
  disabled?: boolean;
  /** Stack / charge count shown on the wedge. */
  count?: number;
}

export interface RadialMenuOptions extends BaseOptions {
  items: RadialItem[];
  /** Outer diameter in px. */
  size?: number;
  /** Hole in the middle, as a fraction of the radius. Default 0.38. */
  hole?: number;
  /** Text shown in the centre when nothing is hovered. */
  centerLabel?: string;
}

/**
 * The radial quick-select wheel — emotes, consumables, weapon swaps, build
 * menus. Works with mouse and touch, and pairs well with a hold-to-open key.
 *
 * Emits `radial:select` with the chosen item and `radial:hover` as the pointer
 * sweeps between wedges.
 *
 *   const wheel = new RadialMenu({ items: [
 *     { id: 'potion', label: 'Potion', icon: 'icon-potion', count: 4 },
 *     { id: 'sword',  label: 'Sword',  icon: 'icon-sword' },
 *   ]});
 *   wheel.open();
 */
export class RadialMenu extends FuiComponent<RadialMenuOptions> {
  private centerEl: HTMLElement;
  private ringEl: HTMLElement;

  constructor(opts: RadialMenuOptions) {
    const size = opts.size ?? 260;
    const root = h('div', {
      class: 'fui fui-radial',
      style: { width: `${size}px`, height: `${size}px`, '--fui-radial-hole': String(opts.hole ?? 0.38) },
    });
    super(root, opts);

    this.ringEl = h('div', { class: 'fui-radial__ring' });
    root.appendChild(this.ringEl);

    this.centerEl = h('div', {
      class: 'fui-radial__center',
      text: opts.centerLabel ?? '',
    });
    root.appendChild(this.centerEl);

    this.render();
  }

  private render(): void {
    clear(this.ringEl);
    const items = this.opts.items;
    const n = Math.max(1, items.length);
    const step = 360 / n;
    const radius = 0.5 + (1 - (this.opts.hole ?? 0.38)) * 0.25;

    items.forEach((item, i) => {
      // Wedges start at 12 o'clock and run clockwise.
      const angle = i * step - 90 + step / 2;
      const rad = (angle * Math.PI) / 180;

      const wedge = h('button', {
        class: 'fui-radial__item',
        attrs: { type: 'button', disabled: item.disabled, title: item.label },
        style: {
          left: `${50 + Math.cos(rad) * radius * 100 * 0.72}%`,
          top: `${50 + Math.sin(rad) * radius * 100 * 0.72}%`,
        },
      });
      wedge.appendChild(
        h('span', {
          class: 'fui-radial__icon',
          style: { backgroundImage: `var(--fui-img-${item.icon})` },
        }),
      );
      if (item.count != null) {
        wedge.appendChild(h('span', { class: 'fui-radial__count fui-num', text: String(item.count) }));
      }

      wedge.addEventListener('mouseenter', () => {
        this.centerEl.textContent = item.label;
        this.emit('radial:hover', item);
      });
      wedge.addEventListener('mouseleave', () => {
        this.centerEl.textContent = this.opts.centerLabel ?? '';
      });
      wedge.addEventListener('click', () => {
        if (item.disabled) return;
        this.emit('radial:select', item);
        this.close();
      });
      this.ringEl.appendChild(wedge);
    });
  }

  setItems(items: RadialItem[]): this {
    this.opts.items = items;
    this.render();
    return this;
  }

  open(): this {
    this.el.classList.add('is-open');
    return this;
  }

  close(): this {
    this.el.classList.remove('is-open');
    return this;
  }

  toggle(): this {
    this.el.classList.toggle('is-open');
    return this;
  }

  /** Hold a key to open the wheel, release to close it. */
  bindHold(key: string): () => void {
    const d = this.el.ownerDocument;
    const down = (ev: KeyboardEvent) => {
      if (ev.key === key && !ev.repeat) this.open();
    };
    const up = (ev: KeyboardEvent) => {
      if (ev.key === key) this.close();
    };
    d.addEventListener('keydown', down);
    d.addEventListener('keyup', up);
    const off = () => {
      d.removeEventListener('keydown', down);
      d.removeEventListener('keyup', up);
    };
    this.onDestroy(off);
    return off;
  }
}
