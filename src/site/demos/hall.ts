import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { Pedestal } from '../../lib/components/Pedestal.ts';
import { RuneCircle } from '../../lib/components/RuneCircle.ts';
import { Tabletop } from '../../lib/components/Tabletop.ts';
import { Signpost } from '../../lib/components/Signpost.ts';
import { StainedGlass } from '../../lib/components/StainedGlass.ts';

/** A row of examples, wrapping on narrow screens. */
const row = (...kids: Node[]) =>
  h('div', { class: 'demo-row', style: { gap: '18px', flexWrap: 'wrap' } }, ...kids);

export const HALL: CatalogEntry[] = [
  {
    id: 'Pedestal',
    name: 'Pedestal',
    group: 'surfaces',
    blurb: 'A lit plinth that puts one object on show — reward reveals, shrine offerings, the item you just pulled.',
    description:
      'Games stage single objects constantly: the sword you just forged, the hero the banner is selling, the relic on the altar. A `Slot` says "this fits here"; a Pedestal says "look at this". It is a base, a cone of light, a drifting mote field and a slot for whatever you want to show — art id, a component, or arbitrary DOM. Rarity drives the light colour, so a legendary reveal is one prop away from a common one.',
    tags: ['pedestal', 'plinth', 'display', 'reveal', 'showcase', 'altar', 'shrine', 'spotlight', 'reward', 'trophy'],
    related: ['Slot', 'ItemCard', 'SummonResult', 'RuneCircle'],
    demos: [
      {
        title: 'Three rarities on show',
        note: 'Rarity tints the spotlight and the base; `turning` adds the slow idle rotation.',
        build: () =>
          row(
            new Pedestal({
              art: 'weapon-sunblade',
              label: 'Dawnbreaker',
              note: 'Legendary blade',
              rarity: 'legendary',
              turning: true,
              spotlight: true,
              motes: 14,
            }).el,
            new Pedestal({
              art: 'rune-radiant-gem',
              label: 'Seer’s Eye',
              note: 'Epic relic',
              rarity: 'epic',
              base: 'arcane',
              motes: 8,
            }).el,
            new Pedestal({
              art: 'icon-potion',
              label: 'Elixir',
              note: 'Common',
              rarity: 'common',
              height: 210,
            }).el,
          ),
        stage: 'scene',
      },
    ],
  },
  {
    id: 'RuneCircle',
    name: 'RuneCircle',
    group: 'surfaces',
    blurb: 'Concentric turning rings of glyphs and ticks — a summoning circle you can put anything in the middle of.',
    description:
      'The magic-circle motif is everywhere in fantasy UI: summon screens, channel bars, portal loaders, ritual crafting. This is that motif as a configurable surface. Each ring declares its radius, its glyph list, its tick count and its rotation speed, and glyphs counter-rotate so they stay upright however fast the ring turns — the detail that separates a summoning circle from a spinning sticker.',
    tags: ['rune', 'circle', 'magic', 'summon', 'ritual', 'portal', 'sigil', 'arcane', 'channel', 'loader'],
    related: ['Pedestal', 'SummonResult', 'CastBar', 'Glyph'],
    demos: [
      {
        title: 'A summoning circle with a hero inside',
        note: 'Three rings turning at different speeds; the innermost carries glyphs, the outer two carry ticks.',
        build: () => {
          const circle = new RuneCircle({
            size: 280,
            color: '#c8a24a',
            charge: 0.72,
            art: 'hero-emberknight',
            rings: [
              { at: 1, ticks: 60, spin: 80, line: true },
              { at: 0.86, ticks: 12, spin: -46, line: true },
              {
                at: 0.66,
                spin: 30,
                glyphs: [
                  'glyph-magic-flame',
                  'glyph-arcane-symbol',
                  'glyph-celestial-body',
                  'glyph-spirit-vortex',
                  'glyph-spell-casting',
                  'glyph-holy-totem',
                ],
              },
            ],
          });
          return circle.el;
        },
        stage: 'scene',
      },
      {
        title: 'Still, as a decorative frame',
        note: '`still: true` stops every ring — useful behind a portrait where motion would distract.',
        build: () =>
          new RuneCircle({
            size: 200,
            still: true,
            sides: 6,
            color: '#6fb3a8',
            content: h('div', { style: { textAlign: 'center', fontWeight: '700' } }, 'Lv 42'),
          }).el,
        stage: 'scene',
      },
    ],
  },
  {
    id: 'Tabletop',
    name: 'Tabletop',
    group: 'surfaces',
    blurb: 'A felt playing surface with a wooden rail and labelled drop zones — card games, board battlers, deck builders.',
    description:
      'Card games need a table, and a table is not a panel: it is felt, a rail, an inlay, and a set of named regions that cards belong to. Tabletop gives you rows of zones — each with a label, a span and a drop flag — so the layout of a battlefield is declarative data rather than a nest of flexbox. The zones expose their own elements, so you drop `Card`s straight in.',
    tags: ['tabletop', 'table', 'felt', 'card game', 'board', 'deck', 'zones', 'battlefield', 'tcg', 'playmat'],
    related: ['SkillCard', 'ItemCard', 'BattleGrid', 'Panel'],
    demos: [
      {
        title: 'A two-row battlefield',
        note: 'Zones are declared as rows; `span` gives a zone more width than its neighbours.',
        build: () => {
          const table = new Tabletop({
            title: 'The Long Table',
            felt: 'green',
            rail: 'walnut',
            height: 320,
            inlay: true,
            rows: [
              [
                { id: 'foe-deck', label: 'Deck' },
                { id: 'foe-field', label: 'Enemy field', span: 3, drop: true },
                { id: 'foe-grave', label: 'Discard' },
              ],
              [
                { id: 'my-deck', label: 'Deck' },
                { id: 'my-field', label: 'Your field', span: 3, drop: true },
                { id: 'my-grave', label: 'Discard' },
              ],
            ],
          });
          table.on<string>('table:drop', (zone) => console.log('dropped into', zone));
          return table.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'Signpost',
    name: 'Signpost',
    group: 'surfaces',
    blurb: 'A wooden crossroads sign whose arms are your navigation — hub menus that live in the world, not over it.',
    description:
      'Cosy and adventure games often refuse to draw a menu bar; they put the choices on a signpost at the crossroads instead. Each arm is a destination with a side, a tilt, a glyph and a lock state, and the whole thing is buttons underneath — so keyboard navigation, focus rings and screen readers work exactly as they would on a nav.',
    tags: ['signpost', 'sign', 'crossroads', 'navigation', 'hub', 'menu', 'wooden', 'destinations', 'diegetic', 'town'],
    related: ['SideNav', 'Minimap', 'RegionAtlas', 'WorldMap'],
    demos: [
      {
        title: 'Four ways out of town',
        note: 'A locked arm keeps its place and prints its requirement rather than disappearing.',
        build: () => {
          const post = new Signpost({
            title: 'Crossroads',
            wood: 'oak',
            lantern: true,
            height: 300,
            arms: [
              { id: 'town', label: 'Emberhold', note: 'Town', side: 'left', glyph: 'glyph-holy-totem', current: true },
              { id: 'wilds', label: 'The Wilds', note: 'Lv 20+', side: 'right', glyph: 'glyph-thorny-branch', tilt: -3 },
              { id: 'mine', label: 'Deepmine', note: 'Lv 34+', side: 'left', glyph: 'glyph-hammer-hit', tilt: 2 },
              { id: 'peak', label: 'Ashen Peak', note: 'Clear Deepmine first', side: 'right', glyph: 'glyph-flaming-skull', locked: true },
            ],
          });
          post.on<string>('signpost:go', (id) => console.log('travel to', id));
          return post.el;
        },
        stage: 'scene',
      },
    ],
  },
  {
    id: 'StainedGlass',
    name: 'StainedGlass',
    group: 'surfaces',
    blurb: 'A leaded window of coloured panes with light behind it — cathedral menus, temple screens, cutscene backdrops.',
    description:
      'A stained-glass window is a backdrop that carries a whole art direction on its own: temples, paladin orders, oath screens, church-flavoured menus. Rows of panes each declare a colour, a span and an optional glyph; the lead between them and the arch above are drawn in CSS, so the whole window is a handful of numbers and no art at all. Put content in the middle and it sits in front of the light.',
    tags: ['stained glass', 'window', 'cathedral', 'temple', 'church', 'leaded', 'panes', 'backdrop', 'holy', 'paladin'],
    related: ['Panel', 'Pedestal', 'DialogueBox', 'TitleGate'],
    demos: [
      {
        title: 'A gothic window behind an oath',
        note: 'Panes carry glyphs; `light` drives how strongly the window glows through.',
        build: () => {
          const glass = new StainedGlass({
            arch: 'gothic',
            height: 340,
            lead: 4,
            light: 0.85,
            rose: 'glyph-celestial-body',
            rows: [
              [
                { color: '#3b6ea5', glyph: 'glyph-peace-dove' },
                { color: '#c9502a', span: 1.5, glyph: 'glyph-holy-cross' },
                { color: '#3b6ea5', glyph: 'glyph-eagle-staff' },
              ],
              [
                { color: '#c9a248', span: 1.2 },
                { color: '#2f6b53', glyph: 'glyph-nature-shield' },
                { color: '#7a3d8f', span: 1.2 },
              ],
              [
                { color: '#2f6b53' },
                { color: '#3b6ea5', span: 1.4, dark: true },
                { color: '#c9502a' },
              ],
            ],
          });
          return glass.el;
        },
        stage: 'scene',
      },
    ],
  },
];
