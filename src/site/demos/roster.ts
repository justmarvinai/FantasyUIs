import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { FilterBar } from '../../lib/components/FilterBar.ts';
import { SortBar } from '../../lib/components/SortBar.ts';
import { ChampionList } from '../../lib/components/ChampionList.ts';
import { CompareStats } from '../../lib/components/CompareStats.ts';
import { StatRadar } from '../../lib/components/StatRadar.ts';
import { SkillCard } from '../../lib/components/SkillCard.ts';
import { MasteryGrid } from '../../lib/components/MasteryGrid.ts';
import { ArtifactCard } from '../../lib/components/ArtifactCard.ts';
import { ArtifactSet } from '../../lib/components/ArtifactSet.ts';
import { RankUpPanel } from '../../lib/components/RankUpPanel.ts';
import { ShardCounter } from '../../lib/components/ShardCounter.ts';
import { PowerRating } from '../../lib/components/PowerRating.ts';

const row = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-row' }, ...kids.filter(Boolean));
const col = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-col' }, ...kids.filter(Boolean));

export const ROSTER: CatalogEntry[] = [
  {
    id: 'FilterBar',
    name: 'FilterBar',
    group: 'controls',
    blurb: 'The faceted chip row above a roster — rarity, affinity, role, whatever you slice by.',
    description:
      'Emits the whole selection map on every change, so the consumer filters once rather than tracking each group separately. Chips carry their own colour, which is what makes a rarity filter readable without labels.',
    tags: ['filter', 'facet', 'chips', 'rarity', 'affinity', 'role', 'roster', 'search'],
    related: ['SortBar', 'ChampionList', 'SegmentedControl', 'InventoryGrid'],
    demos: [
      {
        title: 'Filtering a champion roster',
        build: () => {
          const filters = new FilterBar({
            groups: [
              {
                key: 'rarity',
                label: 'Rarity',
                options: [
                  { value: 'rare', label: 'Rare', color: 'var(--fui-rarity-rare)', count: 61 },
                  { value: 'epic', label: 'Epic', color: 'var(--fui-rarity-epic)', count: 44 },
                  { value: 'legendary', label: 'Legendary', color: 'var(--fui-rarity-legendary)', count: 23 },
                ],
              },
              {
                key: 'affinity',
                label: 'Affinity',
                options: [
                  { value: 'magic', label: 'Magic', glyph: 'glyph-arcane-symbol', color: '#3b8ae0' },
                  { value: 'spirit', label: 'Spirit', glyph: 'glyph-spirit-vortex', color: '#38d13c' },
                  { value: 'force', label: 'Force', glyph: 'glyph-fist-punch', color: '#d84b3a' },
                  { value: 'void', label: 'Void', glyph: 'glyph-celestial-body', color: '#a335ee' },
                ],
              },
              {
                key: 'role',
                label: 'Role',
                multi: false,
                options: [
                  { value: 'attack', label: 'Attack', glyph: 'glyph-crossed-swords' },
                  { value: 'defence', label: 'Defence', glyph: 'glyph-shield-block' },
                  { value: 'support', label: 'Support', glyph: 'glyph-peace-dove' },
                ],
              },
            ],
            value: { rarity: ['legendary'] },
          });
          filters.on<Record<string, string[]>>('filter:change', (sel) => console.log(sel));
          return filters.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'SortBar',
    name: 'SortBar',
    group: 'controls',
    blurb: 'Field plus direction for any long list; clicking the active field flips it.',
    tags: ['sort', 'order', 'ascending', 'descending', 'list', 'roster', 'ranking'],
    related: ['FilterBar', 'ChampionList', 'Leaderboard'],
    demos: [
      {
        title: 'Sorting a roster',
        build: () => {
          const sort = new SortBar({
            fields: [
              { value: 'power', label: 'Power' },
              { value: 'level', label: 'Level' },
              { value: 'rarity', label: 'Rarity' },
              { value: 'speed', label: 'Speed' },
              { value: 'acquired', label: 'Newest', initial: 'desc' },
            ],
            total: '128 champions',
          });
          sort.on<{ field: string; dir: 'asc' | 'desc' }>('sort:change', (s) => console.log(s));
          return sort.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'ChampionList',
    name: 'ChampionList',
    group: 'gacha',
    blurb: 'The dense roster view for when a card grid gets too big to scan.',
    description:
      'One line per champion — portrait, rarity rim, stars, level, role and power. `setRows` swaps the data without rebuilding, which is what the filter and sort bars above it call on every change. Selections that scroll out of the filtered set are dropped, so the emitted list never names a champion the player cannot see.',
    tags: ['roster', 'list', 'champions', 'collection', 'select', 'multi-select', 'heroes'],
    related: ['ChampionCard', 'FilterBar', 'SortBar', 'RankUpPanel'],
    demos: [
      {
        title: 'A multi-select roster',
        note: 'Click rows to select. Used for mass-ascension and fodder pickers.',
        build: () => {
          const roster = new ChampionList({
            select: 'multi',
            maxHeight: 300,
            selected: ['vex'],
            rows: [
              { id: 'vex', name: 'Vexhollow', art: 'blood-necromancer', rarity: 'legendary',
                stars: 6, level: 60, maxLevel: 60, power: 42_180, affinityColor: '#a335ee',
                role: 'glyph-spell-book', note: 'In Arena team', locked: true },
              { id: 'ember', name: 'Emberwake', art: 'fire-phoenix-rise', rarity: 'legendary',
                stars: 5, level: 50, maxLevel: 60, power: 34_920, affinityColor: '#ff7a3d',
                role: 'glyph-magic-flame' },
              { id: 'grix', name: 'Grixmaul', art: 'weapon-warhammer', rarity: 'epic',
                stars: 5, level: 50, maxLevel: 50, power: 28_740, affinityColor: '#d84b3a',
                role: 'glyph-fist-punch' },
              { id: 'sable', name: 'Sablethorn', art: 'hunt-dire-wolf', rarity: 'epic',
                stars: 4, level: 40, maxLevel: 50, power: 21_060, affinityColor: '#38d13c',
                role: 'glyph-bow-and-arrow' },
              { id: 'lume', name: 'Lumenshade', art: 'rune-crystal-shard', rarity: 'rare',
                stars: 4, level: 30, maxLevel: 40, power: 12_410, affinityColor: '#3b8ae0',
                role: 'glyph-holy-cross' },
              { id: 'drab', name: 'Drabwick', art: 'earth-amethyst-cluster', rarity: 'rare',
                stars: 3, level: 20, power: 6_180, affinityColor: '#8a9a3d',
                role: 'glyph-nature-shield', disabled: true, note: 'Ascending' },
            ],
          });
          roster.on<string[]>('roster:select', (ids) => console.log('selected', ids));
          return roster.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'CompareStats',
    name: 'CompareStats',
    group: 'data',
    blurb: 'The before / after table behind every upgrade decision.',
    description:
      'Equip this artifact, level up, ascend, swap a gear set — what actually changes and by how much. `lowerIsBetter` matters more than it looks: a cooldown dropping is a gain, and colouring it red because the number went down is the classic bug in this component.',
    tags: ['compare', 'diff', 'before', 'after', 'preview', 'upgrade', 'equip', 'stats'],
    related: ['StatChip', 'ArtifactCard', 'UpgradePanel', 'StatsPanel'],
    demos: [
      {
        title: 'Previewing a gear swap',
        build: () =>
          new CompareStats({
            fromLabel: 'Equipped',
            toLabel: 'Bloodforged Cuirass',
            bars: true,
            rows: [
              { label: 'ATK', from: 1482, to: 1710, glyph: 'glyph-crossed-swords' },
              { label: 'DEF', from: 1104, to: 968, glyph: 'glyph-shield-block' },
              { label: 'HP', from: 24_180, to: 25_900 },
              { label: 'C.RATE', from: 47, to: 62, suffix: '%' },
              { label: 'C.DMG', from: 90, to: 128, suffix: '%' },
              { label: 'SPD', from: 212, to: 212, glyph: 'glyph-hourglass' },
              { label: 'Cooldown', from: 4, to: 3, lowerIsBetter: true },
            ],
          }).el,
        stage: 'wide',
      },
      {
        title: 'Changes only',
        note: 'Hides the rows that do not move — the usual choice inside a tooltip.',
        build: () =>
          new CompareStats({
            changesOnly: true,
            fromLabel: 'Lv 50',
            toLabel: 'Lv 60',
            rows: [
              { label: 'ATK', from: 1482, to: 1804 },
              { label: 'DEF', from: 1104, to: 1104 },
              { label: 'HP', from: 24_180, to: 29_600 },
            ],
          }).el,
      },
    ],
  },

  {
    id: 'StatRadar',
    name: 'StatRadar',
    group: 'data',
    blurb: 'The stat web that lets two champions be compared by silhouette.',
    description:
      'Six numbers are hard to hold in your head; two shapes are not. Values are 0–1, because only the game knows what "fast" means — normalising against its own ceilings is the caller’s job.',
    tags: ['radar', 'spider', 'chart', 'stats', 'compare', 'web', 'hexagon', 'svg'],
    related: ['CompareStats', 'StatsPanel', 'ChampionCard'],
    demos: [
      {
        title: 'Two champions overlaid',
        note: 'The dashed shape is the comparison; the filled one is the current pick.',
        build: () =>
          row(
            new StatRadar({
              size: 210,
              axes: [
                { label: 'ATK', value: 0.82, compare: 0.6 },
                { label: 'DEF', value: 0.4, compare: 0.75 },
                { label: 'HP', value: 0.55, compare: 0.9 },
                { label: 'SPD', value: 0.7, compare: 0.5 },
                { label: 'C.RATE', value: 0.9, compare: 0.35 },
                { label: 'RES', value: 0.45, compare: 0.65 },
              ],
            }).el,
            new StatRadar({
              size: 150,
              rings: 3,
              color: 'var(--fui-rarity-legendary)',
              axes: [
                { label: 'Damage', value: 0.95 },
                { label: 'Utility', value: 0.3 },
                { label: 'Survival', value: 0.45 },
                { label: 'Speed', value: 0.8 },
                { label: 'Support', value: 0.15 },
              ],
            }).el,
            new StatRadar({
              size: 84,
              bare: true,
              rings: 2,
              axes: [
                { label: 'A', value: 0.7 },
                { label: 'B', value: 0.5 },
                { label: 'C', value: 0.9 },
                { label: 'D', value: 0.4 },
              ],
            }).el,
          ),
      },
    ],
  },

  {
    id: 'SkillCard',
    name: 'SkillCard',
    group: 'gacha',
    blurb: 'One champion ability: art, cooldown, level, multiplier and the effects it applies.',
    description:
      '`setRemaining` drives the cooldown sweep, so the same card works on a static skill page and inside a live battle HUD. `setSeconds` covers real-time games instead of turn-based ones.',
    tags: ['skill', 'ability', 'spell', 'cooldown', 'passive', 'ultimate', 'buff', 'debuff'],
    related: ['ActionBar', 'MasteryGrid', 'BuffBar', 'SkillTree'],
    demos: [
      {
        title: 'A champion’s skill page',
        build: () =>
          col(
            new SkillCard({
              name: 'Sundering Toll',
              art: 'fire-phoenix-rise',
              description:
                'Attacks all enemies. Has a 40% chance of placing a Decrease DEF debuff for 2 turns.',
              multiplier: '3.1 × ATK',
              cooldown: 4,
              remaining: 2,
              level: 5,
              maxLevel: 8,
              ultimate: true,
              booksToMax: 3,
              effects: [
                { label: 'Decrease DEF', turns: 2, debuff: true, glyph: 'glyph-shield-block' },
                { label: 'Ally ATK Up', turns: 2, glyph: 'glyph-crossed-swords' },
              ],
            }).el,
            new SkillCard({
              name: 'Grave Tithe',
              art: 'blood-necromancer',
              description: 'Heals this champion by 15% of the damage dealt.',
              passive: true,
              level: 4,
              maxLevel: 4,
            }).el,
            new SkillCard({
              name: 'Rive',
              art: 'weapon-warhammer',
              description: 'Attacks one enemy twice.',
              multiplier: '1.8 × ATK',
              cooldown: 2,
              remaining: 0,
              level: 3,
              maxLevel: 6,
              compact: true,
            }).el,
          ),
        stage: 'wide',
      },
    ],
  },

  {
    id: 'MasteryGrid',
    name: 'MasteryGrid',
    group: 'gacha',
    blurb: 'The tiered passive board that sits on top of a skill tree.',
    description:
      'Prerequisites are enforced here rather than left to the caller: a node whose requirements are unmet renders locked and refuses the click. Points are spent from a pool the component tracks, so the "points left" line is always honest.',
    tags: ['mastery', 'passive', 'tree', 'board', 'talents', 'points', 'branch', 'keystone'],
    related: ['SkillTree', 'SkillCard', 'UpgradePanel'],
    demos: [
      {
        title: 'Spending mastery points',
        note: 'Click a node to rank it. Locked nodes need their prerequisite first.',
        build: () => {
          const board = new MasteryGrid({
            interactive: true,
            points: 9,
            spent: 12,
            branches: [
              { name: 'Offence', color: '#d84b3a' },
              { name: 'Support', color: '#38d13c' },
              { name: 'Defence', color: '#4a8ede' },
            ],
            nodes: [
              { id: 'blade', name: 'Blade Disciple', tier: 0, branch: 0, rank: 5, maxRank: 5, glyph: 'glyph-crossed-swords' },
              { id: 'mend', name: 'Mending Word', tier: 0, branch: 1, rank: 3, maxRank: 5, glyph: 'glyph-peace-dove' },
              { id: 'bulwark', name: 'Bulwark', tier: 0, branch: 2, rank: 4, maxRank: 5, glyph: 'glyph-shield-block' },
              { id: 'cuts', name: 'Deep Cuts', tier: 1, branch: 0, rank: 2, maxRank: 5, requires: ['blade'], glyph: 'glyph-fist-punch' },
              { id: 'ward', name: 'Warded Soul', tier: 1, branch: 2, rank: 0, maxRank: 5, requires: ['bulwark'], glyph: 'glyph-nature-shield' },
              { id: 'exec', name: 'Executioner', tier: 2, branch: 0, rank: 0, maxRank: 1, requires: ['cuts'], keystone: true, glyph: 'glyph-flaming-skull' },
              { id: 'flow', name: 'Lifeflow', tier: 2, branch: 1, rank: 0, maxRank: 1, requires: ['mend'], keystone: true, glyph: 'glyph-spirit-vortex' },
              { id: 'aegis', name: 'Living Aegis', tier: 2, branch: 2, rank: 0, maxRank: 1, requires: ['ward'], keystone: true, glyph: 'glyph-holy-cross' },
            ],
          });
          board.on<{ id: string; rank: number }>('mastery:rank', (m) => console.log(m));
          return board.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'ArtifactCard',
    name: 'ArtifactCard',
    group: 'gacha',
    blurb: 'A gear piece with its main stat, substats, roll pips, set and upgrade level.',
    description:
      'The roll pips on each substat are what make the card useful: they tell a player how much of a number came from upgrades rather than the initial roll, which is the whole decision when keeping or feeding a piece.',
    tags: ['artifact', 'gear', 'equipment', 'item', 'substat', 'rolls', 'set', 'relic'],
    related: ['ArtifactSet', 'ItemCard', 'CompareStats', 'Paperdoll'],
    demos: [
      {
        title: 'Legendary and epic pieces',
        build: () =>
          row(
            new ArtifactCard({
              name: 'Bloodforged Cuirass',
              art: 'weapon-warhammer',
              rarity: 'legendary',
              slot: 'Chest',
              slotGlyph: 'glyph-shield-block',
              set: 'Lifesteal',
              setSize: 4,
              setColor: '#c0392b',
              level: 16,
              maxLevel: 16,
              mainStat: { label: 'ATK%', value: '+48%' },
              subStats: [
                { label: 'C.RATE', value: '+18%', rolls: 3 },
                { label: 'C.DMG', value: '+24%', rolls: 2 },
                { label: 'SPD', value: '+12', rolls: 1 },
                { label: 'HP', value: '+840' },
              ],
              equippedBy: 'Vexhollow',
              locked: true,
            }).el,
            new ArtifactCard({
              name: 'Tidewrought Greaves',
              art: 'rune-crystal-shard',
              rarity: 'epic',
              slot: 'Boots',
              set: 'Swift Parry',
              setSize: 2,
              setColor: '#4a8ede',
              level: 12,
              mainStat: { label: 'SPD', value: '+30' },
              subStats: [
                { label: 'DEF%', value: '+14%', rolls: 2 },
                { label: 'RES', value: '+30', rolls: 1 },
              ],
              selectable: true,
            }).el,
            new ArtifactCard({
              name: 'Cracked Band',
              art: 'earth-amethyst-cluster',
              rarity: 'uncommon',
              slot: 'Ring',
              level: 4,
              mainStat: { label: 'HP', value: '+1,200' },
              subStats: [{ label: 'DEF', value: '+40' }],
            }).el,
          ),
        stage: 'wide',
      },
    ],
  },

  {
    id: 'ArtifactSet',
    name: 'ArtifactSet',
    group: 'gacha',
    blurb: 'Equipped slots in a row, and the set bonuses those pieces add up to.',
    description:
      'An unfinished bonus is deliberately dimmed rather than hidden — the "2 / 4" is the thing that sends a player hunting for the fourth piece. Empty slots show their own glyph, so it is obvious what goes where.',
    tags: ['gear', 'equipment', 'set', 'bonus', 'slots', 'loadout', 'artifact', 'paperdoll'],
    related: ['ArtifactCard', 'Paperdoll', 'StatsPanel'],
    demos: [
      {
        title: 'A champion’s loadout',
        build: () =>
          new ArtifactSet({
            title: 'Equipped',
            slots: [
              { label: 'Weapon', art: 'weapon-warhammer', rarity: 'legendary', level: 16, set: 'Cruel' },
              { label: 'Helmet', art: 'tech-mech-suit', rarity: 'epic', level: 12, set: 'Cruel' },
              { label: 'Chest', art: 'rune-crystal-shard', rarity: 'epic', level: 12, set: 'Cruel' },
              { label: 'Gloves', glyph: 'glyph-fist-punch' },
              { label: 'Boots', art: 'earth-amethyst-cluster', rarity: 'rare', level: 8, set: 'Swift' },
              { label: 'Ring', glyph: 'glyph-arcane-symbol' },
            ],
            bonuses: [
              { name: 'Cruel', need: 4, have: 3, effect: '+15% ATK, ignores 5% DEF', color: '#c0392b' },
              { name: 'Swift', need: 2, have: 1, effect: '+12% SPD', color: '#4a8ede' },
            ],
          }).el,
        stage: 'wide',
      },
    ],
  },

  {
    id: 'RankUpPanel',
    name: 'RankUpPanel',
    group: 'gacha',
    blurb: 'The ascension screen: target, fodder slots, success chance, cost and commit.',
    description:
      'Empty slots emit `rankup:slot` with their index, so the caller opens its own picker rather than this component owning the roster. The commit button stays locked until every slot is filled.',
    tags: ['ascend', 'rank up', 'star up', 'fodder', 'sacrifice', 'awaken', 'evolve', 'upgrade'],
    related: ['ChampionList', 'ConfirmSlider', 'UpgradePanel', 'StarRating'],
    demos: [
      {
        title: 'Ascending to six stars',
        note: 'Click an empty slot to open your own fodder picker.',
        build: () => {
          const rankup = new RankUpPanel({
            target: {
              name: 'Emberwake',
              art: 'fire-phoenix-rise',
              rarity: 'legendary',
              stars: 5,
              nextStars: 6,
              level: 50,
            },
            slots: 5,
            fodder: [
              { art: 'rune-crystal-shard', rarity: 'rare', name: 'Lumenshade' },
              { art: 'earth-amethyst-cluster', rarity: 'rare', name: 'Drabwick' },
              null,
              null,
              null,
            ],
            chance: 62,
            cost: 450_000,
            costGlyph: 'glyph-trophy-cup',
            warning: 'Ascension material is consumed even if the attempt fails.',
            action: 'Ascend',
          });
          rankup.on<number>('rankup:slot', (i) => console.log('pick fodder for slot', i));
          rankup.on('rankup:confirm', () => console.log('attempt ascension'));
          return rankup.el;
        },
      },
    ],
  },

  {
    id: 'ShardCounter',
    name: 'ShardCounter',
    group: 'gacha',
    blurb: 'Fragment progress toward a guaranteed unlock.',
    description:
      'Soul shards, hero fragments — the pieces a game hands out so a player can *earn* a specific champion instead of praying for one. The button only unlocks at 100%.',
    tags: ['shard', 'fragment', 'soul', 'progress', 'unlock', 'guarantee', 'summon', 'piece'],
    related: ['PityCounter', 'SummonResult', 'RewardTrack'],
    demos: [
      {
        title: 'Two unlocks in flight',
        build: () => {
          const ready = new ShardCounter({
            name: 'Vexhollow',
            art: 'blood-necromancer',
            rarity: 'legendary',
            have: 100,
            need: 100,
            action: 'Summon',
            source: 'Void Keep 12+',
          });
          ready.on('shard:claim', () => console.log('summon vexhollow'));
          return h(
            'div',
            { class: 'demo-col', style: { width: '100%', alignItems: 'stretch' } },
            ready.el,
            new ShardCounter({
              name: 'Sablethorn',
              art: 'hunt-dire-wolf',
              rarity: 'epic',
              have: 64,
              need: 100,
              action: 'Summon',
              source: 'Beast Hollow · Hard',
            }).el,
            new ShardCounter({
              name: 'Drabwick',
              art: 'earth-amethyst-cluster',
              rarity: 'rare',
              have: 18,
              need: 50,
              size: 'sm',
            }).el,
          );
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'PowerRating',
    name: 'PowerRating',
    group: 'gacha',
    blurb: 'The one number a player uses to judge whether they can clear the next stage.',
    description:
      'Total power, gear score, team rating — plus a stacked bar answering the question that always follows it: where does my power actually come from. `set()` rolls the number up so a gain is felt, not just read.',
    tags: ['power', 'gear score', 'rating', 'total', 'strength', 'delta', 'breakdown'],
    related: ['StatChip', 'ArenaMatchup', 'StatsPanel', 'TeamSlots'],
    demos: [
      {
        title: 'Team power, broken down',
        build: () =>
          new PowerRating({
            value: 184_320,
            delta: 2_180,
            label: 'Team Power',
            rank: 'Top 8% this season',
            animate: true,
            parts: [
              { label: 'Champions', value: 120_000, color: 'var(--fui-accent)' },
              { label: 'Gear', value: 44_320, color: 'var(--fui-gold)' },
              { label: 'Masteries', value: 20_000, color: 'var(--fui-rarity-epic)' },
            ],
          }).el,
      },
      {
        title: 'Sizes',
        build: () =>
          row(
            new PowerRating({ value: 42_180, label: 'Champion', size: 'sm' }).el,
            new PowerRating({ value: 1_284_000, label: 'Account', size: 'lg', compact: true, delta: -4_100 }).el,
          ),
      },
    ],
  },
];
