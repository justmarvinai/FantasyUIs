import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp } from '../core/dom.ts';

export interface MapPin {
  id: string;
  /** Position in world units. */
  x: number;
  y: number;
  /** `quest`, `vendor`, `enemy`, `ally`, `poi` — drives the marker colour. */
  kind?: 'quest' | 'vendor' | 'enemy' | 'ally' | 'poi' | 'objective';
  label?: string;
  /** Asset id to draw instead of the default dot. */
  icon?: string;
}

export interface MinimapOptions extends BaseOptions {
  /** Background map image URL. */
  map?: string;
  /** World size the map image covers. */
  worldWidth?: number;
  worldHeight?: number;
  /** Player position in world units. */
  x?: number;
  y?: number;
  /** Player facing in degrees, 0 = north. */
  heading?: number;
  size?: number;
  /** Circular mask (classic MMO) or a square frame. */
  shape?: 'round' | 'square';
  /** World units visible across the viewport. Lower = more zoomed in. */
  zoom?: number;
  pins?: MapPin[];
  /** Zone name shown along the top edge. */
  zone?: string;
}

/**
 * The corner minimap: a scrolling map image under a framed mask, with a
 * rotating player arrow and edge-clamped pins for quests, vendors and enemies.
 *
 * Emits `map:pin` when a pin is clicked and `map:click` with world coordinates.
 *
 *   const map = new Minimap({ map: '/maps/vale.png', worldWidth: 2000,
 *     worldHeight: 2000, zone: 'Emberwood Vale' });
 *   map.setPlayer(940, 1220, 45);
 */
export class Minimap extends FuiComponent<MinimapOptions> {
  private viewport: HTMLElement;
  private surface: HTMLElement;
  private arrow: HTMLElement;
  private pinLayer: HTMLElement;
  private px = 0;
  private py = 0;

  constructor(opts: MinimapOptions = {}) {
    const size = opts.size ?? 180;
    const root = h('div', {
      class: 'fui fui-minimap',
      dataset: { shape: opts.shape ?? 'round' },
      style: { width: `${size}px`, height: `${size}px` },
    });
    super(root, opts);

    this.viewport = h('div', { class: 'fui-minimap__viewport' });
    this.surface = h('div', { class: 'fui-minimap__surface' });
    if (opts.map) this.surface.style.backgroundImage = `url("${opts.map}")`;
    this.viewport.appendChild(this.surface);

    this.pinLayer = h('div', { class: 'fui-minimap__pins' });
    this.viewport.appendChild(this.pinLayer);

    this.arrow = h('div', { class: 'fui-minimap__arrow', attrs: { 'aria-hidden': 'true' } });
    this.viewport.appendChild(this.arrow);
    root.appendChild(this.viewport);

    root.appendChild(h('div', { class: 'fui-minimap__frame', attrs: { 'aria-hidden': 'true' } }));
    if (opts.zone) {
      root.appendChild(h('div', { class: 'fui-minimap__zone', text: opts.zone }));
    }

    this.viewport.addEventListener('click', (ev) => {
      const r = this.viewport.getBoundingClientRect();
      const zoom = this.opts.zoom ?? 400;
      const dx = (ev.clientX - r.left - r.width / 2) / r.width * zoom;
      const dy = (ev.clientY - r.top - r.height / 2) / r.height * zoom;
      this.emit('map:click', { x: this.px + dx, y: this.py + dy });
    });

    this.setPlayer(opts.x ?? 0, opts.y ?? 0, opts.heading ?? 0);
    this.setPins(opts.pins ?? []);
  }

  /** Move the player; the map scrolls under the mask and the arrow rotates. */
  setPlayer(x: number, y: number, heading?: number): this {
    this.px = x;
    this.py = y;
    const zoom = this.opts.zoom ?? 400;
    const ww = this.opts.worldWidth ?? 1000;
    const wh = this.opts.worldHeight ?? 1000;

    // Scale the map so `zoom` world units span the viewport, then offset it so
    // the player sits dead centre.
    const scale = (ww / zoom) * 100;
    this.surface.style.width = `${scale}%`;
    this.surface.style.height = `${(wh / zoom) * 100}%`;
    this.surface.style.left = `${50 - (x / ww) * scale}%`;
    this.surface.style.top = `${50 - (y / wh) * (wh / zoom) * 100}%`;

    if (heading != null) this.arrow.style.transform = `translate(-50%, -50%) rotate(${heading}deg)`;
    this.layoutPins();
    return this;
  }

  setPins(pins: MapPin[]): this {
    this.opts.pins = pins;
    while (this.pinLayer.firstChild) this.pinLayer.firstChild.remove();
    for (const pin of pins) {
      const node = h('span', {
        class: 'fui-minimap__pin',
        dataset: { kind: pin.kind ?? 'poi', id: pin.id },
        attrs: { title: pin.label },
      });
      if (pin.icon) {
        node.style.backgroundImage = `var(--fui-img-${pin.icon})`;
        node.classList.add('has-icon');
      }
      node.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.emit('map:pin', pin);
      });
      this.pinLayer.appendChild(node);
    }
    this.layoutPins();
    return this;
  }

  /** Place pins relative to the player, clamping off-screen ones to the edge. */
  private layoutPins(): void {
    const zoom = this.opts.zoom ?? 400;
    const nodes = Array.from(this.pinLayer.children) as HTMLElement[];
    (this.opts.pins ?? []).forEach((pin, i) => {
      const node = nodes[i];
      if (!node) return;
      // Fraction of the viewport half-width, so ±1 is the edge.
      const nx = ((pin.x - this.px) / zoom) * 2;
      const ny = ((pin.y - this.py) / zoom) * 2;
      const dist = Math.hypot(nx, ny);
      const edge = dist > 0.92;
      const k = edge ? 0.92 / dist : 1;
      node.classList.toggle('is-edge', edge);
      node.style.left = `${50 + clamp(nx * k, -1, 1) * 50}%`;
      node.style.top = `${50 + clamp(ny * k, -1, 1) * 50}%`;
    });
  }
}
