import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp } from '../core/dom.ts';

export interface ResistRow {
  id: string;
  label: string;
  /**
   * Resistance as a percentage: positive resists, negative is a weakness,
   * 100 is immune and anything past that absorbs.
   */
  value: number;
  /** Glyph asset id for the damage type. */
  glyph?: string;
  /** Damage-type colour. */
  color?: string;
  /** Line under the name — where the resistance comes from. */
  note?: string;
  /** Change since the last look, for a compare view. */
  delta?: number;
}

export interface ResistGridOptions extends BaseOptions {
  /** One row per damage type. */
  rows: ResistRow[];
  /** Heading over the grid. */
  title?: string;
  /** `bars` is one row per type; `grid` is a compact tile board. */
  variant?: 'bars' | 'grid';
  /** Percentage at which a resistance counts as strong. */
  strongAt?: number;
  /** Percentage below which it counts as a weakness. */
  weakAt?: number;
  /** Columns in the tile board. */
  columns?: number;
  /** Print the numbers. */
  showValues?: boolean;
  /** Cap used to scale the bars. Defaults to 100. */
  cap?: number;
}

/**
 * Elemental resistances at a glance: what this unit shrugs off, what melts it,
 * and what it is outright immune to.
 *
 *   new ResistGrid({
 *     title: 'Resistances', showValues: true, variant: 'bars',
 *     rows: [
 *       { id: 'fire', label: 'Fire', value: 65, glyph: 'glyph-magic-flame', color: '#e2622f' },
 *       { id: 'frost', label: 'Frost', value: -30, note: 'Cracked plate', color: '#3f8fd6' },
 *       { id: 'necrotic', label: 'Necrotic', value: 100, color: '#a335ee' },
 *     ],
 *   });
 *
 * `ElementWheel` says which element beats which; this says what *this* unit
 * does about it. Weaknesses grow leftward from a centre line rather than being
 * drawn as short resistances — a −30 and a +30 have to look like opposites, not
 * like two lengths of the same bar. Immunity and absorption get their own
 * labels, because a bar pinned at the end cannot tell them apart.
 */
export class ResistGrid extends FuiComponent<ResistGridOptions> {
  private list: HTMLElement;

  constructor(opts: ResistGridOptions) {
    const root = h('div', {
      class: 'fui fui-resist',
      dataset: { variant: opts.variant ?? 'bars' },
      style: { '--fui-resist-cols': String(opts.columns ?? 4) },
    });
    super(root, opts);

    if (opts.title) {
      root.appendChild(h('span', { class: 'fui-resist__title fui-title', text: opts.title }));
    }
    this.list = h('div', { class: 'fui-resist__list' });
    root.appendChild(this.list);
    this.render();
  }

  /** The unit's worst weakness, if it has one. */
  weakest(): ResistRow | null {
    const weak = [...this.opts.rows].sort((a, b) => a.value - b.value)[0];
    return weak && weak.value < (this.opts.weakAt ?? 0) ? weak : null;
  }

  /** Everything the unit is immune to or absorbs. */
  immunities(): ResistRow[] {
    return this.opts.rows.filter((r) => r.value >= 100);
  }

  /** Replace the rows. */
  setRows(rows: ResistRow[]): this {
    this.opts.rows = rows;
    this.render();
    return this;
  }

  /** What a value means in words — the label a bar cannot carry. */
  private verdict(value: number): { state: string; word: string } {
    if (value > 100) return { state: 'absorb', word: 'Absorbs' };
    if (value >= 100) return { state: 'immune', word: 'Immune' };
    if (value >= (this.opts.strongAt ?? 50)) return { state: 'strong', word: 'Resistant' };
    if (value < (this.opts.weakAt ?? 0)) return { state: 'weak', word: 'Vulnerable' };
    return { state: 'plain', word: '' };
  }

  private render(): void {
    clear(this.list);
    const cap = this.opts.cap ?? 100;

    for (const row of this.opts.rows) {
      const { state, word } = this.verdict(row.value);
      const el = h('div', {
        class: 'fui-resist__row',
        dataset: { state },
        style: {
          ...(row.color ? { '--fui-resist-ink': row.color } : {}),
          // Positive and negative are two separate widths from a centre line,
          // so a −30 and a +30 read as opposites rather than as two lengths.
          '--fui-resist-pos': `${clamp((Math.max(0, row.value) / cap) * 100, 0, 100).toFixed(2)}%`,
          '--fui-resist-neg': `${clamp((Math.max(0, -row.value) / cap) * 100, 0, 100).toFixed(2)}%`,
        },
        attrs: { title: word ? `${row.label} — ${word}` : row.label },
      });

      const head = h('div', { class: 'fui-resist__head' });
      const mark = h('span', { class: 'fui-resist__glyph' });
      if (row.glyph) mark.style.setProperty('--fui-glyph-src', `var(--fui-img-${row.glyph})`);
      else mark.classList.add('is-dot');
      head.appendChild(mark);

      const names = h('div', { class: 'fui-resist__names' });
      names.appendChild(h('span', { class: 'fui-resist__label', text: row.label }));
      if (row.note) names.appendChild(h('span', { class: 'fui-resist__note', text: row.note }));
      head.appendChild(names);

      if (this.opts.showValues ?? true) {
        const value = h('span', { class: 'fui-resist__value fui-num' });
        value.appendChild(
          h('span', { text: `${row.value > 0 ? '+' : row.value < 0 ? '−' : ''}${Math.abs(row.value)}%` }),
        );
        if (row.delta) {
          value.appendChild(
            h('span', {
              class: 'fui-resist__delta',
              dataset: { sign: row.delta > 0 ? 'up' : 'down' },
              text: `${row.delta > 0 ? '▲' : '▼'}${Math.abs(row.delta)}`,
            }),
          );
        }
        head.appendChild(value);
      }
      el.appendChild(head);

      const track = h('span', { class: 'fui-resist__track' });
      track.appendChild(h('span', { class: 'fui-resist__fill fui-resist__fill--neg' }));
      track.appendChild(h('span', { class: 'fui-resist__fill fui-resist__fill--pos' }));
      el.appendChild(track);

      // Immune and absorb both pin the bar at the end, so the word has to say
      // which one it is.
      if (word && (state === 'immune' || state === 'absorb')) {
        el.appendChild(h('span', { class: 'fui-resist__verdict', text: word }));
      }
      this.list.appendChild(el);
    }
  }
}
