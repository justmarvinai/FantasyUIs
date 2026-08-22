import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, duration } from '../core/dom.ts';

export interface CalendarEvent {
  id: string;
  label: string;
  /** First day it runs, 1-based within the month. */
  from: number;
  /** Last day. Same as `from` for a one-day event. */
  to?: number;
  /** Event colour. */
  color?: string;
  /** Glyph asset id shown on the strip. */
  glyph?: string;
  /** What it is — drives the default colour when none is given. */
  kind?: 'banner' | 'raid' | 'sale' | 'login' | 'maintenance' | 'season';
  /** Seconds until it starts or ends, for the "now" readout. */
  endsIn?: number;
  /** Already running. */
  live?: boolean;
}

export interface EventCalendarOptions extends BaseOptions {
  /** Days in the month being shown. */
  days: number;
  /** Everything scheduled this month. */
  events: CalendarEvent[];
  /** Month name printed over the grid. */
  month?: string;
  /** Which weekday the first day falls on, 0 = Monday. */
  startsOn?: number;
  /** Today, so it can be marked. */
  today?: number;
  /** Weekday initials across the top. */
  weekdays?: string[];
  /** Show the "running now" list under the grid. */
  now?: boolean;
}

const KIND_COLORS: Record<NonNullable<CalendarEvent['kind']>, string> = {
  banner: 'var(--fui-xp)',
  raid: 'var(--fui-danger)',
  sale: 'var(--fui-gold)',
  login: 'var(--fui-success)',
  maintenance: 'var(--fui-ink-faint)',
  season: 'var(--fui-info)',
};

/**
 * The live-ops calendar: a month with event bars running across it, so a player
 * can see at a glance that the double-drop weekend overlaps the clan war.
 *
 *   new EventCalendar({
 *     month: 'Harvestmoon', days: 30, startsOn: 3, today: 12, now: true,
 *     events: [
 *       { id: 'banner', label: 'Emberwake banner', from: 8, to: 21, kind: 'banner', live: true, endsIn: 9 * 86400 },
 *       { id: 'war', label: 'Clan war', from: 12, to: 14, kind: 'raid', live: true },
 *     ],
 *   });
 *
 * Events are laid into lanes so two that overlap never sit on the same line —
 * the packing is what makes the overlap visible, which is the entire reason to
 * draw a calendar rather than a list. A bar that runs past the end of a week
 * is split at the boundary, so nothing has to be positioned outside the grid.
 */
export class EventCalendar extends FuiComponent<EventCalendarOptions> {
  private grid: HTMLElement;
  private nowEl: HTMLElement | null = null;

  constructor(opts: EventCalendarOptions) {
    const root = h('div', { class: 'fui fui-cal2' });
    super(root, opts);

    if (opts.month) {
      root.appendChild(h('span', { class: 'fui-cal2__month fui-title', text: opts.month }));
    }

    const heads = h('div', { class: 'fui-cal2__weekdays' });
    for (const day of opts.weekdays ?? ['M', 'T', 'W', 'T', 'F', 'S', 'S']) {
      heads.appendChild(h('span', { class: 'fui-cal2__weekday', text: day }));
    }
    root.appendChild(heads);

    this.grid = h('div', { class: 'fui-cal2__grid' });
    root.appendChild(this.grid);

    if (opts.now ?? true) {
      this.nowEl = h('div', { class: 'fui-cal2__now' });
      root.appendChild(this.nowEl);
    }
    this.render();
  }

  /** Events running on a given day. Not `on()` — the base class owns that. */
  eventsOn(day: number): CalendarEvent[] {
    return this.opts.events.filter((e) => day >= e.from && day <= (e.to ?? e.from));
  }

  /** Everything currently live. */
  live(): CalendarEvent[] {
    return this.opts.events.filter((e) => e.live);
  }

  /** Replace the month's events. */
  setEvents(events: CalendarEvent[]): this {
    this.opts.events = events;
    this.render();
    return this;
  }

  private colorOf(event: CalendarEvent): string {
    return event.color ?? KIND_COLORS[event.kind ?? 'banner'];
  }

  /**
   * Pack events into lanes so two that overlap never share a line. Without this
   * the calendar hides exactly the thing it exists to show.
   */
  private lanes(): Array<CalendarEvent[]> {
    const sorted = [...this.opts.events].sort((a, b) => a.from - b.from || (b.to ?? b.from) - (a.to ?? a.from));
    const lanes: Array<CalendarEvent[]> = [];
    for (const event of sorted) {
      const lane = lanes.find(
        (l) => !l.some((e) => event.from <= (e.to ?? e.from) && (event.to ?? event.from) >= e.from),
      );
      if (lane) lane.push(event);
      else lanes.push([event]);
    }
    return lanes;
  }

  private render(): void {
    clear(this.grid);
    const { days, startsOn = 0, today } = this.opts;
    const lead = ((startsOn % 7) + 7) % 7;
    const weeks = Math.ceil((lead + days) / 7);
    const lanes = this.lanes();

    for (let w = 0; w < weeks; w++) {
      const week = h('div', { class: 'fui-cal2__week' });

      const row = h('div', { class: 'fui-cal2__days' });
      for (let i = 0; i < 7; i++) {
        const day = w * 7 + i - lead + 1;
        const cell = h('div', {
          class: 'fui-cal2__day',
          dataset: {
            out: String(day < 1 || day > days),
            today: String(day === today),
          },
        });
        if (day >= 1 && day <= days) {
          cell.appendChild(h('span', { class: 'fui-cal2__num fui-num', text: String(day) }));
        }
        row.appendChild(cell);
      }
      week.appendChild(row);

      const bars = h('div', { class: 'fui-cal2__bars' });
      for (const lane of lanes) {
        const laneEl = h('div', { class: 'fui-cal2__lane' });
        for (const event of lane) {
          const from = event.from;
          const to = event.to ?? event.from;
          const weekFrom = w * 7 - lead + 1;
          const weekTo = weekFrom + 6;
          // A bar running past the end of a week is split at the boundary, so
          // nothing has to be positioned outside its own row.
          const start = Math.max(from, weekFrom);
          const end = Math.min(to, weekTo);
          if (start > end) continue;

          const col = start - weekFrom + 1;
          const span = end - start + 1;
          const bar = h('div', {
            class: 'fui-cal2__bar',
            dataset: {
              live: String(!!event.live),
              start: String(start === from),
              end: String(end === to),
            },
            style: {
              gridColumn: `${col} / span ${span}`,
              '--fui-cal2-ink': this.colorOf(event),
            },
            attrs: { title: `${event.label} — ${from}${to !== from ? `–${to}` : ''}` },
          });
          if (event.glyph && start === from) {
            bar.appendChild(
              h('span', {
                class: 'fui-cal2__bar-glyph',
                style: { '--fui-glyph-src': `var(--fui-img-${event.glyph})` },
              }),
            );
          }
          if (start === from || w === 0) {
            bar.appendChild(h('span', { class: 'fui-cal2__bar-label', text: event.label }));
          }
          laneEl.appendChild(bar);
        }
        if (laneEl.childNodes.length) bars.appendChild(laneEl);
      }
      week.appendChild(bars);
      this.grid.appendChild(week);
    }

    if (this.nowEl) {
      clear(this.nowEl);
      const live = this.live();
      if (!live.length) {
        this.nowEl.appendChild(
          h('span', { class: 'fui-cal2__quiet', text: 'Nothing running right now.' }),
        );
      }
      for (const event of live) {
        const chip = h('span', {
          class: 'fui-cal2__live',
          style: { '--fui-cal2-ink': this.colorOf(event) },
        });
        chip.appendChild(h('span', { class: 'fui-cal2__live-dot' }));
        chip.appendChild(h('span', { text: event.label }));
        if (event.endsIn) {
          chip.appendChild(
            h('span', { class: 'fui-cal2__live-left fui-num', text: `${duration(event.endsIn)} left` }),
          );
        }
        this.nowEl.appendChild(chip);
      }
    }
  }
}
