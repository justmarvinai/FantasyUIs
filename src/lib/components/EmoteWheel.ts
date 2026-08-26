import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface Emote {
  id: string;
  /** What it says. */
  label: string;
  /** Glyph asset id for the wedge. */
  glyph?: string;
  /** Wedge colour. */
  color?: string;
  /** Squelched by the opponent — greyed and unpickable. */
  muted?: boolean;
}

export interface EmoteWheelOptions extends BaseOptions {
  /** The emotes, clockwise from the top. */
  emotes: Emote[];
  /** Diameter in pixels. */
  size?: number;
  /** Portrait in the hub. */
  art?: string;
  /** Milliseconds before the same emote can be sent again. */
  cooldown?: number;
  /** Start open. */
  open?: boolean;
  /** Squelch every emote — the opponent muted you. */
  squelched?: boolean;
}

/**
 * The emote wheel: six things you are allowed to say, arranged around your
 * portrait. It is how a card game gives players a voice without giving them a
 * chat box.
 *
 *   const wheel = new EmoteWheel({
 *     emotes: [{ id: 'greet', label: 'Greetings!', glyph: 'glyph-peace-dove' }, …],
 *     size: 220, cooldown: 4000, art: 'hero-emberknight',
 *   });
 *   wheel.on<Emote>('emote:send', (e) => net.emote(e.id));
 *
 * The cooldown is per-emote rather than global, which is exactly the rule that
 * makes spamming one emote impossible while leaving normal play unhampered — a
 * global cooldown punishes a player who says "greetings" then "thanks", and a
 * missing one is how "well played" becomes harassment.
 *
 * Wedges are laid out from their index, so five emotes and eight both fill the
 * circle evenly with no per-count stylesheet.
 */
export class EmoteWheel extends FuiComponent<EmoteWheelOptions> {
  private ring: HTMLElement;
  private lastSent = new Map<string, number>();
  private ticks = new Set<ReturnType<typeof setTimeout>>();

  constructor(opts: EmoteWheelOptions) {
    const root = h('div', {
      class: 'fui fui-emotewheel',
      dataset: { open: opts.open ? 'on' : 'off', squelched: opts.squelched ? 'on' : 'off' },
      style: {
        '--fui-emote-size': `${opts.size ?? 220}px`,
        ...(opts.art ? { '--fui-emote-art': `var(--fui-img-${opts.art})` } : {}),
      },
    });
    super(root, opts);

    this.ring = h('div', { class: 'fui-emotewheel__ring' });
    root.appendChild(this.ring);

    const hub = h('button', {
      class: 'fui-emotewheel__hub',
      attrs: { type: 'button', 'aria-expanded': String(!!opts.open), 'aria-label': 'Emotes' },
    });
    hub.addEventListener('click', () => this.toggle());
    root.appendChild(hub);

    this.build();
    this.onDestroy(() => {
      for (const t of this.ticks) clearTimeout(t);
      this.ticks.clear();
    });
  }

  /** Open or close the wheel. */
  toggle(): this {
    const open = this.el.dataset.open !== 'on';
    this.el.dataset.open = open ? 'on' : 'off';
    this.el.querySelector('.fui-emotewheel__hub')?.setAttribute('aria-expanded', String(open));
    this.emit(open ? 'emote:open' : 'emote:close');
    return this;
  }

  /** Send an emote, if it is not muted and not on cooldown. */
  send(id: string): boolean {
    const emote = this.opts.emotes.find((e) => e.id === id);
    if (!emote || emote.muted || this.opts.squelched) return false;
    // Per-emote, not global: a global cooldown punishes "greetings" then
    // "thanks", and no cooldown is how "well played" becomes harassment.
    const now = Date.now();
    const cooldown = this.opts.cooldown ?? 4000;
    if (now - (this.lastSent.get(id) ?? -Infinity) < cooldown) return false;

    this.lastSent.set(id, now);
    this.paintCooldown(id, true);
    const timer = setTimeout(() => {
      this.ticks.delete(timer);
      this.paintCooldown(id, false);
    }, cooldown);
    this.ticks.add(timer);

    this.el.dataset.open = 'off';
    this.emit('emote:send', emote);
    return true;
  }

  /** Squelch or unsquelch everything. */
  setSquelched(squelched: boolean): this {
    this.opts.squelched = squelched;
    this.el.dataset.squelched = squelched ? 'on' : 'off';
    return this;
  }

  private paintCooldown(id: string, cooling: boolean): void {
    const wedge = this.ring.querySelector<HTMLElement>(`[data-emote="${id}"]`);
    if (wedge) wedge.dataset.cooling = cooling ? 'on' : 'off';
  }

  private build(): void {
    clear(this.ring);
    const n = this.opts.emotes.length || 1;
    this.opts.emotes.forEach((emote, i) => {
      // Laid out from the index, so five emotes and eight both fill the circle
      // evenly with no per-count stylesheet.
      const angle = (i / n) * 360;
      // Which edge of the caption is pinned. A caption centred on its wedge is
      // wider than the wedge, so on the sides of the ring it reaches back over
      // its neighbours; anchoring it to the far edge makes it grow outward.
      const across = Math.sin((angle * Math.PI) / 180);
      const side = across > 0.35 ? 'right' : across < -0.35 ? 'left' : 'center';
      const wedge = h('button', {
        class: 'fui-emotewheel__wedge',
        dataset: {
          emote: emote.id,
          muted: emote.muted ? 'on' : 'off',
          cooling: 'off',
        },
        style: {
          '--fui-emote-a': `${angle}deg`,
          '--fui-emote-i': String(i),
          ...(emote.color ? { '--fui-emote-ink': emote.color } : {}),
          ...(emote.glyph ? { '--fui-emote-glyph': `var(--fui-img-${emote.glyph})` } : {}),
        },
        attrs: { type: 'button', 'aria-label': emote.label, title: emote.label },
      });
      wedge.appendChild(h('span', { class: 'fui-emotewheel__glyph', attrs: { 'aria-hidden': 'true' } }));
      wedge.appendChild(
        h('span', { class: 'fui-emotewheel__label', dataset: { side }, text: emote.label }),
      );
      wedge.addEventListener('click', () => this.send(emote.id));
      this.ring.appendChild(wedge);
    });
  }
}
