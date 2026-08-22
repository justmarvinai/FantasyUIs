import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, append, type Child } from '../core/dom.ts';

export interface TabletopZone {
  id: string;
  /** Name printed on the felt inside the zone. */
  label?: string;
  /** How much of the table's width this zone takes, as a flex grow. */
  span?: number;
  /** Dashed outline — a place cards are meant to land. */
  drop?: boolean;
  /** Zone contents. */
  content?: Child | Child[];
}

export interface TabletopOptions extends BaseOptions {
  /** Rows of zones, top to bottom. Omit for a single open surface. */
  rows?: TabletopZone[][];
  /** Anything laid straight on the felt when there are no rows. */
  content?: Child | Child[];
  /** Surface finish. */
  felt?: 'green' | 'crimson' | 'midnight' | 'sand';
  /** Wood rail colour around the edge. `none` drops the rail. */
  rail?: 'oak' | 'walnut' | 'ebony' | 'none';
  /** Height in pixels, or any CSS length. */
  height?: number | string;
  /** Draw the gold inlay line inside the rail. */
  inlay?: boolean;
  /** Heading burned into the rail. */
  title?: string;
}

/**
 * The table a card game, a dice game or a board is played on: felt, a wood
 * rail, a gold inlay line, and named zones to lay things in.
 *
 *   const table = new Tabletop({
 *     title: 'The Gambler’s Rest', felt: 'crimson', rail: 'walnut', height: 340,
 *     rows: [
 *       [{ id: 'foe', label: 'Opponent', content: enemyHand.el }],
 *       [{ id: 'field', label: 'Field', drop: true }],
 *       [{ id: 'you', label: 'Your hand', content: hand.el }],
 *     ],
 *   });
 *   table.zone('field')?.appendChild(card.el);
 *
 * The felt is a layered gradient rather than a texture file, so a table costs
 * nothing to load and recolours by changing one attribute. Zones are plain flex
 * children — anything can be laid in one, and `zone()` hands back the element
 * so a card game can append straight into it.
 */
export class Tabletop extends FuiComponent<TabletopOptions> {
  readonly surface: HTMLElement;
  private zones = new Map<string, HTMLElement>();

  constructor(opts: TabletopOptions = {}) {
    const root = h('div', {
      class: 'fui fui-table',
      dataset: { felt: opts.felt ?? 'green', rail: opts.rail ?? 'oak' },
      style:
        opts.height != null
          ? { height: typeof opts.height === 'number' ? `${opts.height}px` : opts.height }
          : {},
    });
    super(root, opts);

    if (opts.title) {
      root.appendChild(h('span', { class: 'fui-table__title fui-title', text: opts.title }));
    }

    this.surface = h('div', {
      class: 'fui-table__felt',
      dataset: { inlay: String(opts.inlay ?? true) },
    });
    root.appendChild(this.surface);

    if (opts.rows?.length) {
      for (const row of opts.rows) {
        const rowEl = h('div', { class: 'fui-table__row' });
        for (const zone of row) {
          const zoneEl = h('div', {
            class: 'fui-table__zone',
            dataset: { id: zone.id, drop: String(!!zone.drop) },
            style: { flexGrow: String(zone.span ?? 1) },
          });
          if (zone.label) {
            zoneEl.appendChild(h('span', { class: 'fui-table__zone-label', text: zone.label }));
          }
          if (zone.content != null) {
            append(zoneEl, ...(Array.isArray(zone.content) ? zone.content : [zone.content]));
          }
          this.zones.set(zone.id, zoneEl);
          rowEl.appendChild(zoneEl);
        }
        this.surface.appendChild(rowEl);
      }
    } else if (opts.content != null) {
      append(this.surface, ...(Array.isArray(opts.content) ? opts.content : [opts.content]));
    }
  }

  /** A zone's element, so a game can append straight into it. */
  zone(id: string): HTMLElement | undefined {
    return this.zones.get(id);
  }

  /** Change the felt without rebuilding the table. */
  setFelt(felt: NonNullable<TabletopOptions['felt']>): this {
    this.opts.felt = felt;
    this.el.dataset.felt = felt;
    return this;
  }
}
