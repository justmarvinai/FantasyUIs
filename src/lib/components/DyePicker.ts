import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface Dye {
  id: string;
  /** What the dye is called in the shop. */
  name?: string;
  /** The colour it lays down. */
  color: string;
  /** Second colour, for a two-tone or metallic dye. */
  color2?: string;
  /** Not unlocked yet. */
  locked?: boolean;
  /** How many pots the player holds. `0` reads as out of stock. */
  owned?: number;
  /** Premium dyes get the marker that says this one costs money. */
  premium?: boolean;
}

export interface DyeChannel {
  id: string;
  /** Which part of the armour this channel paints. */
  label: string;
  /** Currently applied dye id. */
  dye?: string;
}

export interface DyePickerOptions extends BaseOptions {
  /** The palette on offer. */
  dyes: Dye[];
  /** The parts that can be dyed. Omit for a single-channel picker. */
  channels?: DyeChannel[];
  /** Heading over the picker. */
  title?: string;
  /** Selected dye when there are no channels. */
  value?: string;
  /** Swatch size in pixels. */
  size?: number;
  /** Columns in the swatch grid. */
  columns?: number;
  /** Offer a free-colour input alongside the palette. */
  custom?: boolean;
  /** Cost line under the palette, e.g. "2,400 gold per channel". */
  cost?: string;
  /** Label on the apply button. Omit for a picker with no commit step. */
  action?: string;
}

/**
 * The dye station: a palette, the armour channels it paints, and a preview of
 * what is currently on each one.
 *
 *   const dye = new DyePicker({
 *     title: 'Dye station', custom: true, action: 'Apply', cost: '2,400 gold per channel',
 *     channels: [{ id: 'primary', label: 'Plate', dye: 'ash' }, { id: 'trim', label: 'Trim' }],
 *     dyes: [
 *       { id: 'ash', name: 'Ashen Grey', color: '#6d6a63', owned: 4 },
 *       { id: 'ember', name: 'Emberheart', color: '#c9502a', color2: '#f2a33c', premium: true },
 *     ],
 *   });
 *   dye.on<{ channel: string; dye: string }>('dye:pick', (d) => preview(d));
 *
 * The palette is one grid whatever the channel count: picking paints the
 * *selected* channel, so a player never hunts for a second swatch board. A dye
 * the player does not own is shown rather than hidden — you cannot want what
 * you cannot see, and that is the entire commercial point of a dye station.
 */
export class DyePicker extends FuiComponent<DyePickerOptions> {
  private channel: string | null;
  private swatches: HTMLElement;
  private tabs: HTMLElement | null = null;
  private applyBtn: HTMLButtonElement | null = null;

  constructor(opts: DyePickerOptions) {
    const root = h('div', {
      class: 'fui fui-dye',
      style: {
        '--fui-dye-size': `${opts.size ?? 30}px`,
        '--fui-dye-cols': String(opts.columns ?? 8),
      },
    });
    super(root, opts);
    this.channel = opts.channels?.[0]?.id ?? null;

    if (opts.title) {
      root.appendChild(h('span', { class: 'fui-dye__title fui-title', text: opts.title }));
    }

    if (opts.channels?.length) {
      this.tabs = h('div', { class: 'fui-dye__channels', attrs: { role: 'tablist' } });
      root.appendChild(this.tabs);
      this.paintChannels();
    }

    this.swatches = h('div', { class: 'fui-dye__swatches', attrs: { role: 'radiogroup' } });
    root.appendChild(this.swatches);

    if (opts.custom) {
      const wrap = h('label', { class: 'fui-dye__custom' });
      const input = h('input', {
        class: 'fui-dye__input',
        attrs: { type: 'color', value: this.currentColor() ?? '#8b8578' },
      });
      input.addEventListener('input', () => this.pickCustom(input.value));
      wrap.append(input, h('span', { class: 'fui-dye__custom-label', text: 'Custom colour' }));
      root.appendChild(wrap);
    }

    if (opts.cost) {
      root.appendChild(h('p', { class: 'fui-dye__cost fui-num', text: opts.cost }));
    }

    if (opts.action) {
      this.applyBtn = h('button', {
        class: 'fui-dye__apply',
        text: opts.action,
        attrs: { type: 'button' },
      });
      this.applyBtn.addEventListener('click', () => this.emit('dye:apply', this.value()));
      root.appendChild(this.applyBtn);
    }

    this.paintSwatches();
  }

  /** What each channel is currently painted, or the single selection. */
  value(): Record<string, string | undefined> {
    if (this.opts.channels?.length) {
      return Object.fromEntries(this.opts.channels.map((c) => [c.id, c.dye]));
    }
    return { value: this.opts.value };
  }

  /** Which channel the palette is painting. */
  activeChannel(): string | null {
    return this.channel;
  }

  /** Point the palette at a different channel. */
  selectChannel(id: string): this {
    if (!this.opts.channels?.some((c) => c.id === id)) return this;
    this.channel = id;
    this.paintChannels();
    this.paintSwatches();
    this.emit('dye:channel', id);
    return this;
  }

  /** Paint the active channel (or the whole picker) with a dye. */
  pick(dyeId: string): this {
    const dye = this.opts.dyes.find((d) => d.id === dyeId);
    if (!dye || dye.locked) return this;
    if (this.channel && this.opts.channels) {
      const ch = this.opts.channels.find((c) => c.id === this.channel);
      if (ch) ch.dye = dyeId;
    } else {
      this.opts.value = dyeId;
    }
    this.paintChannels();
    this.paintSwatches();
    this.emit('dye:pick', { channel: this.channel ?? 'value', dye: dyeId, color: dye.color });
    return this;
  }

  private pickCustom(color: string): void {
    // A custom colour is a dye like any other, so it joins the palette rather
    // than living in a parallel piece of state the rest of the class ignores.
    const existing = this.opts.dyes.find((d) => d.id === 'custom');
    if (existing) existing.color = color;
    else this.opts.dyes = [...this.opts.dyes, { id: 'custom', name: 'Custom', color }];
    this.pick('custom');
  }

  private currentColor(): string | undefined {
    const id = this.channel
      ? this.opts.channels?.find((c) => c.id === this.channel)?.dye
      : this.opts.value;
    return this.opts.dyes.find((d) => d.id === id)?.color;
  }

  private paintChannels(): void {
    if (!this.tabs || !this.opts.channels) return;
    clear(this.tabs);
    for (const ch of this.opts.channels) {
      const dye = this.opts.dyes.find((d) => d.id === ch.dye);
      const tab = h('button', {
        class: 'fui-dye__channel',
        attrs: {
          type: 'button',
          role: 'tab',
          'aria-selected': String(ch.id === this.channel),
        },
      });
      if (ch.id === this.channel) tab.classList.add('is-on');
      tab.appendChild(
        h('span', {
          class: 'fui-dye__chip',
          style: dye ? { '--fui-dye-a': dye.color, '--fui-dye-b': dye.color2 ?? dye.color } : {},
          dataset: { empty: String(!dye) },
        }),
      );
      tab.appendChild(h('span', { class: 'fui-dye__channel-label', text: ch.label }));
      tab.addEventListener('click', () => this.selectChannel(ch.id));
      this.tabs.appendChild(tab);
    }
  }

  private paintSwatches(): void {
    clear(this.swatches);
    const activeId = this.channel
      ? this.opts.channels?.find((c) => c.id === this.channel)?.dye
      : this.opts.value;

    for (const dye of this.opts.dyes) {
      const out = dye.owned === 0;
      const btn = h('button', {
        class: 'fui-dye__swatch',
        style: { '--fui-dye-a': dye.color, '--fui-dye-b': dye.color2 ?? dye.color },
        attrs: {
          type: 'button',
          role: 'radio',
          'aria-checked': String(dye.id === activeId),
          'aria-label': dye.name ?? dye.id,
          title: dye.name ?? dye.id,
          disabled: dye.locked || undefined,
        },
      });
      if (dye.id === activeId) btn.classList.add('is-on');
      if (dye.locked) btn.classList.add('is-locked');
      if (out) btn.classList.add('is-out');
      if (dye.premium) btn.classList.add('is-premium');
      if (dye.owned != null && dye.owned > 0) {
        btn.appendChild(h('span', { class: 'fui-dye__owned fui-num', text: String(dye.owned) }));
      }
      btn.addEventListener('click', () => this.pick(dye.id));
      this.swatches.appendChild(btn);
    }
  }
}
