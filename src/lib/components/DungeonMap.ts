import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export type RoomKind =
  | 'empty'
  | 'battle'
  | 'elite'
  | 'boss'
  | 'treasure'
  | 'shop'
  | 'rest'
  | 'event'
  | 'start';

export interface DungeonRoom {
  id: string;
  /** Column, 0-based. */
  x: number;
  /** Row, 0-based. */
  y: number;
  kind?: RoomKind;
  /** Glyph asset id, overriding the kind's default marker. */
  glyph?: string;
  label?: string;
  /** Already cleared. */
  cleared?: boolean;
  /** Seen but not entered. */
  seen?: boolean;
  /** Room ids this one connects to. Corridors are drawn from these. */
  links?: string[];
}

export interface DungeonMapOptions extends BaseOptions {
  /** Every room on the floor, placed by its own x / y. */
  rooms: DungeonRoom[];
  /** Where the party is standing. */
  at?: string;
  /** Heading over the map. */
  title?: string;
  /** Floor label, e.g. "Floor 3". */
  floor?: string;
  /** Room size in pixels. */
  size?: number;
  /** Gap between rooms in pixels. */
  gap?: number;
  /** Reveal the whole floor instead of only what has been seen. */
  revealed?: boolean;
  /** Turn clicking off — a read-only minimap. */
  readonly?: boolean;
}

const MARKERS: Record<RoomKind, string> = {
  empty: '',
  battle: '⚔',
  elite: '☠',
  boss: '♛',
  treasure: '❖',
  shop: '⛁',
  rest: '✚',
  event: '?',
  start: '⌂',
};

/**
 * The floor plan of a run — rooms on a grid, corridors between them, and the
 * fog that keeps the rest of the floor a question. `WorldMap` places campaign
 * nodes on painted art; this is the procedural grid a roguelike run draws
 * fresh every time.
 *
 *   const map = new DungeonMap({
 *     title: 'The Sunken Vault', floor: 'Floor 3', at: 'r5',
 *     rooms: [
 *       { id: 'r1', x: 0, y: 1, kind: 'start', cleared: true, links: ['r2'] },
 *       { id: 'r5', x: 2, y: 1, kind: 'elite', links: ['r6', 'r7'] },
 *     ],
 *   });
 *   map.on<string>('dungeon:enter', (id) => run.move(id));
 *
 * Only rooms linked to where the party stands can be entered, and that rule is
 * computed from the same `links` the corridors are drawn from — so a room the
 * player can see a path to is always a room they can walk to. Fog hides a room's
 * *kind*, never its existence: the shape of the floor is information, what is
 * waiting in it is not.
 */
export class DungeonMap extends FuiComponent<DungeonMapOptions> {
  private grid: HTMLElement;
  private svg: SVGSVGElement;

  constructor(opts: DungeonMapOptions) {
    const size = opts.size ?? 44;
    const gap = opts.gap ?? 22;
    const cols = Math.max(1, ...opts.rooms.map((r) => r.x + 1));
    const rows = Math.max(1, ...opts.rooms.map((r) => r.y + 1));
    const root = h('div', {
      class: 'fui fui-dmap',
      style: {
        '--fui-dmap-size': `${size}px`,
        '--fui-dmap-gap': `${gap}px`,
        '--fui-dmap-cols': String(cols),
        '--fui-dmap-rows': String(rows),
      },
    });
    super(root, opts);

    if (opts.title || opts.floor) {
      const head = h('div', { class: 'fui-dmap__head' });
      if (opts.title) {
        head.appendChild(h('span', { class: 'fui-dmap__title fui-title', text: opts.title }));
      }
      if (opts.floor) {
        head.appendChild(h('span', { class: 'fui-dmap__floor fui-num', text: opts.floor }));
      }
      root.appendChild(head);
    }

    const stage = h('div', { class: 'fui-dmap__stage' });
    const NS = 'http://www.w3.org/2000/svg';
    this.svg = root.ownerDocument.createElementNS(NS, 'svg') as SVGSVGElement;
    this.svg.setAttribute('class', 'fui-dmap__links');
    this.svg.setAttribute('preserveAspectRatio', 'none');
    this.svg.setAttribute('aria-hidden', 'true');
    stage.appendChild(this.svg);

    this.grid = h('div', { class: 'fui-dmap__grid' });
    stage.appendChild(this.grid);
    root.appendChild(stage);
    this.render();
  }

  /** Where the party is standing. */
  get(): string | undefined {
    return this.opts.at;
  }

  /** Rooms the party can walk to from where they are. */
  reachable(): DungeonRoom[] {
    const here = this.opts.rooms.find((r) => r.id === this.opts.at);
    if (!here) return [];
    // Links are treated as two-way: a corridor drawn between two rooms is a
    // corridor you can walk in either direction, which is what the picture says.
    const ids = new Set(here.links ?? []);
    for (const r of this.opts.rooms) if (r.links?.includes(here.id)) ids.add(r.id);
    return this.opts.rooms.filter((r) => ids.has(r.id));
  }

  /** Move the party. Refuses a room there is no corridor to. */
  enter(id: string): this {
    if (!this.reachable().some((r) => r.id === id)) return this;
    const here = this.opts.rooms.find((r) => r.id === this.opts.at);
    if (here) here.cleared = true;
    this.opts.at = id;
    const room = this.opts.rooms.find((r) => r.id === id);
    if (room) room.seen = true;
    // Standing in a room reveals what is next to it — the loop that makes a
    // roguelike floor unfold as you walk it.
    for (const next of this.reachable()) next.seen = true;
    this.render();
    this.emit('dungeon:enter', id);
    return this;
  }

  /** Replace the floor, e.g. after descending. */
  setRooms(rooms: DungeonRoom[], at?: string): this {
    this.opts.rooms = rooms;
    if (at) this.opts.at = at;
    this.render();
    return this;
  }

  private render(): void {
    clear(this.grid);
    clear(this.svg);
    const cols = Math.max(1, ...this.opts.rooms.map((r) => r.x + 1));
    const rows = Math.max(1, ...this.opts.rooms.map((r) => r.y + 1));
    this.el.style.setProperty('--fui-dmap-cols', String(cols));
    this.el.style.setProperty('--fui-dmap-rows', String(rows));
    this.svg.setAttribute('viewBox', `0 0 ${cols * 100} ${rows * 100}`);

    const reachable = new Set(this.reachable().map((r) => r.id));
    const byId = new Map(this.opts.rooms.map((r) => [r.id, r]));
    const centre = (r: DungeonRoom) => ({ x: r.x * 100 + 50, y: r.y * 100 + 50 });

    const NS = 'http://www.w3.org/2000/svg';
    const drawn = new Set<string>();
    for (const room of this.opts.rooms) {
      for (const id of room.links ?? []) {
        const other = byId.get(id);
        if (!other) continue;
        const key = [room.id, id].sort().join('|');
        if (drawn.has(key)) continue;
        drawn.add(key);
        const a = centre(room);
        const b = centre(other);
        const line = this.svg.ownerDocument.createElementNS(NS, 'line');
        line.setAttribute('class', 'fui-dmap__link');
        line.setAttribute('x1', String(a.x));
        line.setAttribute('y1', String(a.y));
        line.setAttribute('x2', String(b.x));
        line.setAttribute('y2', String(b.y));
        const lit = room.id === this.opts.at || id === this.opts.at;
        const known =
          this.opts.revealed || (this.isKnown(room) && this.isKnown(other));
        if (lit) line.classList.add('is-open');
        else if (!known) line.classList.add('is-fog');
        this.svg.appendChild(line);
      }
    }

    for (const room of this.opts.rooms) {
      const known = this.opts.revealed || this.isKnown(room);
      const here = room.id === this.opts.at;
      const canEnter = reachable.has(room.id);
      const kind = room.kind ?? 'empty';

      const cell = h(this.opts.readonly || !canEnter ? 'div' : 'button', {
        class: 'fui-dmap__room',
        dataset: {
          kind: known ? kind : 'fog',
          state: here ? 'here' : room.cleared ? 'cleared' : canEnter ? 'open' : 'far',
        },
        style: { gridColumn: String(room.x + 1), gridRow: String(room.y + 1) },
        attrs: {
          type: this.opts.readonly || !canEnter ? undefined : 'button',
          title: known ? (room.label ?? kind) : 'Unexplored',
          'aria-label': known ? (room.label ?? kind) : 'Unexplored room',
        },
      });

      const mark = h('span', { class: 'fui-dmap__mark', attrs: { 'aria-hidden': 'true' } });
      if (known && room.glyph) {
        mark.classList.add('is-glyph');
        mark.style.setProperty('--fui-glyph-src', `var(--fui-img-${room.glyph})`);
      } else {
        mark.textContent = known ? MARKERS[kind] : '?';
      }
      cell.appendChild(mark);
      if (here) cell.appendChild(h('span', { class: 'fui-dmap__party', attrs: { 'aria-hidden': 'true' } }));

      if (canEnter && !this.opts.readonly) {
        cell.addEventListener('click', () => this.enter(room.id));
      }
      this.grid.appendChild(cell);
    }
  }

  /** A room is known once it has been seen, cleared, or is where you stand. */
  private isKnown(room: DungeonRoom): boolean {
    return !!room.seen || !!room.cleared || room.id === this.opts.at;
  }
}
