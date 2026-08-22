import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp } from '../core/dom.ts';

export interface MixerChannel {
  id: string;
  label: string;
  /** Level, 0–1. */
  value?: number;
  /** Silenced without losing the level. */
  muted?: boolean;
  /** Glyph asset id for the channel. */
  glyph?: string;
  /** Channel colour. */
  color?: string;
  /** Line under the name. */
  note?: string;
}

export interface VolumeMixerOptions extends BaseOptions {
  /** One row (or fader) per audio channel. */
  channels: MixerChannel[];
  /** Heading over the mixer. */
  title?: string;
  /** A master fader that scales every channel. */
  master?: { value?: number; muted?: boolean; label?: string };
  /** `rows` is a settings list; `faders` is a vertical mixing desk. */
  variant?: 'rows' | 'faders';
  /** Print each level as a percentage. */
  showValues?: boolean;
  /** Height of the faders in pixels. `faders` only. */
  height?: number;
}

/**
 * The audio page every settings screen needs: music, effects, voice, ambience,
 * each with its own level and mute, under one master.
 *
 *   const mixer = new VolumeMixer({
 *     title: 'Audio', showValues: true, master: { value: 0.8 },
 *     channels: [
 *       { id: 'music', label: 'Music', value: 0.6, glyph: 'glyph-magic-feather' },
 *       { id: 'sfx', label: 'Effects', value: 0.9, glyph: 'glyph-sword-clash' },
 *       { id: 'voice', label: 'Voice', value: 0.75, muted: true },
 *     ],
 *   });
 *   mixer.on<{ id: string; effective: number }>('mix:change', (c) => audio.set(c.id, c.effective));
 *
 * A muted channel keeps its level, so unmuting returns you to where you were
 * rather than to zero — the thing a mute that just sets the slider to 0 gets
 * wrong. `effective()` folds the master in, so what a game reads is what the
 * player will hear, and the master is never applied twice.
 */
export class VolumeMixer extends FuiComponent<VolumeMixerOptions> {
  private list: HTMLElement;

  constructor(opts: VolumeMixerOptions) {
    const root = h('div', {
      class: 'fui fui-mixer',
      dataset: { variant: opts.variant ?? 'rows' },
      style: { '--fui-mixer-h': `${opts.height ?? 130}px` },
    });
    super(root, opts);

    if (opts.title) {
      root.appendChild(h('span', { class: 'fui-mixer__title fui-title', text: opts.title }));
    }

    this.list = h('div', { class: 'fui-mixer__list' });
    root.appendChild(this.list);
    this.render();
  }

  /** A channel's level after the master and both mutes are applied, 0–1. */
  effective(id: string): number {
    const channel = this.opts.channels.find((c) => c.id === id);
    if (!channel || channel.muted) return 0;
    const master = this.opts.master;
    if (master?.muted) return 0;
    return clamp(channel.value ?? 1, 0, 1) * clamp(master?.value ?? 1, 0, 1);
  }

  /** Every channel's effective level, ready to hand to an audio engine. */
  levels(): Record<string, number> {
    return Object.fromEntries(this.opts.channels.map((c) => [c.id, this.effective(c.id)]));
  }

  /** Set one channel's level, or the master with `'master'`. */
  set(id: string, value: number): this {
    const level = clamp(value, 0, 1);
    if (id === 'master') {
      this.opts.master = { ...(this.opts.master ?? {}), value: level };
    } else {
      const channel = this.opts.channels.find((c) => c.id === id);
      if (!channel) return this;
      channel.value = level;
    }
    this.render();
    this.emit('mix:change', { id, value: level, effective: this.effective(id) });
    return this;
  }

  /** Silence or restore a channel without touching its level. */
  toggleMute(id: string): this {
    if (id === 'master') {
      const master = (this.opts.master ??= {});
      master.muted = !master.muted;
    } else {
      const channel = this.opts.channels.find((c) => c.id === id);
      if (!channel) return this;
      channel.muted = !channel.muted;
    }
    this.render();
    this.emit('mix:mute', { id, levels: this.levels() });
    return this;
  }

  private render(): void {
    clear(this.list);
    if (this.opts.master) {
      this.list.appendChild(
        this.buildChannel(
          {
            id: 'master',
            label: this.opts.master.label ?? 'Master',
            value: this.opts.master.value,
            muted: this.opts.master.muted,
          },
          true,
        ),
      );
    }
    for (const channel of this.opts.channels) {
      this.list.appendChild(this.buildChannel(channel, false));
    }
  }

  private buildChannel(channel: MixerChannel, master: boolean): HTMLElement {
    const level = clamp(channel.value ?? 1, 0, 1);
    // The master's own mute silences everything under it, so a channel shows as
    // silenced when either switch is off.
    const silenced = !!channel.muted || (!master && !!this.opts.master?.muted);
    const row = h('div', {
      class: 'fui-mixer__channel',
      dataset: { master: String(master), muted: String(silenced) },
      style: {
        '--fui-mixer-p': level.toFixed(4),
        ...(channel.color ? { '--fui-mixer-ink': channel.color } : {}),
      },
    });

    const head = h('div', { class: 'fui-mixer__head' });
    const mute = h('button', {
      class: 'fui-mixer__mute',
      attrs: {
        type: 'button',
        role: 'switch',
        'aria-checked': String(!channel.muted),
        'aria-label': `${channel.label} on`,
        title: channel.muted ? 'Unmute' : 'Mute',
      },
    });
    if (channel.glyph) {
      mute.appendChild(
        h('span', {
          class: 'fui-mixer__glyph',
          style: { '--fui-glyph-src': `var(--fui-img-${channel.glyph})` },
        }),
      );
    }
    mute.addEventListener('click', () => this.toggleMute(channel.id));
    head.appendChild(mute);

    const names = h('div', { class: 'fui-mixer__names' });
    names.appendChild(h('span', { class: 'fui-mixer__name', text: channel.label }));
    if (channel.note) {
      names.appendChild(h('span', { class: 'fui-mixer__note', text: channel.note }));
    }
    head.appendChild(names);

    if (this.opts.showValues) {
      head.appendChild(
        h('span', {
          class: 'fui-mixer__value fui-num',
          text: channel.muted ? 'Muted' : `${Math.round(level * 100)}%`,
        }),
      );
    }
    row.appendChild(head);

    // A real range input: keyboard, screen readers and touch all work for free,
    // and the visible track is painted from its value through a variable.
    const input = h('input', {
      class: 'fui-mixer__input',
      attrs: {
        type: 'range',
        min: '0',
        max: '100',
        value: String(Math.round(level * 100)),
        'aria-label': `${channel.label} level`,
      },
    });
    input.addEventListener('input', () => this.set(channel.id, Number(input.value) / 100));
    const track = h('div', { class: 'fui-mixer__track' }, input);
    track.appendChild(h('span', { class: 'fui-mixer__fill', attrs: { 'aria-hidden': 'true' } }));
    row.appendChild(track);
    return row;
  }
}
