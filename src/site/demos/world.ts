import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { WorldMap } from '../../lib/components/WorldMap.ts';
import { FormationGrid } from '../../lib/components/FormationGrid.ts';
import { SocketPanel } from '../../lib/components/SocketPanel.ts';
import { CodexEntry } from '../../lib/components/CodexEntry.ts';
import { MatchHistory } from '../../lib/components/MatchHistory.ts';
import { FriendList } from '../../lib/components/FriendList.ts';
import { AchievementList } from '../../lib/components/AchievementList.ts';
import { CollectionProgress } from '../../lib/components/CollectionProgress.ts';
import { LeaderboardPodium } from '../../lib/components/LeaderboardPodium.ts';
import { SideNav } from '../../lib/components/SideNav.ts';
import { Ticker } from '../../lib/components/Ticker.ts';
import { HealthPips } from '../../lib/components/HealthPips.ts';
import { PatchNotes } from '../../lib/components/PatchNotes.ts';
import { LootRoll } from '../../lib/components/LootRoll.ts';

const row = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-row' }, ...kids.filter(Boolean));
const col = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-col' }, ...kids.filter(Boolean));
export const WORLD: CatalogEntry[] = [
  {
    id: 'WorldMap',
    name: 'WorldMap',
    group: 'widgets',
    blurb: 'Campaign nodes placed on painted art, joined by paths, each locked, open or cleared.',
    description:
      'Paths are derived from each node’s own `links`, so moving a node moves its connections with it and there is no second list to keep in sync. The path layer is an SVG stretched to the element, which keeps node coordinates in the same percentage space whatever the map’s aspect ratio ends up being.',
    tags: ['map', 'world', 'campaign', 'region', 'nodes', 'chapter', 'overworld', 'progress'],
    related: ['StageSelect', 'Minimap', 'WaveTracker', 'TintFrame'],
    demos: [
      {
        title: 'A campaign region',
        note: 'Click an unlocked node to enter it. Locked nodes refuse the click.',
        build: () => {
          const map = new WorldMap({
            art: 'bg-scene-dark',
            title: 'Emberwood Vale',
            progress: 0.55,
            height: 330,
            interactive: true,
            nodes: [
              { id: 'gate', name: 'Ashfall Gate', x: 12, y: 70, state: 'cleared', stars: 3,
                glyph: 'glyph-shield-block', links: ['road'], note: 'Lv 12' },
              { id: 'road', name: 'Sunken Road', x: 32, y: 50, state: 'cleared', stars: 2,
                glyph: 'glyph-crossed-swords', links: ['mire', 'shrine'], note: 'Lv 16' },
              { id: 'shrine', name: 'Drowned Shrine', x: 50, y: 26, state: 'current',
                glyph: 'glyph-holy-cross', links: ['maw'], note: 'Lv 19' },
              { id: 'mire', name: 'Rotmire', x: 52, y: 74, state: 'open',
                glyph: 'glyph-thorny-branch', links: ['maw'], note: 'Lv 20' },
              { id: 'maw', name: 'The Maw', x: 80, y: 50, state: 'locked', boss: true,
                glyph: 'glyph-skull-wreath', note: 'Lv 24' },
            ],
          });
          map.on<string>('map:enter', (id) => console.log('enter', id));
          return map.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'FormationGrid',
    name: 'FormationGrid',
    group: 'gacha',
    blurb: 'Front-row / back-row party placement, where the cell a unit stands in matters.',
    description:
      'Distinct from `TeamSlots`, which is an unordered bench: here the coordinates carry meaning, so drag-and-drop swaps two cells rather than reordering a list. Blocked cells are hatched rather than merely dimmed, so an unusable position never looks like an empty one.',
    tags: ['formation', 'party', 'team', 'position', 'front row', 'back row', 'grid', 'drag'],
    related: ['TeamSlots', 'ChampionCard', 'ArenaMatchup', 'PartyFrame'],
    demos: [
      {
        title: 'A two-row formation',
        note: 'Drag a champion onto another cell to swap them.',
        build: () => {
          const formation = new FormationGrid({
            rows: 2,
            cols: 3,
            rowLabels: ['Back', 'Front'],
            editable: true,
            power: 184_320,
            blocked: ['0,0'],
            units: {
              '1,0': { id: 'grix', name: 'Grixmaul', art: 'weapon-warhammer', rarity: 'epic', level: 50, role: 'glyph-shield-block' },
              '1,1': { id: 'vex', name: 'Vexhollow', art: 'blood-necromancer', rarity: 'legendary', level: 60, role: 'glyph-spell-book' },
              '0,1': { id: 'lume', name: 'Lumenshade', art: 'rune-crystal-shard', rarity: 'rare', level: 40, role: 'glyph-peace-dove' },
              '0,2': { id: 'ember', name: 'Emberwake', art: 'fire-phoenix-rise', rarity: 'legendary', level: 55, role: 'glyph-magic-flame' },
            },
          });
          formation.on('formation:change', (layout) => console.log(layout));
          return formation.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'SocketPanel',
    name: 'SocketPanel',
    group: 'gacha',
    blurb: 'Gem and rune sockets, where the socket’s colour and the gem’s have to agree.',
    description:
      'The second upgrade axis a gear screen adds on top of levels. A mismatched gem is socketed with a warning rim rather than refused, because that is what most games do — they allow it and withhold the match bonus.',
    tags: ['socket', 'gem', 'rune', 'inlay', 'gear', 'upgrade', 'jewel', 'enchant'],
    related: ['ArtifactCard', 'ArtifactSet', 'UpgradePanel', 'CompareStats'],
    demos: [
      {
        title: 'Socketing a chest piece',
        note: 'The third gem is the wrong colour, so the match bonus stays grey.',
        build: () => {
          const panel = new SocketPanel({
            itemName: 'Bloodforged Cuirass',
            itemArt: 'weapon-warhammer',
            itemRarity: 'legendary',
            matchBonus: 'All colours matched: +12% C.DMG',
            unlockCost: '250,000 gold',
            sockets: [
              { colour: '#d84b3a', gem: { id: 'g1', name: 'Ember Shard', art: 'fire-golden-flame', rarity: 'epic', effect: '+8% ATK', colour: '#d84b3a' } },
              { colour: '#4a8ede', gem: { id: 'g2', name: 'Tide Pearl', art: 'rune-radiant-gem', rarity: 'rare', effect: '+40 RES', colour: '#4a8ede' } },
              { colour: '#38d13c', gem: { id: 'g3', name: 'Ember Chip', art: 'earth-falling-gem', rarity: 'uncommon', effect: '+4% ATK', colour: '#d84b3a' } },
              { locked: true },
            ],
          });
          panel.on<number>('socket:pick', (i) => console.log('open gem picker for socket', i));
          return panel.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'CodexEntry',
    name: 'CodexEntry',
    group: 'widgets',
    blurb: 'A bestiary page: illustration, tags, lore, stats, resistances and drop table.',
    description:
      'Resistances grow from the centre in either direction, so a weakness and a resistance are the same readout mirrored rather than two different widgets. `undiscovered` renders the whole entry as a silhouette, which is the state most of a bestiary is in at any moment.',
    tags: ['codex', 'bestiary', 'monster', 'lore', 'encyclopedia', 'enemy', 'drops', 'resistances'],
    related: ['ItemCard', 'ChampionCard', 'StatsPanel', 'DialogueBox'],
    demos: [
      {
        title: 'A discovered entry',
        build: () =>
          new CodexEntry({
            name: 'Gravebound Revenant',
            subtitle: 'Undead · Emberwood Vale · Threat 4',
            art: 'blood-necromancer',
            tags: ['Undead', 'Caster', 'Elite'],
            lore: 'Bound to the gate it failed to hold, and holding it still.',
            stats: [
              { label: 'HP', value: 184_000 },
              { label: 'ATK', value: 3_420 },
              { label: 'DEF', value: 1_180 },
              { label: 'SPD', value: 118 },
            ],
            resists: [
              { label: 'Fire', value: -0.5 },
              { label: 'Holy', value: -0.8 },
              { label: 'Dark', value: 0.9 },
              { label: 'Physical', value: 0.2 },
            ],
            drops: [
              { name: 'Rotbone Charm', art: 'rune-crystal-shard', rarity: 'epic', chance: 12 },
              { name: 'Grave Ash', art: 'earth-amethyst-cluster', rarity: 'rare', chance: 34 },
              { name: 'Cracked Fang', art: 'hunt-dire-wolf', rarity: 'common', chance: 80 },
            ],
            slain: 34,
            slainTarget: 50,
          }).el,
        stage: 'wide',
      },
      {
        title: 'Not yet encountered',
        note: 'The art is still drawn — as a silhouette.',
        build: () =>
          new CodexEntry({
            name: 'Emberwake',
            art: 'fire-phoenix-rise',
            undiscovered: true,
          }).el,
      },
    ],
  },

  {
    id: 'MatchHistory',
    name: 'MatchHistory',
    group: 'combat',
    blurb: 'Recent battles — result, opponent, rating swing and the team that was fielded.',
    description:
      'The summary row is computed from the records rather than passed in, so it can never disagree with the list under it. One bold letter carries each outcome, which makes a session’s shape readable by scanning the left edge alone.',
    tags: ['history', 'matches', 'arena', 'pvp', 'record', 'results', 'replay', 'log'],
    related: ['ArenaMatchup', 'Leaderboard', 'ResultScreen', 'DamageMeter'],
    demos: [
      {
        title: 'An arena session',
        build: () => {
          const history = new MatchHistory({
            title: 'Recent battles',
            summary: true,
            maxHeight: 300,
            matches: [
              { id: 'm1', result: 'win', opponent: 'Ashvale', art: 'tech-mech-suit', delta: 24,
                time: '12m ago', mode: 'Classic Arena', replayable: true,
                team: ['blood-necromancer', 'fire-phoenix-rise', 'weapon-warhammer'] },
              { id: 'm2', result: 'loss', opponent: 'Hollowlight', art: 'hunt-dire-wolf', delta: -11,
                time: '38m ago', mode: 'Classic Arena', replayable: true,
                team: ['earth-amethyst-cluster', 'rune-crystal-shard'] },
              { id: 'm3', result: 'win', opponent: 'The Ninth Gate', art: 'blood-necromancer', delta: 19,
                time: '1h ago', mode: 'Tag Team' },
              { id: 'm4', result: 'draw', opponent: 'Sablethorn', delta: 0, time: '2h ago', mode: 'Tag Team' },
              { id: 'm5', result: 'win', opponent: 'Rhogar', art: 'weapon-warhammer', delta: 22, time: '3h ago' },
            ],
          });
          history.on<string>('match:replay', (id) => console.log('replay', id));
          return history.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'FriendList',
    name: 'FriendList',
    group: 'social',
    blurb: 'Presence, power, the support champion they lend, and the daily gift loop.',
    description:
      'Online friends sort to the top automatically — a list where the person you can actually play with is buried under fifty offline names is the common failure here. The presence pip lives on the avatar rather than in its own column, so it stays attached to the person when the row wraps.',
    tags: ['friends', 'social', 'presence', 'online', 'gift', 'support', 'invite', 'roster'],
    related: ['ClanCard', 'ChatPanel', 'MailInbox', 'Leaderboard'],
    demos: [
      {
        title: 'The daily gift round',
        build: () => {
          const friends = new FriendList({
            title: 'Friends',
            capacity: 50,
            bulkGifts: true,
            maxHeight: 320,
            friends: [
              { id: 'f1', name: 'Rhogar', art: 'tech-mech-suit', level: 61, status: 'online',
                power: 204_000, supportArt: 'fire-phoenix-rise', giftReady: true, clan: 'ASH' },
              { id: 'f2', name: 'Nell', art: 'fire-phoenix-rise', level: 58, status: 'in-battle',
                power: 188_400, supportArt: 'blood-necromancer', giftPending: true, clan: 'ASH' },
              { id: 'f3', name: 'Sable', art: 'hunt-dire-wolf', level: 44, status: 'idle',
                power: 121_900, giftReady: true },
              { id: 'f4', name: 'Drab', art: 'earth-amethyst-cluster', level: 30, status: 'offline',
                lastSeen: '2h ago', power: 48_200 },
              { id: 'f5', name: 'Lume', art: 'rune-crystal-shard', level: 22, status: 'offline',
                lastSeen: '4d ago', power: 19_400 },
            ],
          });
          friends.on<string>('friend:gift', (id) => friends.markSent(id));
          friends.on('friend:gift-all', (ids) => console.log('gift', ids));
          return friends.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'AchievementList',
    name: 'AchievementList',
    group: 'widgets',
    blurb: 'The achievements ledger: what is done, what is close, and what pays out.',
    description:
      '`AchievementPopup` is the toast that fires on unlock; this is the record behind it. Completed-but-unclaimed rows sort to the top by default, because an uncollected reward buried on page three is a reward nobody collects.',
    tags: ['achievements', 'trophies', 'milestones', 'progress', 'claim', 'points', 'challenges'],
    related: ['AchievementPopup', 'QuestLog', 'RewardTrack', 'CollectionProgress'],
    demos: [
      {
        title: 'Mid-account achievements',
        build: () => {
          const list = new AchievementList({
            title: 'Achievements',
            showScore: true,
            claimableFirst: true,
            maxHeight: 340,
            achievements: [
              { id: 'a1', name: 'Gate Breaker', description: 'Clear 50 campaign stages',
                glyph: 'glyph-shield-block', tier: 'II', value: 50, target: 50,
                reward: '300 gems', rewardArt: 'rune-radiant-gem', points: 20 },
              { id: 'a2', name: 'Ascendant', description: 'Ascend a champion to 6★',
                glyph: 'glyph-shooting-stars', tier: 'III', value: 2, target: 5,
                reward: '1 Void Shard', rewardArt: 'rune-crystal-shard', points: 40 },
              { id: 'a3', name: 'Collector', description: 'Own 100 champions',
                glyph: 'glyph-owl', value: 84, target: 100, reward: '500 gems', points: 30 },
              { id: 'a4', name: 'First Blood', description: 'Win an arena battle',
                glyph: 'glyph-crossed-swords', value: 1, target: 1, reward: '50 gems',
                points: 10, claimed: true },
            ],
          });
          list.on<string>('achievement:claim', (id) => list.claim(id));
          return list.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'CollectionProgress',
    name: 'CollectionProgress',
    group: 'gacha',
    blurb: 'Collection completion split by rarity, with milestone rewards along a rail.',
    description:
      'A single "66%" hides the fact that the last 34% is all legendaries; the per-rarity rows do not. Tiers are drawn in canonical rarity order whatever order they arrive in, so two collections are always comparable at a glance.',
    tags: ['collection', 'completion', 'owned', 'rarity', 'progress', 'milestones', 'index'],
    related: ['ChampionList', 'AchievementList', 'ShardCounter', 'RewardTrack'],
    demos: [
      {
        title: 'A champion index',
        build: () =>
          new CollectionProgress({
            title: 'Champions',
            unit: 'champions',
            tiers: [
              { rarity: 'uncommon', owned: 18, total: 18 },
              { rarity: 'rare', owned: 48, total: 52 },
              { rarity: 'epic', owned: 27, total: 44 },
              { rarity: 'legendary', owned: 9, total: 32 },
              { rarity: 'mythic', owned: 0, total: 6 },
            ],
            milestones: [
              { at: 25, label: 'Sacred Shard', claimed: true },
              { at: 50, label: '500 gems', claimed: true },
              { at: 75, label: 'Void Shard' },
              { at: 100, label: 'Mythic ticket' },
            ],
          }).el,
        stage: 'wide',
      },
    ],
  },

  {
    id: 'LeaderboardPodium',
    name: 'LeaderboardPodium',
    group: 'social',
    blurb: 'The top-three podium that heads a leaderboard, with tinted ornament frames.',
    description:
      'First place is raised in the middle with second and third stepped down either side, so the ranking reads as a shape before any number is parsed. The avatar frames are one ornament asset drawn as a mask, tinted gold, silver and bronze. Pair it with `Leaderboard` for places four and below.',
    tags: ['podium', 'leaderboard', 'top 3', 'ranking', 'winners', 'season', 'crown', 'trophy'],
    related: ['Leaderboard', 'TintFrame', 'MatchHistory', 'ClanCard'],
    demos: [
      {
        title: 'A season’s top three',
        build: () =>
          new LeaderboardPodium({
            title: 'Clan Boss — Nightmare',
            subtitle: 'Season 14 · resets in 2d',
            frameShape: 7,
            compactScores: true,
            entries: [
              { name: 'Rhogar', art: 'tech-mech-suit', score: 48_200_000, tag: 'ASH', reward: '1 Void Shard' },
              { name: 'Nell', art: 'fire-phoenix-rise', score: 44_100_000, tag: 'ASH', reward: '500 gems', you: true },
              { name: 'Sable', art: 'hunt-dire-wolf', score: 39_800_000, tag: 'HLW', reward: '250 gems' },
            ],
          }).el,
        stage: 'wide',
      },
    ],
  },

  {
    id: 'SideNav',
    name: 'SideNav',
    group: 'controls',
    blurb: 'The vertical rail a desktop layout uses where a phone uses BottomNav.',
    description:
      'In `icons` mode the label becomes a hover tooltip rather than disappearing, so the rail stays usable for anyone who does not recognise a glyph. Items flagged `footer` sink to the bottom, which is where settings live in every game with this layout.',
    tags: ['nav', 'sidebar', 'rail', 'menu', 'navigation', 'vertical', 'tabs', 'desktop'],
    related: ['BottomNav', 'Tabs', 'SegmentedControl', 'RadialMenu'],
    demos: [
      {
        title: 'Icon rail and full rail',
        build: () => {
          const items = [
            { id: 'campaign', label: 'Campaign', glyph: 'glyph-crossed-swords' },
            { id: 'roster', label: 'Champions', glyph: 'glyph-eagle-staff', badge: 3 },
            { id: 'gear', label: 'Gear', glyph: 'glyph-shield-block' },
            { id: 'summon', label: 'Portal', glyph: 'glyph-shooting-stars', dot: true },
            { id: 'clan', label: 'Clan', glyph: 'glyph-holy-totem' },
            { id: 'shop', label: 'Shop', glyph: 'glyph-burning-scroll', disabled: true },
            { id: 'settings', label: 'Settings', glyph: 'glyph-hourglass', footer: true },
          ];
          const rail = new SideNav({ items, value: 'roster', variant: 'icons', fill: true });
          rail.on<string>('nav:change', (id) => console.log('go', id));
          return row(
            rail.el,
            new SideNav({ items, value: 'campaign', variant: 'full', title: 'Ashfall' }).el,
          );
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'Ticker',
    name: 'Ticker',
    group: 'feedback',
    blurb: 'The scrolling announcement rail — rare pulls, boss kills, server notices.',
    description:
      'The one piece of a game’s UI that exists purely to make other players’ luck visible. The scroll is a CSS animation over a duplicated track translated by exactly one run’s width, so it loops with no seam, needs no timer, and stops dead under `prefers-reduced-motion`.',
    tags: ['ticker', 'marquee', 'announcements', 'scroll', 'news', 'broadcast', 'world chat'],
    related: ['ChatPanel', 'Toast', 'EventBanner', 'SummonResult'],
    demos: [
      {
        title: 'World announcements',
        note: 'Hover to pause it and read one.',
        build: () => {
          const ticker = new Ticker({
            label: 'World',
            glyph: 'glyph-shooting-stars',
            speed: 24,
            messages: [
              { from: 'Rhogar', text: 'summoned Vexhollow from an Ancient Shard!', tone: 'rare', glyph: 'glyph-magic-staff' },
              { from: 'Server', text: 'Ember Ascendant ends in 3 hours.', tone: 'event', glyph: 'glyph-hourglass' },
              { from: 'Nell', text: 'cleared Nightmare Clan Boss for the first time!', tone: 'rare' },
              { from: 'Server', text: 'Maintenance at 04:00 UTC. Expect 20 minutes of downtime.', tone: 'warn' },
            ],
          });
          ticker.push({ from: 'Sable', text: 'reached VIP 6.', tone: 'info' });
          return ticker.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'HealthPips',
    name: 'HealthPips',
    group: 'data',
    blurb: 'Discrete hearts, lives or charges — with halves and bonus pips.',
    description:
      'The row of hearts an action RPG uses where a continuous bar would be less readable. The art is drawn as a CSS mask, so one heart asset serves red health, blue shields and gold charges without three separate images. Bonus pips sit past the end of the track so they read as temporary, not as a bigger maximum.',
    tags: ['hearts', 'lives', 'pips', 'health', 'charges', 'discrete', 'zelda', 'containers'],
    related: ['StatBar', 'ShieldBar', 'EnergyBar', 'UnitFrame'],
    demos: [
      {
        title: 'Hearts, halves and bonus',
        note: 'Click to take a hit — bonus pips are eaten first.',
        build: () => {
          const hearts = new HealthPips({
            value: 3.5,
            max: 5,
            bonus: 2,
            criticalAt: 1,
            showCount: true,
            size: 26,
          });
          hearts.on('pips:empty', () => console.log('down'));
          hearts.el.addEventListener('click', () => hearts.damage(0.5));
          return hearts.el;
        },
      },
      {
        title: 'Other resources, same asset',
        build: () =>
          col(
            new HealthPips({ value: 4, max: 6, color: 'var(--fui-mana)', size: 20 }).el,
            new HealthPips({ value: 2, max: 3, color: 'var(--fui-gold)', size: 20, criticalAt: 1 }).el,
            new HealthPips({ value: 6, max: 10, variant: 'chip', size: 26, showCount: true }).el,
          ),
      },
    ],
  },

  {
    id: 'PatchNotes',
    name: 'PatchNotes',
    group: 'widgets',
    blurb: 'The changelog a live game shows on login, with every change tagged.',
    description:
      'The tag is the useful part: a player scanning for whether their main got hit is looking for the red word, not reading the paragraph. Releases collapse through `grid-template-rows`, so one opens smoothly without anyone measuring its content.',
    tags: ['patch notes', 'changelog', 'release', 'version', 'update', 'buff', 'nerf', 'news'],
    related: ['Accordion', 'EventBanner', 'MainMenu', 'Modal'],
    demos: [
      {
        title: 'Two releases',
        build: () => {
          const notes = new PatchNotes({
            title: 'What’s new',
            maxHeight: 360,
            releases: [
              {
                version: '4.2.0',
                date: '18 Aug',
                title: 'Ember Ascendant',
                open: true,
                lines: [
                  { kind: 'event', text: 'Ember Ascendant runs for two weeks. Double fire shard drops in every keep.' },
                  { kind: 'new', text: 'Added the Mastery board for champions at level 50 and above.' },
                  { kind: 'nerf', subject: 'Vexhollow', art: 'blood-necromancer',
                    text: 'Grave Tithe healing reduced from 20% to 15% of damage dealt.' },
                  { kind: 'buff', subject: 'Grixmaul', art: 'weapon-warhammer',
                    text: 'Rive now hits twice at 1.8× ATK, up from 1.5×.' },
                  { kind: 'fix', text: 'Fixed the turn meter reordering incorrectly after a revive.' },
                ],
              },
              {
                version: '4.1.3',
                date: '4 Aug',
                title: 'Stability',
                lines: [
                  { kind: 'fix', text: 'Fixed a crash when opening the codex during a battle.' },
                  { kind: 'balance', text: 'Nightmare Clan Boss enrage timer extended by 30 seconds.' },
                ],
              },
            ],
          });
          notes.on<string>('patch:open', (v) => console.log('opened', v));
          return notes.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'LootRoll',
    name: 'LootRoll',
    group: 'combat',
    blurb: 'Need, Greed or Pass on a timer, with the party’s picks appearing as they commit.',
    description:
      'The classic party-RPG moment `LootWindow` does not cover, because that one is a solo pickup. Letting the timer run out counts as a pass, and the countdown clears itself on choose, on reveal and on destroy — a resolved roll never keeps ticking in the background.',
    tags: ['loot', 'roll', 'need', 'greed', 'pass', 'party', 'dice', 'group', 'raid'],
    related: ['LootWindow', 'ItemCard', 'RewardPopup', 'PartyFrame'],
    demos: [
      {
        title: 'A contested drop',
        note: 'Pick one — the countdown stops the moment you commit.',
        build: () => {
          const roll = new LootRoll({
            itemName: 'Bloodforged Cuirass',
            itemArt: 'weapon-warhammer',
            itemRarity: 'legendary',
            itemNote: 'Plate chest · +48% ATK',
            seconds: 30,
            canNeed: true,
            participants: [
              { id: 'a', name: 'Rhogar', art: 'tech-mech-suit', choice: 'need' },
              { id: 'b', name: 'Nell', art: 'fire-phoenix-rise', choice: 'greed' },
              { id: 'c', name: 'Sable', art: 'hunt-dire-wolf' },
            ],
          });
          roll.on<'need' | 'greed' | 'pass'>('roll:choose', (choice) => console.log('rolled', choice));
          return roll.el;
        },
      },
      {
        title: 'Resolved',
        note: 'What the panel looks like once the server sends the numbers back.',
        build: () => {
          const roll = new LootRoll({
            itemName: 'Tidewrought Greaves',
            itemArt: 'rune-crystal-shard',
            itemRarity: 'epic',
            itemNote: 'Boots · +30 SPD',
            canNeed: false,
          });
          roll.reveal([
            { id: 'a', name: 'Rhogar', art: 'tech-mech-suit', choice: 'greed', roll: 84, winner: true },
            { id: 'b', name: 'Nell', art: 'fire-phoenix-rise', choice: 'greed', roll: 41 },
            { id: 'c', name: 'Sable', art: 'hunt-dire-wolf', choice: 'pass' },
          ]);
          return roll.el;
        },
      },
    ],
  },
];
