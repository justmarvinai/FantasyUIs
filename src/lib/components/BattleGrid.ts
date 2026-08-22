import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface GridUnit {
  id: string;
  name?: string;
  /** Column and row, 0-based. */
  x: number;
  y: number;
  /** Manifest asset id for the portrait. */
  art?: string;
  side?: 'ally' | 'enemy' | 'neutral';
  /** Health left, 0–1. */
  health?: number;
  /** How far it can walk. */
  move?: number;
  /** How far it can strike after moving. */
  range?: number;
  /** Already acted this round. */
  spent?: boolean;
  /** Which way it faces, for a facing-aware game. */
  facing?: 'n' | 'e' | 's' | 'w';
}

export interface GridTerrain {
  x: number;
  y: number;
  /** What is there. `wall` blocks movement and sight. */
  kind: 'wall' | 'rough' | 'water' | 'hazard' | 'cover' | 'goal';
  /** Extra movement it costs. `rough` defaults to 1. */
  cost?: number;
  label?: string;
}

export interface BattleGridOptions extends BaseOptions {
  /** Board width in tiles. */
  cols: number;
  /** Board height in tiles. */
  rows: number;
  /** Everyone on the board. */
  units: GridUnit[];
  /** Walls, water, hazards and cover. */
  terrain?: GridTerrain[];
  /** Which unit is selected. Its reach is drawn. */
  selected?: string;
  /** Cell size in pixels. */
  cell?: number;
  /** Heading over the board. */
  title?: string;
  /** Draw coordinates down the side and across the top. */
  coords?: boolean;
  /** Read-only: no selecting, no moving. */
  readonly?: boolean;
}

/**
 * The tactics board: units on a grid, terrain that costs or blocks, and the
 * reach of whoever is selected drawn over it. `FormationGrid` is the 3×3 slot
 * board a squad RPG arranges a team in; this is the one a turn is played on.
 *
 *   const board = new BattleGrid({
 *     title: 'The Sunken Road', cols: 10, rows: 7, cell: 44, selected: 'vex',
 *     terrain: [{ x: 4, y: 2, kind: 'wall' }, { x: 5, y: 4, kind: 'water', cost: 2 }],
 *     units: [
 *       { id: 'vex', name: 'Vexhollow', x: 2, y: 3, side: 'ally', move: 4, range: 2, health: 0.8 },
 *       { id: 'brute', name: 'Bog Brute', x: 7, y: 3, side: 'enemy', health: 1 },
 *     ],
 *   });
 *   board.on<{ x: number; y: number }>('grid:move', (to) => turn.moveTo(to));
 *
 * Reach is flood-filled through the terrain's own costs rather than drawn as a
 * diamond, so a unit with four movement cannot cross a wall by counting to four
 * around it — the highlight and the rules are the same computation. Attack
 * range is measured from every reachable cell, which is why a melee unit shows
 * threat well past its own move.
 */
export class BattleGrid extends FuiComponent<BattleGridOptions> {
  private board: HTMLElement;

  constructor(opts: BattleGridOptions) {
    const root = h('div', {
      class: 'fui fui-bgrid',
      dataset: { coords: String(!!opts.coords) },
      style: {
        '--fui-bgrid-cell': `${opts.cell ?? 42}px`,
        '--fui-bgrid-cols': String(opts.cols),
        '--fui-bgrid-rows': String(opts.rows),
      },
    });
    super(root, opts);

    if (opts.title) {
      root.appendChild(h('span', { class: 'fui-bgrid__title fui-title', text: opts.title }));
    }
    this.board = h('div', { class: 'fui-bgrid__board' });
    root.appendChild(this.board);
    this.render();
  }

  /** The unit standing on a cell, if any. */
  unitAt(x: number, y: number): GridUnit | undefined {
    return this.opts.units.find((u) => u.x === x && u.y === y);
  }

  /** The terrain on a cell, if any. */
  terrainAt(x: number, y: number): GridTerrain | undefined {
    return this.opts.terrain?.find((t) => t.x === x && t.y === y);
  }

  /** What entering a cell costs, or `null` when it cannot be entered. */
  costOf(x: number, y: number, mover: GridUnit): number | null {
    if (x < 0 || y < 0 || x >= this.opts.cols || y >= this.opts.rows) return null;
    const terrain = this.terrainAt(x, y);
    if (terrain?.kind === 'wall') return null;
    const blocker = this.unitAt(x, y);
    // You may pass through a friend but not stop on them; an enemy blocks.
    if (blocker && blocker.id !== mover.id && blocker.side !== mover.side) return null;
    if (terrain?.cost != null) return Math.max(1, terrain.cost);
    return terrain?.kind === 'rough' || terrain?.kind === 'water' ? 2 : 1;
  }

  /**
   * Every cell a unit can walk to, flood-filled through the real costs. The
   * highlight and the rules are the same computation, so a wall the player can
   * see is a wall the game agrees with.
   */
  reachable(unit: GridUnit): Map<string, number> {
    const out = new Map<string, number>([[`${unit.x},${unit.y}`, 0]]);
    const budget = unit.move ?? 0;
    if (budget <= 0) return out;
    // Dijkstra by budget: cheap enough at board sizes, and correct with costs
    // that a breadth-first search would get wrong.
    let frontier: Array<[number, number, number]> = [[unit.x, unit.y, 0]];
    while (frontier.length) {
      const next: Array<[number, number, number]> = [];
      for (const [x, y, spent] of frontier) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          const step = this.costOf(nx, ny, unit);
          if (step == null) continue;
          const total = spent + step;
          if (total > budget) continue;
          const key = `${nx},${ny}`;
          if (out.has(key) && (out.get(key) as number) <= total) continue;
          out.set(key, total);
          next.push([nx, ny, total]);
        }
      }
      frontier = next;
    }
    return out;
  }

  /** Every cell a unit threatens — its range from anywhere it can stand. */
  threatened(unit: GridUnit): Set<string> {
    const reach = this.reachable(unit);
    const range = unit.range ?? 1;
    const out = new Set<string>();
    for (const key of reach.keys()) {
      const [sx, sy] = key.split(',').map(Number);
      for (let dy = -range; dy <= range; dy++) {
        for (let dx = -range; dx <= range; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > range) continue;
          const x = sx + dx;
          const y = sy + dy;
          if (x < 0 || y < 0 || x >= this.opts.cols || y >= this.opts.rows) continue;
          out.add(`${x},${y}`);
        }
      }
    }
    return out;
  }

  /** Select a unit, drawing its reach. */
  select(id: string | undefined): this {
    this.opts.selected = id;
    this.render();
    if (id) this.emit('grid:select', id);
    return this;
  }

  /** Replace the board state. */
  setUnits(units: GridUnit[]): this {
    this.opts.units = units;
    this.render();
    return this;
  }

  private render(): void {
    clear(this.board);
    const selected = this.opts.units.find((u) => u.id === this.opts.selected);
    const reach = selected ? this.reachable(selected) : new Map<string, number>();
    const threat = selected ? this.threatened(selected) : new Set<string>();

    for (let y = 0; y < this.opts.rows; y++) {
      for (let x = 0; x < this.opts.cols; x++) {
        const key = `${x},${y}`;
        const terrain = this.terrainAt(x, y);
        const unit = this.unitAt(x, y);
        const walkable = reach.has(key) && !unit;
        const threatens = threat.has(key) && !walkable;

        const cell = h('div', {
          class: 'fui-bgrid__cell',
          dataset: {
            kind: terrain?.kind ?? '',
            reach: walkable ? 'move' : threatens ? 'threat' : '',
            x: String(x),
            y: String(y),
          },
          attrs: { title: terrain?.label ?? '' },
        });
        if (walkable && !this.opts.readonly) {
          cell.addEventListener('click', () => this.emit('grid:move', { x, y }));
        }
        this.board.appendChild(cell);
      }
    }

    for (const unit of this.opts.units) {
      const el = h(this.opts.readonly ? 'div' : 'button', {
        class: 'fui-bgrid__unit',
        dataset: {
          side: unit.side ?? 'neutral',
          on: String(unit.id === this.opts.selected),
          spent: String(!!unit.spent),
          facing: unit.facing ?? '',
        },
        style: {
          gridColumn: String(unit.x + 1),
          gridRow: String(unit.y + 1),
          '--fui-bgrid-hp': String(Math.max(0, Math.min(1, unit.health ?? 1))),
        },
        attrs: { type: this.opts.readonly ? undefined : 'button', title: unit.name ?? unit.id },
      });
      const art = h('span', { class: 'fui-bgrid__art' });
      if (unit.art) art.style.backgroundImage = `var(--fui-img-${unit.art})`;
      el.appendChild(art);
      el.appendChild(h('span', { class: 'fui-bgrid__hp' }));
      if (!this.opts.readonly) {
        el.addEventListener('click', () =>
          this.select(unit.id === this.opts.selected ? undefined : unit.id),
        );
      }
      this.board.appendChild(el);
    }
  }
}
