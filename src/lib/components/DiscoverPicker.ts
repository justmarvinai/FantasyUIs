import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';
import { PlayingCard, type PlayingCardOptions } from './PlayingCard.ts';

export interface DiscoverPickerOptions extends BaseOptions {
  /** The cards on offer, usually three. */
  choices: PlayingCardOptions[];
  /** Heading, e.g. `'Discover a spell'`. */
  title?: string;
  /** Line under it — where the cards come from. */
  note?: string;
  /** Card width in pixels. */
  size?: number;
  /** Seconds before the game picks for you. Omit for no clock. */
  seconds?: number;
  /** Dim the board behind it. */
  dim?: boolean;
}

/**
 * The Discover choice: three cards on a lit stage, pick one, the rest burn away.
 * It is the single most recognisable interaction in the genre.
 *
 *   const pick = new DiscoverPicker({
 *     title: 'Discover a spell', note: 'From your class', choices: three, seconds: 20,
 *   });
 *   stage.appendChild(pick.el);
 *   pick.on<{ index: number; card: PlayingCardOptions }>('discover:pick', ({ card }) => hand.draw(card));
 *
 * The timeout picks *for* the player rather than cancelling, because a Discover
 * that expires into nothing loses a card and there is no rule in any game in the
 * genre that does that. It picks at random, announces which through the same
 * `discover:pick` event, and marks the choice as automatic in the payload so a
 * caller can log it differently.
 *
 * The unchosen cards animate away rather than vanishing, which is what makes the
 * choice feel spent — and it is the moment players screenshot, so it is worth
 * the two keyframes.
 */
export class DiscoverPicker extends FuiComponent<DiscoverPickerOptions> {
  private tray: HTMLElement;
  private clockEl: HTMLElement | null = null;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private left = 0;
  private done = false;

  constructor(opts: DiscoverPickerOptions) {
    const root = h('div', {
      class: 'fui fui-discover',
      dataset: { dim: opts.dim === false ? 'off' : 'on' },
      style: { '--fui-discover-size': `${opts.size ?? 190}px` },
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title ?? 'Discover' },
    });
    super(root, opts);

    const head = h('div', { class: 'fui-discover__head' });
    head.appendChild(h('h3', { class: 'fui-discover__title', text: opts.title ?? 'Discover a card' }));
    if (opts.note) head.appendChild(h('p', { class: 'fui-discover__note', text: opts.note }));
    if (opts.seconds != null) {
      this.clockEl = h('span', { class: 'fui-discover__clock fui-num' });
      head.appendChild(this.clockEl);
    }
    root.appendChild(head);

    this.tray = h('div', { class: 'fui-discover__tray' });
    root.appendChild(this.tray);

    this.build();

    if (opts.seconds != null) {
      this.left = opts.seconds;
      this.paintClock();
      this.ticker = setInterval(() => {
        this.left -= 1;
        this.paintClock();
        // Picks *for* the player rather than cancelling: a Discover that
        // expires into nothing loses a card, and no game in the genre does that.
        if (this.left <= 0) this.pick(Math.floor(Math.random() * this.opts.choices.length), true);
      }, 1000);
      this.onDestroy(() => this.stopClock());
    }
  }

  /** Choose one. The rest burn away. */
  pick(index: number, automatic = false): this {
    if (this.done) return this;
    const card = this.opts.choices[index];
    if (!card) return this;
    this.done = true;
    this.stopClock();

    Array.from(this.tray.children).forEach((child, i) => {
      (child as HTMLElement).dataset.picked = i === index ? 'on' : 'off';
    });
    this.el.dataset.done = 'on';
    this.emit('discover:pick', { index, card, automatic });
    return this;
  }

  private stopClock(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }

  private paintClock(): void {
    if (!this.clockEl) return;
    this.clockEl.textContent = `${Math.max(0, this.left)}s`;
    this.clockEl.dataset.urgent = this.left <= 5 ? 'on' : 'off';
  }

  private build(): void {
    clear(this.tray);
    this.opts.choices.forEach((choice, i) => {
      const slot = h('div', {
        class: 'fui-discover__slot',
        dataset: { picked: 'none' },
        style: { '--fui-discover-i': String(i) },
      });
      const card = new PlayingCard({ ...choice, width: this.opts.size ?? 190, playable: true });
      card.on('card:play', () => this.pick(i));
      slot.appendChild(card.el);
      this.tray.appendChild(slot);
    });
  }
}
