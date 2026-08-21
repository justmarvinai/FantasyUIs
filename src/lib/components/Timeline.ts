import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, append, type Child } from '../core/dom.ts';

export type TimelineState = 'done' | 'current' | 'future' | 'failed';

export interface TimelineEvent {
  /** Heading for this entry. */
  title: string;
  /** Body text. */
  text?: string;
  /** Left-hand stamp — a date, a turn number, a chapter. */
  when?: string;
  /** Glyph asset id drawn in the node. */
  glyph?: string;
  /** Manifest asset id for a thumbnail beside the text. */
  art?: string;
  state?: TimelineState;
  /** Accent colour for this entry's node and rail segment. */
  color?: string;
  /** Anything extra under the text — a button, a reward row. */
  extra?: Child | Child[];
}

export interface TimelineOptions extends BaseOptions {
  /** The beats, in the order they happen. */
  events: TimelineEvent[];
  /** `vertical` stacks down the page; `horizontal` runs across it. */
  orientation?: 'vertical' | 'horizontal';
  /** Reserve a column for the `when` stamps. Vertical only. */
  stamps?: boolean;
  /** Tighter spacing and smaller nodes. */
  compact?: boolean;
}

/**
 * An ordered run of events on a rail — a story chapter list, a season's
 * milestones, a champion's ascension history, a raid's phase plan.
 *
 *   new Timeline({
 *     stamps: true,
 *     events: [
 *       { when: 'Ch. I', title: 'Ashfall Gate', text: 'The gate falls.', state: 'done' },
 *       { when: 'Ch. II', title: 'Sunken Road', state: 'current', glyph: 'glyph-crossed-swords' },
 *       { when: 'Ch. III', title: 'The Maw', state: 'future' },
 *     ],
 *   });
 *
 * The rail is drawn by each entry rather than as one element behind them, so a
 * segment can be coloured by the state of the entry *below* it — which is what
 * makes "you got this far" readable without a second pass over the data.
 */
export class Timeline extends FuiComponent<TimelineOptions> {
  private list: HTMLElement;

  constructor(opts: TimelineOptions) {
    const root = h('div', {
      class: 'fui fui-timeline',
      dataset: { orientation: opts.orientation ?? 'vertical' },
    });
    if (opts.compact) root.classList.add('fui-timeline--compact');
    if (opts.stamps) root.classList.add('fui-timeline--stamps');
    super(root, opts);

    this.list = h('ol', { class: 'fui-timeline__list' });
    root.appendChild(this.list);
    this.setEvents(opts.events);
  }

  /** Replace the events and redraw. */
  setEvents(events: TimelineEvent[]): this {
    this.opts.events = events;
    clear(this.list);

    events.forEach((ev, i) => {
      const state = ev.state ?? 'future';
      const item = h('li', {
        class: 'fui-timeline__item',
        dataset: { state },
        style: ev.color ? { '--fui-tl-ink': ev.color } : {},
      });
      if (i === events.length - 1) item.classList.add('is-last');

      if (this.opts.stamps) {
        item.appendChild(h('span', { class: 'fui-timeline__when', text: ev.when ?? '' }));
      }

      const node = h('span', { class: 'fui-timeline__node', attrs: { 'aria-hidden': 'true' } });
      if (ev.glyph) node.style.setProperty('--fui-glyph-src', `var(--fui-img-${ev.glyph})`);
      item.appendChild(node);

      const body = h('div', { class: 'fui-timeline__body' });
      const head = h('div', { class: 'fui-timeline__head' });
      if (ev.art) {
        head.appendChild(
          h('span', {
            class: 'fui-timeline__art',
            style: { backgroundImage: `var(--fui-img-${ev.art})` },
          }),
        );
      }
      const titles = h('div', { class: 'fui-timeline__titles' });
      titles.appendChild(h('span', { class: 'fui-timeline__title', text: ev.title }));
      if (!this.opts.stamps && ev.when) {
        titles.appendChild(h('span', { class: 'fui-timeline__stamp', text: ev.when }));
      }
      head.appendChild(titles);
      body.appendChild(head);

      if (ev.text) body.appendChild(h('p', { class: 'fui-timeline__text fui-body', text: ev.text }));
      if (ev.extra) {
        const extra = h('div', { class: 'fui-timeline__extra' });
        append(extra, ...(Array.isArray(ev.extra) ? ev.extra : [ev.extra]));
        body.appendChild(extra);
      }
      item.appendChild(body);
      this.list.appendChild(item);
    });
    return this;
  }

  /** Move one entry to a new state, e.g. when a chapter is cleared. */
  setState(index: number, state: TimelineState): this {
    const item = this.list.children[index] as HTMLElement | undefined;
    if (item) item.dataset.state = state;
    const ev = this.opts.events[index];
    if (ev) ev.state = state;
    return this;
  }
}
