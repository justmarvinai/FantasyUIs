import type { CatalogEntry } from '../types.ts';

import { StatBlock } from '../../lib/components/StatBlock.ts';
import { RelationshipWeb } from '../../lib/components/RelationshipWeb.ts';
import { TierList } from '../../lib/components/TierList.ts';
import { Ledger } from '../../lib/components/Ledger.ts';
import { ResistGrid } from '../../lib/components/ResistGrid.ts';

export const RECORDS: CatalogEntry[] = [
  {
    id: 'StatBlock',
    name: 'StatBlock',
    group: 'data',
    blurb: 'The bestiary entry: AC, HP, six ability scores with modifiers, and traits split into actions and reactions.',
    description:
      'The monster stat block is one of the most-copied layouts in games, and it has real rules in it: ability scores print their modifier, actions and reactions and legendary actions are visually distinct, and the challenge rating sits where a GM expects to find it. Pass raw scores and the block computes the modifiers itself — `+3` from an 16 — so your data stays the source of truth and cannot disagree with the display.',
    tags: ['stat block', 'bestiary', 'monster', 'dnd', 'ttrpg', 'ability scores', 'ac', 'hp', 'traits', 'challenge'],
    related: ['DiceRoller', 'Tooltip', 'ResistGrid', 'StatsPanel'],
    demos: [
      {
        title: 'A bestiary entry',
        note: 'Modifiers are derived from the scores; trait kinds colour their own headings.',
        build: () =>
          new StatBlock({
            name: 'Bog Warden',
            kind: 'Large plant, neutral evil',
            art: 'blood-cursed-beast',
            ac: '16 (natural armour)',
            hp: '133 (14d10 + 56)',
            speed: '30 ft., swim 20 ft.',
            challenge: 'CR 8 · 3,900 XP',
            color: '#7fb069',
            scores: [
              { key: 'STR', value: 20 },
              { key: 'DEX', value: 8 },
              { key: 'CON', value: 18 },
              { key: 'INT', value: 5 },
              { key: 'WIS', value: 14 },
              { key: 'CHA', value: 7 },
            ],
            lines: [
              { label: 'Saving throws', value: 'CON +8, WIS +6' },
              { label: 'Damage resistances', value: 'bludgeoning, piercing' },
              { label: 'Senses', value: 'tremorsense 60 ft., passive Perception 12' },
            ],
            traits: [
              { name: 'Rooted', text: 'While in swamp terrain, the warden cannot be moved against its will.', kind: 'trait' },
              { name: 'Strangling Vines', text: 'Melee attack, +8 to hit, reach 15 ft. Hit: 18 (3d8 + 5) bludgeoning and the target is grappled.', kind: 'action' },
              { name: 'Thornburst', text: 'When damaged by a melee attack, deals 7 (2d6) piercing to the attacker.', kind: 'reaction' },
            ],
          }).el,
      },
    ],
  },
  {
    id: 'RelationshipWeb',
    name: 'RelationshipWeb',
    group: 'data',
    blurb: 'Who owes whom: a node graph of allies, rivals, oaths and debts with the player at the centre.',
    description:
      'Faction politics and companion systems generate a web of relationships that a list flattens into nonsense. This draws it: nodes for people and houses, ties typed as ally, rival, family, oath, debt or hostile, each with a strength that sets the line weight. Nodes with no fixed position are laid out on a ring around the player, so a caller can pass raw relationship data and get a readable graph without doing any geometry.',
    tags: ['relationship', 'graph', 'web', 'factions', 'reputation', 'social', 'allies', 'rivals', 'network', 'politics'],
    related: ['ClanCard', 'CompanionPanel', 'ClanFinder', 'DialogueBox'],
    demos: [
      {
        title: 'A court of six houses',
        note: 'Click a node to isolate its ties. The legend names each kind.',
        build: () => {
          const web = new RelationshipWeb({
            title: 'The Emberhold Court',
            height: 340,
            legend: true,
            nodes: [
              { id: 'you', label: 'You', you: true, art: 'hero-emberknight', weight: 1 },
              { id: 'ash', label: 'House Ashvale', art: 'crest-ember-shield', color: '#c9502a', weight: 0.9 },
              { id: 'thorn', label: 'The Thornwardens', art: 'crest-warded-shield', color: '#7fb069', weight: 0.8 },
              { id: 'gild', label: 'Gilded Compact', art: 'crest-gilded-crown', color: '#e0b04a', weight: 0.85 },
              { id: 'veyra', label: 'Veyra the Pale', art: 'blood-pale-priest', color: '#9a6fd0', weight: 0.6 },
              { id: 'korr', label: 'Korr Ironjaw', art: 'hero-brute', color: '#8a8a92', weight: 0.7 },
            ],
            ties: [
              { from: 'you', to: 'ash', kind: 'oath', strength: 0.9, label: 'Sworn' },
              { from: 'you', to: 'thorn', kind: 'ally', strength: 0.6 },
              { from: 'you', to: 'gild', kind: 'debt', strength: 0.8, label: '4,000g', directed: true },
              { from: 'ash', to: 'veyra', kind: 'hostile', strength: 0.9 },
              { from: 'thorn', to: 'veyra', kind: 'rival', strength: 0.5 },
              { from: 'gild', to: 'korr', kind: 'family', strength: 0.7 },
              { from: 'korr', to: 'you', kind: 'rival', strength: 0.6, directed: true },
            ],
          });
          web.on<string>('web:select', (id) => console.log('inspect', id));
          return web.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'TierList',
    name: 'TierList',
    group: 'data',
    blurb: 'S through D rows you can drag entries between — meta rankings, team planners, community voting.',
    description:
      'Tier lists escaped the community and became a UI: hero rankings inside gacha games, loadout planners, "rate your run" screens. Rows are declared with their own labels and colours, entries carry art and rarity, and the tray at the bottom holds everything unranked. Read-only it publishes a ranking; interactive it collects one.',
    tags: ['tier list', 'ranking', 'meta', 'drag', 'sort', 'rate', 'S tier', 'community', 'planner', 'vote'],
    related: ['ReorderList', 'ChampionList', 'Leaderboard'],
    demos: [
      {
        title: 'A hero meta list',
        note: 'Drag between rows, or from the tray. Emits `tier:move` with the entry and its new row.',
        build: () => {
          const list = new TierList({
            title: 'Season 4 meta',
            subtitle: 'Community ranking · 12,480 votes',
            size: 56,
            tray: true,
            trayLabel: 'Unranked',
            tiers: [
              { id: 's', label: 'S', color: '#e04a4a', note: 'Defines the meta' },
              { id: 'a', label: 'A', color: '#e08a3c' },
              { id: 'b', label: 'B', color: '#dcc846' },
              { id: 'c', label: 'C', color: '#6bbf5c' },
            ],
            entries: [
              { id: 'pyre', label: 'Pyre Knight', art: 'hero-emberknight', rarity: 'legendary', tier: 's' },
              { id: 'vex', label: 'Vexhollow', art: 'blood-necromancer', rarity: 'legendary', tier: 's' },
              { id: 'stormblade', label: 'Stormblade', art: 'hero-stormblade', rarity: 'epic', tier: 'a' },
              { id: 'duelist', label: 'Sable Duelist', art: 'hero-duelist', rarity: 'epic', tier: 'a' },
              { id: 'golem', label: 'Stone Sentinel', art: 'hero-stone-golem', rarity: 'rare', tier: 'b' },
              { id: 'watch', label: 'Nightwatch', art: 'hero-nightwatch', rarity: 'rare', tier: 'c' },
              { id: 'wander', label: 'Lone Wanderer', art: 'hero-lone-wanderer', rarity: 'uncommon' },
              { id: 'brute', label: 'Korr Ironjaw', art: 'hero-brute', rarity: 'rare' },
            ],
          });
          list.on<{ id: string; tier: string }>('tier:move', (m) => console.log(m.id, '→', m.tier));
          return list.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'Ledger',
    name: 'Ledger',
    group: 'data',
    blurb: 'Where the gold went: a signed transaction list with a running balance and an in/out summary.',
    description:
      'Currency disputes are the most common support ticket in any game with an economy, and the fix is a ledger the player can read. Entries are signed — income green, spending red — and the running balance is computed backwards from the current total, so a caller passes today\'s balance and the history without having to reconcile anything itself.',
    tags: ['ledger', 'transactions', 'gold', 'currency', 'history', 'economy', 'balance', 'income', 'spending', 'log'],
    related: ['CurrencyBar', 'ShopPanel', 'AuctionHouse', 'GuildBank'],
    demos: [
      {
        title: 'A week of gold',
        note: 'The running balance walks backwards from the current total; the summary totals in and out.',
        build: () =>
          new Ledger({
            title: 'Gold ledger',
            balance: 12_480,
            currency: 'g',
            glyph: 'glyph-trophy-cup',
            running: true,
            summary: true,
            maxHeight: 260,
            entries: [
              { label: 'Sold Dawnbreaker', amount: 4200, when: '2h ago', source: 'Auction house', glyph: 'glyph-crossed-swords' },
              { label: 'Repair costs', amount: -320, when: '3h ago', source: 'Emberhold smith', glyph: 'glyph-hammer-hit' },
              { label: 'Ashen Anvil clear', amount: 1850, when: '5h ago', source: 'Chapter 3 boss' },
              { label: 'Bought 40 shards', amount: -2400, when: 'Yesterday', source: 'Ember Exchange' },
              { label: 'Guild dividend', amount: 900, when: 'Yesterday', source: 'Ashfall Vault' },
              { label: 'Bought Warden’s Plate', amount: -6800, when: '2 days ago', source: 'Auction house' },
              { label: 'Daily quests', amount: 640, when: '2 days ago' },
            ],
          }).el,
      },
    ],
  },
  {
    id: 'ResistGrid',
    name: 'ResistGrid',
    group: 'data',
    blurb: 'Elemental resistances as signed bars or a compact grid — what hurts this thing and what bounces off.',
    description:
      'Resistances are signed values around zero, and drawing them as ordinary bars loses the sign that matters most. Here every row grows from a centre line: right for resistance, left for vulnerability, with thresholds you set deciding what counts as strong or weak. The compact grid variant fits the same information into a tooltip.',
    tags: ['resistance', 'elements', 'weakness', 'vulnerability', 'damage types', 'fire', 'ice', 'grid', 'defence', 'matchup'],
    related: ['StatBlock', 'ElementWheel', 'Tooltip', 'CompareStats'],
    demos: [
      {
        title: 'Signed bars',
        note: 'Bars grow out from the centre. Deltas show what a just-equipped item changed.',
        build: () => {
          const grid = new ResistGrid({
            title: 'Resistances',
            variant: 'bars',
            cap: 75,
            strongAt: 30,
            weakAt: -10,
            showValues: true,
            rows: [
              { id: 'fire', label: 'Fire', value: 48, glyph: 'glyph-magic-flame', color: '#c9502a', delta: 12 },
              { id: 'frost', label: 'Frost', value: 22, glyph: 'glyph-shooting-stars', color: '#6fa8dc' },
              { id: 'shock', label: 'Shock', value: -18, glyph: 'glyph-rockets', color: '#d9a441', note: 'Vulnerable' },
              { id: 'poison', label: 'Poison', value: 5, glyph: 'glyph-thorny-branch', color: '#7fb069', delta: -6 },
              { id: 'shadow', label: 'Shadow', value: -35, glyph: 'glyph-cursed-eye', color: '#9a6fd0' },
              { id: 'holy', label: 'Holy', value: 60, glyph: 'glyph-holy-cross', color: '#e0b04a' },
            ],
          });
          return grid.el;
        },
      },
      {
        title: 'Compact grid',
        note: 'The same data at tooltip size.',
        build: () =>
          new ResistGrid({
            variant: 'grid',
            columns: 3,
            rows: [
              { id: 'fire', label: 'Fire', value: 48, glyph: 'glyph-magic-flame', color: '#c9502a' },
              { id: 'frost', label: 'Frost', value: 22, glyph: 'glyph-shooting-stars', color: '#6fa8dc' },
              { id: 'shock', label: 'Shock', value: -18, glyph: 'glyph-rockets', color: '#d9a441' },
              { id: 'poison', label: 'Poison', value: 5, glyph: 'glyph-thorny-branch', color: '#7fb069' },
              { id: 'shadow', label: 'Shadow', value: -35, glyph: 'glyph-cursed-eye', color: '#9a6fd0' },
              { id: 'holy', label: 'Holy', value: 60, glyph: 'glyph-holy-cross', color: '#e0b04a' },
            ],
          }).el,
      },
    ],
  },
];
