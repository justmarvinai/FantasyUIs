import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp, commas } from '../core/dom.ts';

export type SiteKind = 'town' | 'dungeon' | 'boss' | 'camp' | 'ruin' | 'port' | 'quest';

export interface AtlasSite {
  id: string;
  name: string;
  /** Position in atlas coordinates, 0–100 on both axes. */
  x: number;
  y: number;
  kind?: SiteKind;
  /** Glyph asset id, overriding the kind's default marker. */
  glyph?: string;
  /** Recommended level, printed under the name. */
  level?: number;
  /** Not discovered yet — drawn only once its region is. */
  hidden?: boolean;
  /** The player is standing here. */
  here?: boolean;
}

export interface AtlasRegion {
  id: string;
  name: string;
  /**
   * The territory outline, as `[x, y]` pairs in atlas coordinates. Three points
   * is the minimum; the shape closes itself.
   */
  shape: Array<[number, number]>;
  /** Who holds it. Drives the fill colour through `factions`. */
  faction?: string;
  /** Level range shown in the detail card, e.g. "24–31". */
  levels?: string;
  /** Undiscovered — drawn as fog, and its sites stay hidden. */
  fogged?: boolean;
  /** Cleared to completion. */
  cleared?: boolean;
  /** Completion, 0–1, shown on the detail card. */
  progress?: number;
  /** Line in the detail card. */
  note?: string;
  /**
   * Where the region's name sits, in atlas coordinates. Defaults to the shape's
   * centroid, nudged clear of any site sitting on top of it.
   */
  labelAt?: [number, number];
}

export interface AtlasFaction {
  id: string;
  label: string;
  color: string;
}

export interface RegionAtlasOptions extends BaseOptions {
  /** The territories, drawn in order — later ones paint over earlier ones. */
  regions: AtlasRegion[];
  /** Places on top of the territories. */
  sites?: AtlasSite[];
  /** Who owns what, and in what colour. */
  factions?: AtlasFaction[];
  /** Background art asset id painted under the territories. */
  art?: string;
  /** Heading over the atlas. */
  title?: string;
  /** Height in pixels, or any CSS length. Width fills the parent. */
  height?: number | string;
  /** Region selected on open. */
  selected?: string;
  /** Starting zoom. 1 fits the whole atlas. */
  zoom?: number;
  /** How far in the player may zoom. */
  maxZoom?: number;
  /** Draw the faction key. */
  legend?: boolean;
  /** Show the detail card for the selected region. */
  detail?: boolean;
  /** Label on the detail card's action button. Omit for a read-only atlas. */
  action?: string;
  /** Turn panning and zooming off — a static illustration. */
  static?: boolean;
}

const MARKERS: Record<SiteKind, string> = {
  town: '⌂',
  dungeon: '☗',
  boss: '☠',
  camp: '⌇',
  ruin: '⌂',
  port: '⚓',
  quest: '!',
};

/** The average of a polygon's points — good enough to hang a label on. */
function centroid(shape: Array<[number, number]>): { x: number; y: number } {
  const n = shape.length || 1;
  let x = 0;
  let y = 0;
  for (const [px, py] of shape) {
    x += px;
    y += py;
  }
  return { x: x / n, y: y / n };
}

/**
 * The world as territory rather than as a list of stops: regions drawn as
 * shapes you can pan and zoom around, coloured by who holds them, with fog over
 * what has not been found and places marked on top.
 *
 * `WorldMap` is the campaign take — a handful of nodes on painted art, joined
 * by a path, one chapter at a time. This is the atlas: it answers "who owns the
 * north" and "what is over there", which a node map cannot.
 *
 *   const atlas = new RegionAtlas({
 *     title: 'The Ashen Reach', height: 460, art: 'bg-wide', legend: true, detail: true,
 *     factions: [{ id: 'crown', label: 'The Crown', color: '#4a8ede' }],
 *     regions: [{ id: 'vale', name: 'Emberwood Vale', faction: 'crown',
 *                 shape: [[8, 20], [34, 12], [42, 38], [20, 52]], levels: '24–31' }],
 *     sites: [{ id: 'ashfall', name: 'Ashfall Gate', x: 22, y: 30, kind: 'town', here: true }],
 *   });
 *   atlas.on<string>('atlas:enter', (id) => travel.to(id));
 *
 * Everything is drawn in one 0–100 coordinate space and moved by a single
 * transform on a group, so panning and zooming cost one matrix rather than a
 * layout pass. Labels and markers counter-scale by the same factor, which is
 * what keeps a place name readable at 3× instead of turning into a billboard.
 * A region's label hangs off its own outline's centroid — move the shape and
 * the name follows, with no second list to keep in sync.
 */
export class RegionAtlas extends FuiComponent<RegionAtlasOptions> {
  private viewport: HTMLElement;
  private svg: SVGSVGElement;
  private scene: SVGGElement;
  private overlay: HTMLElement;
  private detailEl: HTMLElement | null = null;
  private zoomLabel: HTMLElement | null = null;
  private zoom: number;
  private panX = 0;
  private panY = 0;
  private drag: { x: number; y: number; px: number; py: number; moved: boolean } | null = null;

  constructor(opts: RegionAtlasOptions) {
    const root = h('div', {
      class: 'fui fui-atlas',
      style: {
        ...(opts.art ? { '--fui-atlas-art': `var(--fui-img-${opts.art})` } : {}),
        ...(opts.height != null
          ? { height: typeof opts.height === 'number' ? `${opts.height}px` : opts.height }
          : {}),
      },
    });
    super(root, opts);
    this.zoom = clamp(opts.zoom ?? 1, 1, opts.maxZoom ?? 4);

    this.viewport = h('div', { class: 'fui-atlas__viewport' });
    root.appendChild(this.viewport);

    const NS = 'http://www.w3.org/2000/svg';
    const doc = root.ownerDocument;
    this.svg = doc.createElementNS(NS, 'svg') as SVGSVGElement;
    this.svg.setAttribute('class', 'fui-atlas__stage');
    // `none` maps the 0–100 box straight onto the element on each axis, exactly
    // like a CSS percentage — which is what lets an HTML overlay carry the same
    // transform and stay in lockstep with the shapes.
    this.svg.setAttribute('viewBox', '0 0 100 100');
    this.svg.setAttribute('preserveAspectRatio', 'none');
    this.scene = doc.createElementNS(NS, 'g') as SVGGElement;
    this.scene.setAttribute('class', 'fui-atlas__scene');
    this.svg.appendChild(this.scene);
    this.viewport.appendChild(this.svg);

    // Labels and markers live in HTML, not in the SVG: inside a stretched
    // viewBox an SVG font-size is measured in viewBox units, which turns every
    // place name into a billboard whose size depends on the container.
    this.overlay = h('div', { class: 'fui-atlas__overlay' });
    this.viewport.appendChild(this.overlay);

    if (opts.title) {
      root.appendChild(h('p', { class: 'fui-atlas__title fui-title', text: opts.title }));
    }

    if (!opts.static) {
      root.appendChild(this.buildControls());
      this.viewport.addEventListener('pointerdown', this.onDown);
      this.viewport.addEventListener('wheel', this.onWheel, { passive: false });
      this.onDestroy(() => {
        this.viewport.removeEventListener('pointerdown', this.onDown);
        this.viewport.removeEventListener('wheel', this.onWheel);
        this.endDrag();
      });
    }

    if (opts.legend ?? true) root.appendChild(this.buildLegend());

    if (opts.detail ?? true) {
      this.detailEl = h('div', { class: 'fui-atlas__detail' });
      root.appendChild(this.detailEl);
    }

    this.render();
    this.applyTransform();
    this.paintDetail();
  }

  /** The selected region's id, if any. */
  get(): string | undefined {
    return this.opts.selected;
  }

  /** The selected region. */
  selectedRegion(): AtlasRegion | undefined {
    return this.opts.regions.find((r) => r.id === this.opts.selected);
  }

  /** Sites inside a region's outline. */
  sitesIn(regionId: string): AtlasSite[] {
    const region = this.opts.regions.find((r) => r.id === regionId);
    if (!region) return [];
    return (this.opts.sites ?? []).filter((s) => this.contains(region.shape, s.x, s.y));
  }

  /** Select a region and show its card. A fogged region cannot be selected. */
  select(id: string, opts?: { silent?: boolean }): this {
    const region = this.opts.regions.find((r) => r.id === id);
    if (!region || region.fogged) return this;
    this.opts.selected = id;
    this.paintSelection();
    this.paintDetail();
    if (!opts?.silent) this.emit('atlas:select', id);
    return this;
  }

  /** Centre a region and zoom to it. */
  focus(id: string, zoom?: number): this {
    const region = this.opts.regions.find((r) => r.id === id);
    if (!region) return this;
    const c = centroid(region.shape);
    this.zoom = clamp(zoom ?? Math.max(this.zoom, 1.8), 1, this.opts.maxZoom ?? 4);
    // Pan is in atlas units: to put point `c` at the centre, shift by how far it
    // is from the middle, scaled by the zoom.
    this.panX = (50 - c.x) * this.zoom;
    this.panY = (50 - c.y) * this.zoom;
    this.applyTransform();
    return this;
  }

  /** Zoom in or out around the atlas centre. */
  setZoom(zoom: number): this {
    const next = clamp(zoom, 1, this.opts.maxZoom ?? 4);
    if (next === this.zoom) return this;
    // Keep whatever is under the middle of the viewport under it, so zooming
    // does not slide the map out from under the player.
    const ratio = next / this.zoom;
    this.panX *= ratio;
    this.panY *= ratio;
    this.zoom = next;
    this.applyTransform();
    this.emit('atlas:zoom', next);
    return this;
  }

  /** Back to the whole atlas. */
  reset(): this {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
    return this;
  }

  /** Ray-cast point-in-polygon, used to work out which sites a region holds. */
  private contains(shape: Array<[number, number]>, x: number, y: number): boolean {
    let inside = false;
    for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
      const [xi, yi] = shape[i];
      const [xj, yj] = shape[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  /**
   * Where a region's name goes. The centroid is the natural spot, but it is
   * also where a capital tends to sit — so a label with a site on top of it
   * steps aside rather than being written through a marker.
   */
  private labelPoint(region: AtlasRegion): { x: number; y: number } {
    if (region.labelAt) return { x: region.labelAt[0], y: region.labelAt[1] };
    const c = centroid(region.shape);
    const crowded = (this.opts.sites ?? []).some(
      (s) => !s.hidden && Math.abs(s.x - c.x) < 14 && Math.abs(s.y - c.y) < 7,
    );
    return crowded ? { x: c.x, y: c.y - 8 } : c;
  }

  private colorOf(region: AtlasRegion): string {
    const faction = this.opts.factions?.find((f) => f.id === region.faction);
    return faction?.color ?? 'var(--fui-ink-faint)';
  }

  private applyTransform(): void {
    // Panning is clamped so the atlas cannot be dragged off the viewport: at
    // zoom 1 there is nowhere to go, and the room grows with the zoom.
    const room = 50 * (this.zoom - 1);
    this.panX = clamp(this.panX, -room, room);
    this.panY = clamp(this.panY, -room, room);
    this.scene.setAttribute(
      'transform',
      `translate(${this.panX.toFixed(3)} ${this.panY.toFixed(3)}) translate(50 50) scale(${this.zoom.toFixed(3)}) translate(-50 -50)`,
    );
    // The same move in CSS terms: a percentage translate is relative to the
    // element's own box, which is the same 0–100 space the viewBox maps onto.
    this.overlay.style.transform =
      `translate(${this.panX.toFixed(3)}%, ${this.panY.toFixed(3)}%) scale(${this.zoom.toFixed(3)})`;
    // Counter-scaling the labels is what stops a place name becoming a
    // billboard at 3×; the marker discs shrink a little rather than fully, so
    // they stay findable.
    this.el.style.setProperty('--fui-atlas-z', this.zoom.toFixed(3));
    this.el.style.setProperty('--fui-atlas-inv', (1 / this.zoom).toFixed(4));
    if (this.zoomLabel) this.zoomLabel.textContent = `${this.zoom.toFixed(1)}×`;
    this.el.dataset.zoomed = String(this.zoom > 1.01);
  }

  private onDown = (ev: Event): void => {
    const pe = ev as PointerEvent;
    if (this.zoom <= 1.01) return;
    this.drag = { x: pe.clientX, y: pe.clientY, px: this.panX, py: this.panY, moved: false };
    this.viewport.setPointerCapture?.(pe.pointerId);
    this.viewport.addEventListener('pointermove', this.onMove);
    this.viewport.addEventListener('pointerup', this.onUp);
    this.viewport.addEventListener('pointercancel', this.onUp);
    this.el.dataset.dragging = 'true';
  };

  private onMove = (ev: Event): void => {
    if (!this.drag) return;
    const pe = ev as PointerEvent;
    const box = this.viewport.getBoundingClientRect();
    // Screen pixels convert to atlas units through the viewport's own size, so
    // a drag moves the map exactly as far as the pointer went.
    const unit = 100 / Math.max(1, Math.min(box.width, box.height) || 1);
    const dx = (pe.clientX - this.drag.x) * unit;
    const dy = (pe.clientY - this.drag.y) * unit;
    if (Math.abs(dx) + Math.abs(dy) > 0.4) this.drag.moved = true;
    this.panX = this.drag.px + dx;
    this.panY = this.drag.py + dy;
    this.applyTransform();
  };

  private onUp = (): void => {
    this.endDrag();
  };

  private endDrag(): void {
    if (!this.drag) return;
    this.viewport.removeEventListener('pointermove', this.onMove);
    this.viewport.removeEventListener('pointerup', this.onUp);
    this.viewport.removeEventListener('pointercancel', this.onUp);
    delete this.el.dataset.dragging;
    this.drag = null;
  }

  private onWheel = (ev: Event): void => {
    const we = ev as WheelEvent;
    we.preventDefault();
    this.setZoom(this.zoom * (we.deltaY < 0 ? 1.18 : 1 / 1.18));
  };

  private buildControls(): HTMLElement {
    const bar = h('div', { class: 'fui-atlas__controls' });
    const btn = (cls: string, label: string, run: () => void) => {
      const b = h('button', {
        class: `fui-atlas__zoom fui-atlas__zoom--${cls}`,
        attrs: { type: 'button', 'aria-label': label, title: label },
      });
      b.addEventListener('click', run);
      return b;
    };
    bar.appendChild(btn('in', 'Zoom in', () => this.setZoom(this.zoom * 1.4)));
    bar.appendChild(btn('out', 'Zoom out', () => this.setZoom(this.zoom / 1.4)));
    bar.appendChild(btn('reset', 'Fit the whole atlas', () => this.reset()));
    this.zoomLabel = h('span', { class: 'fui-atlas__zoom-label fui-num' });
    bar.appendChild(this.zoomLabel);
    return bar;
  }

  private buildLegend(): HTMLElement {
    const legend = h('div', { class: 'fui-atlas__legend' });
    for (const f of this.opts.factions ?? []) {
      const key = h('span', { class: 'fui-atlas__key', style: { '--fui-atlas-ink': f.color } });
      key.appendChild(h('span', { class: 'fui-atlas__key-dot' }));
      key.appendChild(h('span', { text: f.label }));
      legend.appendChild(key);
    }
    if (this.opts.regions.some((r) => r.fogged)) {
      const key = h('span', { class: 'fui-atlas__key is-fog' });
      key.appendChild(h('span', { class: 'fui-atlas__key-dot' }));
      key.appendChild(h('span', { text: 'Undiscovered' }));
      legend.appendChild(key);
    }
    return legend;
  }

  private render(): void {
    clear(this.scene);
    clear(this.overlay);
    const NS = 'http://www.w3.org/2000/svg';
    const doc = this.el.ownerDocument;

    for (const region of this.opts.regions) {
      const poly = doc.createElementNS(NS, 'polygon');
      poly.setAttribute('class', 'fui-atlas__region');
      poly.setAttribute('points', region.shape.map(([x, y]) => `${x},${y}`).join(' '));
      poly.setAttribute('data-id', region.id);
      poly.setAttribute('data-state', region.fogged ? 'fog' : region.cleared ? 'cleared' : 'open');
      poly.style.setProperty('--fui-atlas-ink', this.colorOf(region));
      if (!region.fogged) {
        poly.addEventListener('click', () => {
          // A click that ended a drag is a pan, not a selection.
          if (this.drag?.moved) return;
          this.select(region.id);
        });
      }
      this.scene.appendChild(poly);
    }

    for (const region of this.opts.regions) {
      const at = this.labelPoint(region);
      this.overlay.appendChild(
        h('span', {
          class: 'fui-atlas__region-label',
          dataset: { id: region.id, state: region.fogged ? 'fog' : 'open' },
          style: { left: `${at.x.toFixed(2)}%`, top: `${at.y.toFixed(2)}%` },
          text: region.fogged ? 'Uncharted' : region.name,
        }),
      );
    }

    for (const site of this.opts.sites ?? []) {
      const region = this.opts.regions.find((r) => this.contains(r.shape, site.x, site.y));
      // A site in fog stays hidden — the shape of the land is knowledge the
      // player has earned, what is standing on it is not.
      if (site.hidden || region?.fogged) continue;

      const marker = h('button', {
        class: 'fui-atlas__site',
        dataset: { kind: site.kind ?? 'town', here: String(!!site.here) },
        style: { left: `${site.x.toFixed(2)}%`, top: `${site.y.toFixed(2)}%` },
        attrs: { type: 'button', title: site.name },
      });
      marker.appendChild(
        h('span', {
          class: 'fui-atlas__site-disc',
          text: site.glyph ? '' : MARKERS[site.kind ?? 'town'],
          style: site.glyph ? { '--fui-glyph-src': `var(--fui-img-${site.glyph})` } : {},
        }),
      );
      if (site.glyph) {
        (marker.firstChild as HTMLElement).classList.add('is-glyph');
      }
      marker.appendChild(
        h('span', {
          class: 'fui-atlas__site-name',
          text: site.level != null ? `${site.name} · ${site.level}` : site.name,
        }),
      );
      marker.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (this.drag?.moved) return;
        this.emit('atlas:site', site.id);
      });
      this.overlay.appendChild(marker);
    }

    this.paintSelection();
  }

  private paintSelection(): void {
    for (const host of [this.scene, this.overlay]) {
      for (const el of host.querySelectorAll('[data-id]')) {
        el.classList.toggle('is-on', el.getAttribute('data-id') === this.opts.selected);
      }
    }
  }

  private paintDetail(): void {
    if (!this.detailEl) return;
    clear(this.detailEl);
    const region = this.selectedRegion();
    if (!region) {
      this.detailEl.appendChild(
        h('p', { class: 'fui-atlas__hint', text: 'Pick a territory to see what is in it.' }),
      );
      return;
    }

    const faction = this.opts.factions?.find((f) => f.id === region.faction);
    this.detailEl.style.setProperty('--fui-atlas-ink', this.colorOf(region));

    const head = h('div', { class: 'fui-atlas__detail-head' });
    head.appendChild(h('span', { class: 'fui-atlas__detail-name fui-title', text: region.name }));
    if (faction) {
      head.appendChild(h('span', { class: 'fui-atlas__detail-faction', text: faction.label }));
    }
    this.detailEl.appendChild(head);

    const meta: string[] = [];
    if (region.levels) meta.push(`Lv ${region.levels}`);
    const sites = this.sitesIn(region.id);
    if (sites.length) meta.push(`${commas(sites.length)} ${sites.length === 1 ? 'site' : 'sites'}`);
    if (region.note) meta.push(region.note);
    if (meta.length) {
      this.detailEl.appendChild(
        h('span', { class: 'fui-atlas__detail-meta', text: meta.join('  ·  ') }),
      );
    }

    if (region.progress != null) {
      const bar = h('span', {
        class: 'fui-atlas__detail-bar',
        style: { '--fui-atlas-p': clamp(region.progress, 0, 1).toFixed(3) },
      });
      bar.appendChild(h('span', { class: 'fui-atlas__detail-fill' }));
      this.detailEl.appendChild(bar);
    }

    if (sites.length) {
      const chips = h('div', { class: 'fui-atlas__chips' });
      for (const s of sites.slice(0, 5)) {
        const chip = h('button', {
          class: 'fui-atlas__chip',
          dataset: { kind: s.kind ?? 'town' },
          text: s.name,
          attrs: { type: 'button' },
        });
        chip.addEventListener('click', () => this.emit('atlas:site', s.id));
        chips.appendChild(chip);
      }
      this.detailEl.appendChild(chips);
    }

    if (this.opts.action) {
      const go = h('button', {
        class: 'fui-atlas__go',
        text: this.opts.action,
        attrs: { type: 'button' },
      });
      go.addEventListener('click', () => this.emit('atlas:enter', region.id));
      this.detailEl.appendChild(go);
    }
  }
}
