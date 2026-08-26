import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';
import { PlayingCard, type PlayingCardOptions } from './PlayingCard.ts';

export interface MulliganTrayOptions extends BaseOptions {
  /** The opening hand. */
  cards: PlayingCardOptions[];
  /** Indexes already marked for replacement. */
  replacing?: number[];
  /** Heading. */
  title?: string;
  /** Whether you are going second, which usually grants the Coin. */
  onThePlay?: boolean;
  /** Card width in pixels. */
  size?: number;
  /** Seconds before the mulligan locks in. */
  seconds?: number;
}

/**
 * The opening-hand mulligan: your first cards, each one keepable or replaceable,
 * and one button to lock it in.
 *
 *   const mull = new MulliganTray({
 *     title: 'Choose your opening hand', cards: opening, onThePlay: false, seconds: 30,
 *   });
 *   mull.on<number[]>('mulligan:confirm', (replacing) => game.mulligan(replacing));
 *
 * Toggling is per-card and reversible right up to the confirm, because a
 * mulligan is a *comparison* — you decide about the three-drop by looking at
 * whether you already kept a two-drop — and a UI that commits each card the
 * moment it is clicked makes that impossible.
 *
 * Cards marked for replacement stay visible with a cross over them rather than
 * being removed. Removing them collapses the layout and takes away the very
 * thing being compared against.
 */
export class MulliganTray extends FuiComponent<MulliganTrayOptions> {
  private tray: HTMLElement;
  private confirmEl: HTMLButtonElement;
  private clockEl: HTMLElement | null = null;
  private replacing = new Set<number>();
  private ticker: ReturnType<typeof setInterval> | null = null;
  private left = 0;

  constructor(opts: MulliganTrayOptions) {
    const root = h('div', {
      class: 'fui fui-mulligan',
      style: { '--fui-mull-size': `${opts.size ?? 170}px` },
      attrs: { role: 'group', 'aria-label': opts.title ?? 'Mulligan' },
    });
    super(root, opts);
    for (const i of opts.replacing ?? []) this.replacing.add(i);

    const head = h('div', { class: 'fui-mulligan__head' });
    head.appendChild(h('h3', { class: 'fui-mulligan__title', text: opts.title ?? 'Choose your opening hand' }));
    head.appendChild(
      h('p', {
        class: 'fui-mulligan__note',
        text: opts.onThePlay
          ? 'You are on the play — three cards.'
          : 'You are on the draw — four cards and the Coin.',
      }),
    );
    if (opts.seconds != null) {
      this.clockEl = h('span', { class: 'fui-mulligan__clock fui-num' });
      head.appendChild(this.clockEl);
    }
    root.appendChild(head);

    this.tray = h('div', { class: 'fui-mulligan__tray' });
    root.appendChild(this.tray);

    this.confirmEl = h('button', {
      class: 'fui-mulligan__confirm',
      attrs: { type: 'button' },
    });
    this.confirmEl.addEventListener('click', () => this.confirm());
    root.appendChild(this.confirmEl);

    this.build();

    if (opts.seconds != null) {
      this.left = opts.seconds;
      this.paintClock();
      this.ticker = setInterval(() => {
        this.left -= 1;
        this.paintClock();
        if (this.left <= 0) this.confirm();
      }, 1000);
      this.onDestroy(() => this.stopClock());
    }
  }

  /** Flip whether the card at `index` will be replaced. */
  toggle(index: number): this {
    if (this.replacing.has(index)) this.replacing.delete(index);
    else this.replacing.add(index);
    this.paint();
    this.emit('mulligan:toggle', { index, replacing: this.replacing.has(index) });
    return this;
  }

  /** Lock the mulligan in. */
  confirm(): this {
    this.stopClock();
    const list = [...this.replacing].sort((a, b) => a - b);
    this.el.dataset.done = 'on';
    this.confirmEl.disabled = true;
    this.emit('mulligan:confirm', list);
    return this;
  }

  /** Which cards are currently marked for replacement. */
  get marked(): number[] {
    return [...this.replacing].sort((a, b) => a - b);
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
    this.opts.cards.forEach((card, i) => {
      const slot = h('div', { class: 'fui-mulligan__slot', dataset: { replacing: 'off' } });
      const built = new PlayingCard({ ...card, width: this.opts.size ?? 170, playable: true });
      built.on('card:play', () => this.toggle(i));
      slot.appendChild(built.el);
      slot.appendChild(h('span', { class: 'fui-mulligan__cross', attrs: { 'aria-hidden': 'true' } }));
      slot.appendChild(h('span', { class: 'fui-mulligan__verdict' }));
      this.tray.appendChild(slot);
    });
    this.paint();
  }

  private paint(): void {
    Array.from(this.tray.children).forEach((child, i) => {
      const slot = child as HTMLElement;
      const off = this.replacing.has(i);
      slot.dataset.replacing = off ? 'on' : 'off';
      const verdict = slot.querySelector('.fui-mulligan__verdict');
      if (verdict) verdict.textContent = off ? 'Replace' : 'Keep';
    });
    const n = this.replacing.size;
    this.confirmEl.textContent =
      n === 0 ? 'Keep all' : n === 1 ? 'Replace 1 card' : `Replace ${n} cards`;
  }
}
