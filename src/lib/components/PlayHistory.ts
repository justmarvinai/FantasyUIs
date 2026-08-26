import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface HistoryEntry {
  /** Card name. */
  name: string;
  /** Manifest asset id for the thumbnail. */
  art?: string;
  /** Mana cost, shown on the pip. */
  cost?: number;
  /** Who played it. */
  side?: 'friendly' | 'enemy';
  /** What happened. */
  kind?: 'played' | 'drawn' | 'died' | 'triggered' | 'discarded';
  /** Turn number. */
  turn?: number;
}

export interface PlayHistoryOptions extends BaseOptions {
  /** The log, oldest first. */
  entries: HistoryEntry[];
  /** How many rows to keep. */
  max?: number;
  /** Thumbnail size in pixels. */
  size?: number;
  /** Which edge the strip hangs from. */
  align?: 'left' | 'right';
  /** Heading. */
  title?: string;
}

/**
 * The play history: the strip of cards played, drawn and killed this game,
 * newest at the bottom. It is how a player reconstructs what just happened
 * during a long enemy turn, and how they answer "what killed me".
 *
 *   const history = new PlayHistory({ entries: [], max: 12, align: 'left', title: 'This game' });
 *   game.on('cardPlayed', (e) => history.push({ name: e.name, art: e.art, cost: e.cost, side: e.side, kind: 'played', turn: e.turn }));
 *
 * Entries are thumbnails rather than text, because a card game's log is read at
 * a glance mid-turn and a name is slower to recognise than art you have seen a
 * hundred times. The kind is a coloured edge rather than a word, for the same
 * reason — five states, five colours, no reading.
 *
 * New entries arrive at the bottom and the strip scrolls itself, so the newest
 * is always where the eye already is.
 */
export class PlayHistory extends FuiComponent<PlayHistoryOptions> {
  private list: HTMLElement;

  constructor(opts: PlayHistoryOptions) {
    const root = h('div', {
      class: 'fui fui-playhistory',
      dataset: { align: opts.align ?? 'left' },
      style: { '--fui-hist-size': `${opts.size ?? 40}px` },
      attrs: { role: 'log', 'aria-label': opts.title ?? 'Play history' },
    });
    super(root, opts);

    if (opts.title) root.appendChild(h('span', { class: 'fui-playhistory__title', text: opts.title }));

    this.list = h('div', { class: 'fui-playhistory__list' });
    root.appendChild(this.list);

    this.build();
  }

  /** Add an entry at the bottom and scroll to it. */
  push(entry: HistoryEntry): this {
    this.opts.entries = [...this.opts.entries, entry];
    const max = this.opts.max ?? 12;
    if (this.opts.entries.length > max) this.opts.entries = this.opts.entries.slice(-max);
    this.build();
    (this.list.lastElementChild as HTMLElement | null)?.classList.add('is-new');
    // The newest is always where the eye already is.
    this.list.scrollTop = this.list.scrollHeight;
    this.emit('history:push', entry);
    return this;
  }

  /** Empty the log — a new game. */
  reset(): this {
    this.opts.entries = [];
    this.build();
    return this;
  }

  private build(): void {
    clear(this.list);
    for (const entry of this.opts.entries) {
      const row = h('div', {
        class: 'fui-playhistory__row',
        dataset: { side: entry.side ?? 'friendly', kind: entry.kind ?? 'played' },
        attrs: {
          title: `${entry.name}${entry.turn != null ? ` — turn ${entry.turn}` : ''}`,
        },
      });
      row.appendChild(
        h('span', {
          class: 'fui-playhistory__thumb',
          style: entry.art ? { '--fui-hist-art': `var(--fui-img-${entry.art})` } : undefined,
        }),
      );
      if (entry.cost != null) {
        row.appendChild(h('span', { class: 'fui-playhistory__cost fui-num', text: String(entry.cost) }));
      }
      row.appendChild(h('span', { class: 'fui-playhistory__name', text: entry.name }));
      this.list.appendChild(row);
    }
    this.el.dataset.empty = this.opts.entries.length ? 'off' : 'on';
  }
}
