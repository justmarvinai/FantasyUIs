import type { CatalogEntry } from '../types.ts';

import { DiceRoller, type RollResult } from '../../lib/components/DiceRoller.ts';
import { StatAllocator } from '../../lib/components/StatAllocator.ts';
import { RunePad } from '../../lib/components/RunePad.ts';
import { TimeDial } from '../../lib/components/TimeDial.ts';
import { VolumeMixer } from '../../lib/components/VolumeMixer.ts';

export const DIALS: CatalogEntry[] = [
  {
    id: 'DiceRoller',
    name: 'DiceRoller',
    group: 'controls',
    blurb: 'A dice tray that rolls a pool, tumbles the faces and reports the total against a target number.',
    description:
      'Any game with a d20 in it needs the roll to be an event, not a number that appears. The tray takes a pool (`3d6 + 2`, `1d20`), tumbles for a moment, then settles on the faces and reports `{ rolls, subtotal, modifier, total, critical, fumble, success }` in one payload — so the caller resolves the check from the same object the player just watched land. Nat 20 and nat 1 get their own flags because every table treats them specially.',
    tags: ['dice', 'roll', 'd20', 'ttrpg', 'tabletop', 'check', 'skill check', 'crit', 'fumble', 'random'],
    related: ['SkillCheck', 'Tabletop', 'StatBlock'],
    demos: [
      {
        title: 'A d20 attack roll against AC 14',
        note: 'Roll it a few times — 20 reads as a critical, 1 as a fumble, and the target line turns on success.',
        build: () => {
          const roller = new DiceRoller({
            label: 'Attack roll',
            dice: [{ sides: 20 }],
            modifier: 7,
            target: 14,
            action: 'Roll to hit',
            history: 5,
          });
          roller.on<RollResult>('dice:roll', (r) => console.log(r.total, r.success ? 'hit' : 'miss'));
          return roller.el;
        },
      },
      {
        title: 'A damage pool',
        note: 'Several dice of different sizes, each with its own colour.',
        build: () =>
          new DiceRoller({
            label: 'Greataxe damage',
            dice: [
              { sides: 12, color: '#c9502a' },
              { sides: 6, count: 2, color: '#6fb3a8' },
            ],
            modifier: 4,
            action: 'Roll damage',
          }).el,
      },
    ],
  },
  {
    id: 'StatAllocator',
    name: 'StatAllocator',
    group: 'controls',
    blurb: 'Spend a pool of points across attributes, with derived stats updating live and a reset that gives it all back.',
    description:
      'Level-up screens and character creators both need the same control: a pool, a set of attributes, plus and minus per row, and the derived numbers that make the choice meaningful. Each attribute can declare its `derives` — "+8 HP per point", "+1.5% crit" — and the panel recomputes them as the player spends, which is what turns an abstract number into a decision.',
    tags: ['stats', 'attributes', 'allocate', 'points', 'level up', 'character', 'build', 'strength', 'respec', 'derived'],
    related: ['StatBlock', 'CharacterCreator', 'MasteryGrid', 'StatsPanel'],
    demos: [
      {
        title: 'Five points to spend',
        note: 'Derived lines under each row update as you spend. Reset returns the whole pool.',
        build: () => {
          const alloc = new StatAllocator({
            title: 'Level 12 — spend your points',
            points: 5,
            resettable: true,
            action: 'Confirm',
            attributes: [
              {
                id: 'str', label: 'Strength', base: 14, glyph: 'glyph-fist-punch', color: '#c9502a',
                derives: [{ label: 'Melee damage', per: 2.5 }, { label: 'Carry', per: 5, suffix: 'kg' }],
              },
              {
                id: 'dex', label: 'Dexterity', base: 11, glyph: 'glyph-bow-and-arrow', color: '#7fb069',
                derives: [{ label: 'Crit', per: 0.8, suffix: '%' }, { label: 'Dodge', per: 0.5, suffix: '%' }],
              },
              {
                id: 'int', label: 'Intellect', base: 9, glyph: 'glyph-spell-book', color: '#6fa8dc',
                derives: [{ label: 'Spell power', per: 3.2 }],
              },
              {
                id: 'vit', label: 'Vitality', base: 13, glyph: 'glyph-health-potion', color: '#d9a441',
                derives: [{ label: 'Health', per: 8 }],
              },
            ],
          });
          alloc.on<Record<string, number>>('stats:apply', (spend) => console.log('apply', spend));
          return alloc.el;
        },
      },
    ],
  },
  {
    id: 'RunePad',
    name: 'RunePad',
    group: 'controls',
    blurb: 'A dot grid you draw glyphs on — spell gestures, puzzle locks, ritual input.',
    description:
      'Gesture input is a genre of its own: drawing a sigil to cast, tracing a lock to open a door, matching a pattern to complete a ritual. The pad is a grid of nodes; a stroke is the list of node indices it passed through. Declare the patterns you accept and the pad tells you which one was drawn — or that none was, which is just as much of a game event.',
    tags: ['rune', 'gesture', 'draw', 'pattern', 'lock', 'puzzle', 'sigil', 'spell', 'trace', 'input'],
    related: ['RuneCircle', 'SkillCheck', 'KeybindInput'],
    demos: [
      {
        title: 'Three spells to trace',
        note: 'The ghosted path is Emberbolt — trace it. Match a pattern and it names the spell; miss and it says so.',
        build: () => {
          const pad = new RunePad({
            grid: 3,
            size: 220,
            label: 'Trace a sigil',
            hint: 'fire',
            patterns: [
              { id: 'fire', label: 'Emberbolt', path: [0, 1, 2, 4], color: '#c9502a', art: 'fire-flame-burst' },
              { id: 'ward', label: 'Warding Sigil', path: [0, 2, 8, 6, 0], color: '#6fa8dc', art: 'earth-rune-arch' },
              { id: 'void', label: 'Void Lance', path: [1, 4, 7, 8], color: '#9a6fd0', art: 'blood-void-lance', locked: true },
            ],
          });
          pad.on<{ id: string }>('rune:match', (m) => console.log('cast', m.id));
          pad.on('rune:miss', () => console.log('fizzled'));
          return pad.el;
        },
      },
    ],
  },
  {
    id: 'TimeDial',
    name: 'TimeDial',
    group: 'controls',
    blurb: 'A 24-hour clock face with coloured bands — rest until dawn, schedule a raid, watch the world clock turn.',
    description:
      'Day/night cycles drive spawns, prices, quests and encounters, so players need to see time as a shape rather than a number. The dial is a circle of bands — dawn, day, dusk, night, or whatever your world uses — with a draggable hand. Read-only it is a world clock; interactive it is the "rest until…" control.',
    tags: ['time', 'clock', 'dial', 'day night', 'cycle', 'rest', 'schedule', 'hours', 'dawn', 'dusk'],
    related: ['EventCalendar', 'IdleRewards', 'CountdownTimer'],
    demos: [
      {
        title: 'Rest until…',
        note: 'Drag the hand. The band under it names the time of day and any event scheduled there.',
        build: () => {
          const dial = new TimeDial({
            value: 0.34,
            size: 220,
            steps: 48,
            label: 'Rest until',
            showTime: true,
            bands: [
              { from: 0.21, to: 0.29, label: 'Dawn', color: '#e8a13c', glyph: 'glyph-celestial-body' },
              { from: 0.29, to: 0.71, label: 'Day', color: '#4a8ede', event: 'Market open' },
              { from: 0.71, to: 0.79, label: 'Dusk', color: '#c9502a' },
              { from: 0.79, to: 1.21, label: 'Night', color: '#3b3468', glyph: 'glyph-owl', event: 'Wraiths abroad' },
            ],
          });
          dial.on<number>('time:change', (t) => console.log('rest until', t));
          return dial.el;
        },
      },
    ],
  },
  {
    id: 'VolumeMixer',
    name: 'VolumeMixer',
    group: 'controls',
    blurb: 'The audio page of a settings screen — master plus channels, each with a mute that survives the slider.',
    description:
      'Every game ships this panel and most build it from scratch. A master fader over per-channel rows, each with its own mute; muting keeps the slider value so unmuting restores the level the player chose rather than snapping to a default. Two layouts — labelled rows for a settings page, vertical faders when you want it to look like a desk.',
    tags: ['audio', 'volume', 'mixer', 'sound', 'music', 'sfx', 'settings', 'mute', 'faders', 'channels'],
    related: ['SettingsScreen', 'Slider', 'Toggle'],
    demos: [
      {
        title: 'Settings-page rows',
        note: 'Mute a channel and drag it — unmuting comes back to the same level.',
        build: () => {
          const mixer = new VolumeMixer({
            title: 'Audio',
            master: { value: 0.8, label: 'Master' },
            showValues: true,
            channels: [
              { id: 'music', label: 'Music', value: 0.55, glyph: 'glyph-magic-feather', color: '#9a6fd0' },
              { id: 'sfx', label: 'Effects', value: 0.9, glyph: 'glyph-sword-clash', color: '#c9502a' },
              { id: 'voice', label: 'Voice', value: 0.7, glyph: 'glyph-peace-dove', color: '#6fa8dc' },
              { id: 'ambient', label: 'Ambience', value: 0.35, muted: true, glyph: 'glyph-thorny-branch', color: '#7fb069', note: 'Wind, rain, crowds' },
            ],
          });
          mixer.on<{ id: string; value: number }>('mixer:change', (c) => console.log(c.id, c.value));
          return mixer.el;
        },
      },
      {
        title: 'Vertical faders',
        note: 'The same data, laid out like a desk.',
        build: () =>
          new VolumeMixer({
            variant: 'faders',
            height: 190,
            master: { value: 0.75 },
            channels: [
              { id: 'music', label: 'Music', value: 0.6, color: '#9a6fd0' },
              { id: 'sfx', label: 'SFX', value: 0.85, color: '#c9502a' },
              { id: 'ui', label: 'UI', value: 0.5, color: '#d9a441' },
              { id: 'voice', label: 'Voice', value: 0.7, color: '#6fa8dc' },
            ],
          }).el,
      },
    ],
  },
];
