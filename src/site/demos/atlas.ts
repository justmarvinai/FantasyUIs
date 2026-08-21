import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { StageTrail } from '../../lib/components/StageTrail.ts';
import { RegionAtlas } from '../../lib/components/RegionAtlas.ts';

/** A full-width stack, for components that are a row in a real layout. */
const stack = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-col', style: { width: '100%', alignItems: 'stretch' } },
    ...kids.filter(Boolean));

export const ATLAS: CatalogEntry[] = [
  {
    id: 'StageTrail',
    name: 'StageTrail',
    group: 'gacha',
    blurb: 'The campaign as a path you scroll down — chapters, milestone chests and a difficulty track.',
    description:
      '`StageSelect` is the compact take: a row of numbered discs that drops into a panel. This is the full-screen one, and the two are interchangeable at the data level — both speak stages, stars, lock state and energy. The path is two SVG curves over the same points: the whole route drawn dim, and the walked part drawn bright on top, stopping at the last node the states say has been reached. Deriving that from the data rather than measuring the path at runtime is what lets the trail pre-render on the server and still be right.',
    tags: ['campaign', 'stages', 'trail', 'chapters', 'path', 'progress', 'milestone', 'chest', 'difficulty', 'map'],
    related: ['StageSelect', 'RegionAtlas', 'WorldMap', 'RewardTrack'],
    demos: [
      {
        title: 'Two chapters with milestone chests',
        note: 'Scroll — it opens centred on the current stage. Chests open once you have the stars.',
        build: () => {
          const trail = new StageTrail({
            title: 'Emberwood Vale',
            height: 560,
            energy: 42,
            autoScroll: true,
            difficulty: 'normal',
            difficulties: [
              { id: 'normal', label: 'Normal' },
              { id: 'hard', label: 'Hard' },
              { id: 'nightmare', label: 'Nightmare', locked: true, requirement: 'Clear Hard 6-10' },
            ],
            chapters: [
              {
                id: 'ch3',
                title: 'Chapter 3',
                subtitle: 'The Ashen Road',
                art: 'bg-wide',
                nodes: [
                  { id: '3-8', label: '8', name: 'Cinder Crossing', state: 'cleared', stars: 3, cost: 6 },
                  { id: '3-9', label: '9', name: 'Bone Orchard', state: 'cleared', stars: 2, cost: 6 },
                  { id: 'm-ch3', kind: 'chest', name: 'Ashen Cache', requires: 5, art: 'icon-chest' },
                  { id: '3-10', name: 'The Ashen Anvil', kind: 'boss', state: 'cleared', stars: 3, cost: 10,
                    art: 'blood-cursed-beast', note: 'Chapter boss' },
                ],
              },
              {
                id: 'ch4',
                title: 'Chapter 4',
                subtitle: 'The Sunken Gate',
                art: 'bg-scene-dark',
                nodes: [
                  { id: '4-1', label: '1', name: 'Ashfall Gate', state: 'cleared', stars: 3, cost: 8 },
                  { id: '4-2', label: '2', name: 'Sunken Road', state: 'cleared', stars: 1, cost: 8 },
                  { id: 'camp-4', kind: 'rest', name: 'Wayfarer Camp', state: 'cleared',
                    glyph: 'glyph-holy-totem', note: 'Heal and re-equip' },
                  { id: '4-3', label: '3', name: 'Rotmire', kind: 'elite', state: 'current', cost: 12,
                    art: 'hunt-dire-wolf', note: '80k power' },
                  { id: 'm-ch4', kind: 'chest', name: 'Vault of the Gate', requires: 24, art: 'icon-chest' },
                  { id: '4-4', label: '4', name: 'Drowned Shrine', kind: 'event', state: 'locked', cost: 12,
                    glyph: 'glyph-arcane-symbol' },
                  { id: '4-5', label: '5', name: 'The Maw', kind: 'boss', state: 'locked', cost: 20,
                    art: 'blood-plague-drake', note: 'Chapter boss' },
                ],
              },
            ],
          });
          trail.on<{ name?: string }>('trail:select', (node) => console.log('enter', node.name));
          trail.on<string>('trail:claim', (id) => console.log('claimed', id));
          return trail.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'RegionAtlas',
    name: 'RegionAtlas',
    group: 'widgets',
    blurb: 'The world as territory — pan and zoom shaped regions, coloured by who holds them, fog over the rest.',
    description:
      '`WorldMap` is the campaign take: a handful of nodes on painted art joined by a path, one chapter at a time. This is the atlas, and it answers "who owns the north" and "what is over there", which a node map cannot. Everything lives in one 0–100 space moved by a single transform on a group, so a pan costs one matrix rather than a layout pass. Labels counter-scale by the same factor — that is what keeps a place name readable at 3× instead of turning it into a billboard — and each region’s name hangs off its own outline’s centroid, so moving a shape moves its label with it.',
    tags: ['world map', 'atlas', 'territory', 'region', 'pan', 'zoom', 'faction', 'fog', 'overworld', 'travel'],
    related: ['WorldMap', 'StageTrail', 'Minimap', 'DungeonMap'],
    demos: [
      {
        title: 'Six territories across the Ashen Reach',
        note: 'Drag to pan once zoomed, scroll to zoom, click a territory for its card.',
        build: () => {
          const atlas = new RegionAtlas({
            title: 'The Ashen Reach',
            height: 480,
            art: 'bg-wide',
            legend: true,
            detail: true,
            action: 'Travel here',
            selected: 'vale',
            maxZoom: 4,
            factions: [
              { id: 'crown', label: 'The Crown', color: '#4a8ede' },
              { id: 'covenant', label: 'Ashvale Covenant', color: '#6fb3a8' },
              { id: 'blight', label: 'The Blight', color: '#a335ee' },
              { id: 'free', label: 'Unclaimed', color: '#8b8578' },
            ],
            regions: [
              { id: 'vale', name: 'Emberwood Vale', faction: 'covenant', levels: '24–31',
                progress: 0.72, note: 'Cleared to the river',
                shape: [[6, 26], [28, 14], [40, 30], [34, 52], [12, 54]] },
              { id: 'crownlands', name: 'The Crownlands', faction: 'crown', levels: '18–24',
                progress: 1, cleared: true,
                shape: [[28, 14], [56, 8], [64, 26], [40, 30]] },
              { id: 'rotmire', name: 'Rotmire', faction: 'blight', levels: '32–40',
                progress: 0.18, note: 'The bog is still spreading',
                shape: [[34, 52], [40, 30], [64, 26], [70, 50], [50, 66]] },
              { id: 'reach', name: 'The Iron Reach', faction: 'free', levels: '28–35',
                progress: 0.4,
                shape: [[64, 26], [88, 18], [94, 44], [70, 50]] },
              { id: 'sunken', name: 'The Sunken Gate', faction: 'blight', levels: '40–46',
                progress: 0,
                shape: [[12, 54], [34, 52], [50, 66], [42, 88], [14, 82]] },
              { id: 'north', name: 'Uncharted', fogged: true,
                shape: [[50, 66], [70, 50], [94, 44], [92, 84], [58, 92]] },
            ],
            sites: [
              { id: 'ashfall', name: 'Ashfall Gate', x: 20, y: 34, kind: 'town', level: 24, here: true },
              { id: 'anvil', name: 'The Ashen Anvil', x: 30, y: 46, kind: 'dungeon', level: 28 },
              { id: 'keep', name: 'Highkeep', x: 45, y: 19, kind: 'town', level: 18 },
              { id: 'ford', name: 'Crow Ford', x: 57, y: 22, kind: 'camp', level: 21 },
              { id: 'bog', name: 'Bogwarden Hollow', x: 52, y: 42, kind: 'boss', level: 36 },
              { id: 'spire', name: 'Ember Spire', x: 80, y: 34, kind: 'dungeon', level: 33 },
              { id: 'port', name: 'Saltmourn', x: 88, y: 28, kind: 'port', level: 30 },
              { id: 'shrine', name: 'Drowned Shrine', x: 26, y: 70, kind: 'quest', level: 42 },
              { id: 'maw', name: 'The Maw', x: 40, y: 78, kind: 'boss', level: 46 },
            ],
          });
          atlas.on<string>('atlas:enter', (id) => console.log('travel to', id));
          atlas.on<string>('atlas:site', (id) => console.log('open', id));
          return atlas.el;
        },
        stage: 'wide',
      },
      {
        title: 'Static, as an illustration',
        note: 'With `static: true` there is no panning, zooming or detail card — just the map.',
        build: () =>
          stack(
            new RegionAtlas({
              height: 220,
              static: true,
              detail: false,
              legend: false,
              selected: 'rotmire',
              factions: [
                { id: 'crown', label: 'The Crown', color: '#4a8ede' },
                { id: 'blight', label: 'The Blight', color: '#a335ee' },
              ],
              regions: [
                { id: 'crownlands', name: 'The Crownlands', faction: 'crown',
                  shape: [[10, 18], [46, 10], [54, 40], [18, 52]] },
                { id: 'rotmire', name: 'Rotmire', faction: 'blight',
                  shape: [[54, 40], [46, 10], [86, 16], [92, 58], [60, 70]] },
                { id: 'south', name: 'Uncharted', fogged: true,
                  shape: [[18, 52], [54, 40], [60, 70], [30, 88]] },
              ],
            }).el,
          ),
        stage: 'wide',
      },
    ],
  },
];
