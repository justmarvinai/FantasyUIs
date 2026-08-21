import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp } from '../core/dom.ts';

export interface ActivityDay {
  /** Any label the game uses for the day — "Mar 4", "Day 12", an ISO date. */
  label?: string;
  /** How much happened. `0` and `undefined` both read as a miss. */
  value?: number;
  /** Override the level instead of deriving it from `value`, 0–4. */
  level?: number;
  /** Mark this cell — today, the reset, a boss day. */
  marked?: boolean;
  /** The day has not happened yet, so a blank is not a miss. */
  future?: boolean;
}

export interface ActivityCalendarOptions extends BaseOptions {
  /** Days in order, oldest first. */
  days: ActivityDay[];
  /** Heading over the grid. */
  title?: string;
  /** Rows in the grid — 7 reads as weeks running down each column. */
  rows?: number;
  /** Cell size in pixels. */
  size?: number;
  /** Value at which a cell reaches the darkest level. Defaults to the maximum. */
  max?: number;
  /** Row labels down the left, e.g. weekday initials. */
  rowLabels?: string[];
  /** Colour ramp base. Defaults to the theme accent. */
  color?: string;
  /** Draw the "less → more" key under the grid. */
  key?: boolean;
  /** Line under the grid — a streak, an attendance rate. */
  summary?: string;
}

/**
 * The attendance grid — clan boss keys spent, daily logins, event days cleared.
 * One cell per day, shaded by how much happened.
 *
 *   new ActivityCalendar({
 *     title: 'Clan boss attendance', rows: 7, key: true,
 *     rowLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
 *     days: history.map((d) => ({ label: d.date, value: d.keys })),
 *   });
 *
 * A day nobody has reached yet is drawn as a hole rather than an empty cell,
 * because a grid that shows the rest of the month as misses reads as failure
 * before the month has happened. `streak()` counts back from the last day that
 * is not in the future, for the same reason.
 */
export class ActivityCalendar extends FuiComponent<ActivityCalendarOptions> {
  private grid: HTMLElement;

  constructor(opts: ActivityCalendarOptions) {
    const root = h('div', {
      class: 'fui fui-cal',
      style: {
        '--fui-cal-size': `${opts.size ?? 13}px`,
        '--fui-cal-rows': String(opts.rows ?? 7),
        ...(opts.color ? { '--fui-cal-ink': opts.color } : {}),
      },
    });
    super(root, opts);

    if (opts.title) {
      root.appendChild(h('span', { class: 'fui-cal__title fui-label', text: opts.title }));
    }

    const body = h('div', { class: 'fui-cal__body' });
    if (opts.rowLabels?.length) {
      const labels = h('div', { class: 'fui-cal__rowlabels' });
      for (const l of opts.rowLabels) {
        labels.appendChild(h('span', { class: 'fui-cal__rowlabel', text: l }));
      }
      body.appendChild(labels);
    }

    this.grid = h('div', { class: 'fui-cal__grid', attrs: { role: 'img' } });
    body.appendChild(this.grid);
    root.appendChild(body);

    if (opts.key) {
      const key = h('div', { class: 'fui-cal__key' });
      key.appendChild(h('span', { class: 'fui-cal__key-label', text: 'Less' }));
      for (let lv = 0; lv <= 4; lv++) {
        key.appendChild(h('span', { class: 'fui-cal__cell', dataset: { level: String(lv) } }));
      }
      key.appendChild(h('span', { class: 'fui-cal__key-label', text: 'More' }));
      root.appendChild(key);
    }

    if (opts.summary) {
      root.appendChild(h('p', { class: 'fui-cal__summary', text: opts.summary }));
    }
    this.paint();
  }

  /** Replace the history and redraw. */
  setDays(days: ActivityDay[]): this {
    this.opts.days = days;
    this.paint();
    return this;
  }

  /** How many days in a row, counting back from the last day that has happened. */
  streak(): number {
    const played = this.opts.days.filter((d) => !d.future);
    let n = 0;
    for (let i = played.length - 1; i >= 0; i--) {
      if ((played[i].value ?? 0) <= 0 && (played[i].level ?? 0) <= 0) break;
      n++;
    }
    return n;
  }

  private paint(): void {
    clear(this.grid);
    const values = this.opts.days.map((d) => d.value ?? 0);
    const peak = this.opts.max ?? Math.max(1, ...values);

    for (const day of this.opts.days) {
      const level =
        day.level != null
          ? clamp(Math.round(day.level), 0, 4)
          : day.value
            ? clamp(Math.ceil((day.value / peak) * 4), 1, 4)
            : 0;
      const cell = h('span', {
        class: 'fui-cal__cell',
        dataset: { level: day.future ? 'future' : String(level) },
        attrs: {
          title: day.future
            ? day.label ?? ''
            : `${day.label ?? ''}${day.label ? ' — ' : ''}${day.value ?? 0}`,
        },
      });
      if (day.marked) cell.classList.add('is-marked');
      this.grid.appendChild(cell);
    }

    const hit = this.opts.days.filter((d) => !d.future && (d.value ?? 0) > 0).length;
    const of = this.opts.days.filter((d) => !d.future).length;
    this.grid.setAttribute('aria-label', `${hit} active days out of ${of}`);
  }
}
