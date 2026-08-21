import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp } from '../core/dom.ts';

export interface Waypoint {
  id?: string;
  /** Bearing in degrees, 0 = north, clockwise. */
  bearing: number;
  label?: string;
  /** Glyph asset id for the marker. */
  glyph?: string;
  /** Marker colour. */
  color?: string;
  /** Distance readout under the marker, e.g. `'240m'`. */
  distance?: string;
  /** Objective / quest marker — gets the pulsing treatment. */
  quest?: boolean;
}

export interface CompassOptions extends BaseOptions {
  /** Which way the player is facing, in degrees. */
  heading?: number;
  /** Markers placed by absolute bearing. */
  waypoints?: Waypoint[];
  /** How many degrees of arc the strip shows at once. */
  fieldOfView?: number;
  /** `strip` is the MMO band; `dial` is a round compass rose. */
  variant?: 'strip' | 'dial';
  /** Width in pixels, or any CSS length such as `'100%'`. `strip` only. */
  width?: number | string;
  /** Size in pixels. `dial` only. */
  size?: number;
  /** Print the numeric heading. */
  showDegrees?: boolean;
}

const CARDINALS: Array<[number, string]> = [
  [0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'],
  [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW'],
];

/**
 * The heading band across the top of an open-world HUD, or the same data as a
 * round rose. Waypoints are given absolute bearings and the component works out
 * where they fall relative to where the player is looking.
 *
 *   const compass = new Compass({
 *     heading: 42, fieldOfView: 140, showDegrees: true,
 *     waypoints: [
 *       { bearing: 78, label: 'Ashfall Gate', quest: true, distance: '240m' },
 *       { bearing: 300, label: 'Camp', glyph: 'glyph-holy-totem' },
 *     ],
 *   });
 *   onPlayerTurn((deg) => compass.setHeading(deg));
 *
 * Bearings are normalised into −180…180 relative to the heading, so a waypoint
 * behind the player leaves the strip cleanly instead of wrapping across it.
 */
export class Compass extends FuiComponent<CompassOptions> {
  private heading: number;
  private track: HTMLElement;
  private marks: HTMLElement;
  private degEl: HTMLElement | null = null;

  constructor(opts: CompassOptions = {}) {
    const fov = clamp(opts.fieldOfView ?? 150, 40, 360);
    const root = h('div', {
      class: 'fui fui-compass',
      dataset: { variant: opts.variant ?? 'strip' },
      style: {
        '--fui-compass-fov': String(fov),
        ...(opts.size ? { '--fui-compass-size': `${opts.size}px` } : {}),
        ...(opts.width != null
          ? { width: typeof opts.width === 'number' ? `${opts.width}px` : opts.width }
          : {}),
      },
      attrs: { role: 'img', 'aria-label': 'Compass' },
    });
    super(root, opts);
    this.heading = opts.heading ?? 0;

    // Two layers, because the band's ends fade out and the markers' must not:
    // an edge-pinned "keep turning" chevron that dissolves into the fade is
    // exactly the one a player needs to see.
    this.track = h('div', { class: 'fui-compass__track' });
    this.marks = h('div', { class: 'fui-compass__marks' });
    root.appendChild(h('div', { class: 'fui-compass__viewport' }, this.track, this.marks));

    root.appendChild(h('span', { class: 'fui-compass__needle', attrs: { 'aria-hidden': 'true' } }));

    if (opts.showDegrees) {
      // The readout takes a lane out of the band's right end on the strip, so
      // the band has to know about it — otherwise an edge-pinned marker and the
      // number land in the same place.
      root.classList.add('fui-compass--degrees');
      this.degEl = h('span', { class: 'fui-compass__degrees fui-num' });
      root.appendChild(this.degEl);
    }
    this.render();
  }

  /** Where the player is looking, in degrees. */
  get(): number {
    return this.heading;
  }

  setHeading(deg: number): this {
    this.heading = ((deg % 360) + 360) % 360;
    this.render();
    this.emit('compass:heading', this.heading);
    return this;
  }

  setWaypoints(waypoints: Waypoint[]): this {
    this.opts.waypoints = waypoints;
    this.render();
    return this;
  }

  /** Signed offset from the current heading, in −180…180. */
  private relative(bearing: number): number {
    let d = (bearing - this.heading) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  private render(): void {
    clear(this.track);
    clear(this.marks);
    const dial = this.opts.variant === 'dial';
    // A rose shows every bearing at once; a strip shows a window of them.
    const fov = dial ? 360 : clamp(this.opts.fieldOfView ?? 150, 40, 360);
    const half = fov / 2;
    // Percent across the strip, where 50% is dead ahead. The dial ignores this
    // and rotates by `--fui-compass-at` instead.
    const place = (deg: number) => 50 + (deg / fov) * 100;
    const at = (deg: number) => `${deg.toFixed(2)}deg`;

    for (const [bearing, name] of CARDINALS) {
      const d = this.relative(bearing);
      if (Math.abs(d) > half + 8) continue;
      // The letter rides in its own span so the dial can counter-rotate it and
      // keep every cardinal upright on a turning rose.
      this.track.appendChild(
        h('span', {
          class: 'fui-compass__cardinal',
          dataset: { major: String(bearing % 90 === 0) },
          style: { left: `${place(d).toFixed(2)}%`, '--fui-compass-at': at(d) },
        }, h('span', { class: 'fui-compass__cardinal-text', text: name })),
      );
    }

    // Minor ticks every 15°, skipping where a cardinal already sits.
    for (let bearing = 0; bearing < 360; bearing += 15) {
      if (bearing % 45 === 0) continue;
      const d = this.relative(bearing);
      if (Math.abs(d) > half) continue;
      this.track.appendChild(
        h('span', {
          class: 'fui-compass__tick',
          style: { left: `${place(d).toFixed(2)}%`, '--fui-compass-at': at(d) },
        }),
      );
    }

    for (const wp of this.opts.waypoints ?? []) {
      const d = this.relative(wp.bearing);
      const off = Math.abs(d) > half;
      const marker = h('span', {
        class: 'fui-compass__waypoint',
        // A marker past the edge pins to it and gets an arrow, rather than
        // vanishing — that is how a player knows to keep turning.
        style: {
          left: `${clamp(place(d), 0, 100).toFixed(2)}%`,
          '--fui-compass-at': at(d),
          ...(wp.color ? { '--fui-compass-ink': wp.color } : {}),
        },
        dataset: { off: off && !dial ? (d > 0 ? 'right' : 'left') : '' },
        attrs: { title: wp.label ?? '' },
      });
      if (wp.quest) marker.classList.add('is-quest');

      const pip = h('span', { class: 'fui-compass__pip' });
      if (wp.glyph) pip.style.setProperty('--fui-glyph-src', `var(--fui-img-${wp.glyph})`);
      marker.appendChild(pip);
      if (wp.distance && !off) {
        marker.appendChild(h('span', { class: 'fui-compass__distance fui-num', text: wp.distance }));
      }
      this.marks.appendChild(marker);
    }

    if (this.degEl) this.degEl.textContent = `${Math.round(this.heading)}°`;
    this.el.setAttribute('aria-label', `Heading ${Math.round(this.heading)} degrees`);
  }
}
