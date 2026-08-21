import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { Scroll } from '../../lib/components/Scroll.ts';
import { OrnateHeader } from '../../lib/components/OrnateHeader.ts';
import { SceneBackdrop } from '../../lib/components/SceneBackdrop.ts';
import { CheckList } from '../../lib/components/CheckList.ts';
import { RangeSlider } from '../../lib/components/RangeSlider.ts';
import { KeybindInput } from '../../lib/components/KeybindInput.ts';
import { Sparkline } from '../../lib/components/Sparkline.ts';
import { Gauge } from '../../lib/components/Gauge.ts';
import { Timeline } from '../../lib/components/Timeline.ts';

const row = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-row' }, ...kids.filter(Boolean));
/** A full-width stack, for components that are a row in a real layout. */
const stack = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-col', style: { width: '100%', alignItems: 'stretch' } },
    ...kids.filter(Boolean));

export const CHROME: CatalogEntry[] = [
  {
    id: 'Scroll',
    name: 'Scroll',
    group: 'surfaces',
    blurb: 'A parchment sheet for text meant to be read rather than scanned.',
    description:
      'Every other surface in the library is tuned for scanning; this one is tuned for a paragraph. It sets a real reading measure and leading, drops a capital on the first line, and takes a wax seal. Use it for a letter from an NPC, a lore entry or an in-world notice.',
    tags: ['scroll', 'parchment', 'letter', 'lore', 'note', 'prose', 'seal', 'quest text'],
    related: ['DialogueBox', 'Panel', 'QuestLog', 'CodexEntry'],
    demos: [
      {
        title: 'A letter, rolled and sealed',
        build: () =>
          new Scroll({
            title: 'The Sunken Gate',
            subtitle: 'From Elder Rowan, of Emberwood',
            rolled: true,
            width: 440,
            seal: '#8c2a20',
            sealGlyph: 'glyph-holy-totem',
            text:
              'A gate lies beneath the marsh, and it has stayed shut for three generations. ' +
              'My grandmother helped seal it. She would not say what against.\n\n' +
              'Last night the water above it went still. Not calm — still, the way a room ' +
              'goes quiet when something has stopped breathing.\n\n' +
              'Find the key. Find out what is knocking.',
            signature: '— Rowan',
          }).el,
        stage: 'wide',
      },
      {
        title: 'A torn notice',
        note: 'Without `rolled` the sheet gets a deckle edge instead of caps.',
        build: () =>
          new Scroll({
            title: 'Notice',
            width: 320,
            tilt: -1.2,
            text: 'Bounties posted at dawn. Payment on proof, not on promises.',
            signature: '— The Ashen Anvil',
          }).el,
      },
    ],
  },

  {
    id: 'OrnateHeader',
    name: 'OrnateHeader',
    group: 'surfaces',
    blurb: 'A section heading whose flourish scales with the title.',
    description:
      'The `divider` variant mirrors one ornament either side of the heading, so the flourish spans whatever room the title leaves instead of being a fixed-width image dropped above it. `banner` uses the theme’s painted ribbon; `rule` is an engraved hairline for dense settings screens.',
    tags: ['header', 'heading', 'section', 'divider', 'ornament', 'title', 'ribbon', 'chapter'],
    related: ['Divider', 'Banner', 'Panel', 'TintFrame'],
    demos: [
      {
        title: 'Three variants',
        build: () =>
          stack(
            new OrnateHeader({
              title: 'The Ashen Anvil',
              eyebrow: 'Chapter II',
              variant: 'divider',
              divider: 3,
              glyph: 'glyph-hammer-hit',
            }).el,
            new OrnateHeader({
              title: 'Rewards',
              variant: 'banner',
              glyph: 'glyph-trophy-cup',
            }).el,
            new OrnateHeader({
              title: 'Audio',
              variant: 'rule',
              align: 'left',
              size: 'sm',
              subtitle: 'Music, effects and voice',
            }).el,
          ),
        stage: 'wide',
      },
      {
        title: 'The divider set',
        note: 'Six ornaments, faded or solid, tinted to anything.',
        build: () =>
          stack(
            ...[1, 2, 3, 4, 5, 6].map(
              (n, i) =>
                new OrnateHeader({
                  title: `Divider ${n}`,
                  variant: 'divider',
                  divider: n,
                  fade: i % 2 === 1,
                  size: 'sm',
                  tint: i % 2 === 1 ? 'var(--fui-accent)' : 'var(--fui-gold)',
                }).el,
            ),
          ),
        stage: 'wide',
      },
    ],
  },

  {
    id: 'SceneBackdrop',
    name: 'SceneBackdrop',
    group: 'surfaces',
    blurb: 'Layered painted art with pointer parallax, for title screens and stages.',
    description:
      'Parallax is one pointer listener on the root that writes two custom properties; each layer multiplies them by its own depth in CSS. Any number of layers therefore costs exactly one handler and no per-frame JavaScript.',
    tags: ['backdrop', 'background', 'parallax', 'scene', 'layers', 'title', 'stage', 'depth'],
    related: ['TitleGate', 'StorySlide', 'MainMenu', 'LoadingScreen'],
    demos: [
      {
        title: 'Three layers, moving apart',
        note: 'Move the pointer across it — each layer travels by its own depth.',
        build: () => {
          const scene = new SceneBackdrop({
            height: 300,
            parallax: true,
            scrim: 0.1,
            vignette: 0.6,
            layers: [
              { art: 'bg-scene-dark', depth: -0.35, blur: 2 },
              // A bright pass over the near-black plates is what makes the
              // depth visible at all — the backdrop art alone is deliberately
              // dim. It has to be `cover`, or its square edges show.
              { art: 'fire-lava-field', depth: -0.12, opacity: 0.5, blend: 'screen' },
              { art: 'fire-firenado', depth: 0.35, opacity: 0.32, blend: 'screen' },
              { art: 'silhouette-warrior-m', depth: 0.8, fit: 'contain' },
            ],
          });
          scene.add(
            h('div', { class: 'demo-note', style: { alignSelf: 'flex-start', height: 'auto' } },
              'Move the pointer'),
          );
          return scene.el;
        },
        stage: 'wide',
      },
      {
        title: 'A tiled drift',
        note: 'Without parallax the layers drift on their own.',
        build: () =>
          new SceneBackdrop({
            height: 180,
            drift: true,
            fadeBottom: true,
            vignette: 0.5,
            layers: [
              { art: 'bg-tile-sm', fit: 'tile', depth: 0.4 },
              { art: 'fx-nature-surge', depth: -0.15, opacity: 0.22, blend: 'screen', blur: 1 },
            ],
          }).el,
        stage: 'wide',
      },
    ],
  },

  {
    id: 'CheckList',
    name: 'CheckList',
    group: 'controls',
    blurb: 'Checkbox and radio groups, themed without giving up the real input.',
    description:
      '`Toggle` is a switch — it says on or off. This says *which of these*. Rows are real `<input>` elements inside `<label>`, so keyboard, screen readers and form submission all work untouched; only the tick is drawn on a pseudo-element, because the native control cannot be themed.',
    tags: ['checkbox', 'radio', 'options', 'settings', 'multi-select', 'form', 'group'],
    related: ['Toggle', 'SegmentedControl', 'FilterBar', 'SettingsScreen'],
    demos: [
      {
        title: 'Auto-battle rules',
        build: () => {
          const rules = new CheckList({
            label: 'Auto-battle',
            boxed: true,
            items: [
              { value: 'revive', label: 'Use revives', note: 'Spends one gem per revive', glyph: 'glyph-holy-cross' },
              { value: 'skip', label: 'Skip animations', checked: true, glyph: 'glyph-hourglass' },
              { value: 'repeat', label: 'Repeat until out of energy', checked: true, glyph: 'glyph-magic-flame' },
              { value: 'sell', label: 'Auto-sell common gear', note: 'Locked gear is never sold', glyph: 'glyph-broken-shackle' },
            ],
          });
          rules.on<string[]>('check:change', (values) => console.log(values));
          return rules.el;
        },
        stage: 'wide',
      },
      {
        title: 'A radio group, two columns',
        build: () =>
          new CheckList({
            label: 'Difficulty',
            mode: 'radio',
            columns: 2,
            value: ['hard'],
            items: [
              { value: 'normal', label: 'Normal' },
              { value: 'hard', label: 'Hard', note: '+20% rewards' },
              { value: 'brutal', label: 'Brutal', note: '+45% rewards' },
              { value: 'nightmare', label: 'Nightmare', note: 'Requires 180k power', disabled: true },
            ],
          }).el,
        stage: 'wide',
      },
    ],
  },

  {
    id: 'RangeSlider',
    name: 'RangeSlider',
    group: 'controls',
    blurb: 'A two-handle band for filtering — `Slider` picks a value, this picks a range.',
    description:
      'Both handles are real `<input type="range">` elements stacked on one track, so keyboard and screen-reader support come for free. The trick is that only the handle nearest the pointer receives events — otherwise the upper input, being painted on top, would swallow every click meant for the lower one.',
    tags: ['range', 'slider', 'filter', 'between', 'min max', 'band', 'two handle'],
    related: ['Slider', 'FilterBar', 'SortBar', 'ChampionList'],
    demos: [
      {
        title: 'Filtering a roster',
        build: () => {
          const power = new RangeSlider({
            label: 'Power',
            min: 0,
            max: 300_000,
            step: 5_000,
            from: 80_000,
            to: 220_000,
            compact: true,
            ticks: [0, 75_000, 150_000, 225_000, 300_000],
          });
          power.on<{ from: number; to: number }>('range:change', (r) => console.log(r));
          return power.el;
        },
        stage: 'wide',
      },
      {
        title: 'Level and speed',
        build: () =>
          stack(
            new RangeSlider({ label: 'Level', min: 1, max: 60, from: 40, to: 60 }).el,
            new RangeSlider({ label: 'Speed', min: 80, max: 300, from: 180, to: 240, suffix: '' }).el,
            new RangeSlider({ label: 'Crit rate', min: 0, max: 100, from: 40, to: 100, suffix: '%', disabled: true }).el,
          ),
        stage: 'wide',
      },
    ],
  },

  {
    id: 'KeybindInput',
    name: 'KeybindInput',
    group: 'controls',
    blurb: 'The key-capture row a controls screen is made of.',
    description:
      'Click the slot, press a combination, and it is bound. Escape cancels rather than binding itself, which is what every player expects and what makes the control safe to click by accident. A combination already used elsewhere still binds, but the row flags the clash — refusing silently is worse than showing it.',
    tags: ['keybind', 'hotkey', 'controls', 'shortcut', 'input', 'settings', 'remap'],
    related: ['SettingsScreen', 'CheckList', 'ActionBar', 'TextInput'],
    demos: [
      {
        title: 'A controls page',
        note: 'Click a slot and press a key. Escape backs out.',
        build: () => {
          const taken = ['Esc', 'Tab', 'I'];
          const binds = [
            { action: 'Attack', glyph: 'glyph-crossed-swords', binding: 'Space' },
            { action: 'Open inventory', glyph: 'glyph-burning-scroll', binding: 'I', secondary: 'B' },
            { action: 'Use potion', glyph: 'glyph-health-potion', binding: 'Q' },
            { action: 'Emote wheel', glyph: 'glyph-peace-dove', binding: '' },
          ].map((b) => {
            const row2 = new KeybindInput({ ...b, taken, clearable: true });
            row2.on<{ action: string; binding: string }>('keybind:set', (x) => console.log(x));
            return row2.el;
          });
          return stack(...binds);
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'Sparkline',
    name: 'Sparkline',
    group: 'data',
    blurb: 'A compact trend for a number that has a history.',
    description:
      'The series is drawn in its own 0–100 viewBox with a non-scaling stroke, so one component works at 60px wide in a table row and 400px wide on a stats page without the line thickening. The latest point always gets a dot, because that is the one being read.',
    tags: ['sparkline', 'trend', 'chart', 'graph', 'history', 'series', 'line', 'stats'],
    related: ['StatRadar', 'CompareStats', 'DamageMeter', 'PowerRating'],
    demos: [
      {
        title: 'Damage across a raid week',
        build: () =>
          new Sparkline({
            label: 'Clan boss damage',
            values: [31, 34, 33, 38, 42, 41, 47, 44, 52, 58],
            variant: 'area',
            showLast: true,
            markExtremes: true,
            baseline: 40,
            width: 320,
            height: 56,
            suffix: 'm',
          }).el,
      },
      {
        title: 'Variants and sizes',
        build: () =>
          row(
            new Sparkline({ values: [4, 6, 5, 9, 8, 12, 11, 15], width: 90, height: 26 }).el,
            new Sparkline({
              values: [12, 9, 14, 8, 16, 11, 19],
              variant: 'bars',
              color: 'var(--fui-gold)',
              width: 130,
              height: 40,
            }).el,
            new Sparkline({
              label: 'Arena rating',
              values: [1420, 1390, 1455, 1502, 1488, 1560],
              showLast: true,
              color: 'var(--fui-rarity-epic)',
              width: 200,
              height: 44,
            }).el,
          ),
      },
    ],
  },

  {
    id: 'Gauge',
    name: 'Gauge',
    group: 'data',
    blurb: 'An arc dial that says where a value falls, not just how far along it is.',
    description:
      '`ProgressRing` answers "how far along"; this answers "where does that land". The coloured bands are the reason it exists — a bare number cannot tell a player whether 214 speed is good. Ticks and the needle are placed by rotating a zero-size origin, so there is no trigonometry in JavaScript.',
    tags: ['gauge', 'dial', 'arc', 'meter', 'speedometer', 'threshold', 'bands', 'semicircle'],
    related: ['ProgressRing', 'StatBar', 'StatRadar', 'ThreatMeter'],
    demos: [
      {
        title: 'Speed against the turn-order threshold',
        build: () =>
          row(
            new Gauge({
              value: 214,
              max: 300,
              sweep: 220,
              ticks: 9,
              needle: true,
              label: '214',
              sublabel: 'Speed',
              cap: 'orb-arcane',
              bands: [
                { from: 0, to: 0.5, color: 'var(--fui-danger)' },
                { from: 0.5, to: 0.75, color: 'var(--fui-warn)' },
                { from: 0.75, to: 1, color: 'var(--fui-success)' },
              ],
            }).el,
            new Gauge({
              value: 68,
              max: 100,
              size: 110,
              kind: 'mana',
              sublabel: 'Resistance',
              needle: false,
            }).el,
            new Gauge({
              value: 92,
              max: 100,
              size: 96,
              sweep: 300,
              kind: 'rage',
              label: '92%',
              sublabel: 'Enrage',
            }).el,
          ),
      },
    ],
  },

  {
    id: 'Timeline',
    name: 'Timeline',
    group: 'data',
    blurb: 'An ordered run of events on a rail, vertical or horizontal.',
    description:
      'The rail is drawn by each entry rather than as one element behind them, so a segment can be coloured by the state of the entry it leads away from. That is what makes "you got this far" readable without a second pass over the data.',
    tags: ['timeline', 'history', 'chapters', 'milestones', 'steps', 'progress', 'events'],
    related: ['QuestLog', 'RewardTrack', 'WorldMap', 'PatchNotes'],
    demos: [
      {
        title: 'A campaign’s chapters',
        build: () => {
          const tl = new Timeline({
            stamps: true,
            events: [
              { when: 'Ch. I', title: 'Ashfall Gate', state: 'done', glyph: 'glyph-shield-block',
                art: 'weapon-warhammer', text: 'The gate falls, and the marsh road opens.' },
              { when: 'Ch. II', title: 'The Sunken Road', state: 'done', glyph: 'glyph-crossed-swords',
                text: 'Bog wardens turned back twice before the third push held.' },
              { when: 'Ch. III', title: 'Drowned Shrine', state: 'current', glyph: 'glyph-holy-cross',
                art: 'rune-crystal-shard', text: 'Something down there is still praying.' },
              { when: 'Ch. IV', title: 'The Maw', state: 'future', glyph: 'glyph-skull-wreath' },
            ],
          });
          tl.setState(2, 'current');
          return tl.el;
        },
        stage: 'wide',
      },
      {
        title: 'Horizontal, for a raid plan',
        build: () =>
          new Timeline({
            orientation: 'horizontal',
            compact: true,
            events: [
              { title: 'Phase 1', text: 'Burn shields', state: 'done' },
              { title: 'Phase 2', text: 'Adds spawn', state: 'done' },
              { title: 'Phase 3', text: 'Enrage', state: 'failed', color: 'var(--fui-danger)' },
              { title: 'Phase 4', text: 'Final push', state: 'future' },
            ],
          }).el,
        stage: 'wide',
      },
    ],
  },
];
