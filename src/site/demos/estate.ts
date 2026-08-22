import type { CatalogEntry } from '../types.ts';

import { CompanionPanel } from '../../lib/components/CompanionPanel.ts';
import { HousingGrid } from '../../lib/components/HousingGrid.ts';
import { LoadoutSlots } from '../../lib/components/LoadoutSlots.ts';
import { HagglePanel } from '../../lib/components/HagglePanel.ts';
import { EventCalendar } from '../../lib/components/EventCalendar.ts';

export const ESTATE: CatalogEntry[] = [
  {
    id: 'CompanionPanel',
    name: 'CompanionPanel',
    group: 'widgets',
    blurb: 'The pet screen: bond, fullness, the skills that unlock with level, and the button that feeds it.',
    description:
      'Pets, mounts and familiars all run on the same three numbers — level, bond and fullness — and the panel exists to make the decaying one obvious. Fullness prints when it will run out, not just where it is, because "hungry in 4h" is what a player acts on. Skills list their unlock level so the next milestone is always visible, and a summoned companion is marked so nobody feeds one that is already out working.',
    tags: ['companion', 'pet', 'familiar', 'mount', 'bond', 'feed', 'hunger', 'affinity', 'creature', 'summon'],
    related: ['ChampionList', 'StatsPanel', 'IdleRewards', 'BuffBar'],
    demos: [
      {
        title: 'A hungry drake',
        note: 'Feed it — fullness jumps, bond ticks, and the hungry-in estimate re-computes.',
        build: () => {
          const pet = new CompanionPanel({
            name: 'Cinderwing',
            species: 'Ember drake',
            art: 'blood-plague-drake',
            rarity: 'epic',
            level: 14,
            maxLevel: 30,
            bond: 0.62,
            fullness: 0.28,
            hungryIn: 4 * 3600,
            summoned: true,
            feedLabel: 'Feed',
            feedCost: '2 × Ember Haunch',
            bonuses: [
              { label: 'Fire damage', value: '+8%' },
              { label: 'Gathering speed', value: '+12%' },
            ],
            skills: [
              { label: 'Scorch', art: 'fire-flame-burst', at: 5, unlocked: true },
              { label: 'Wing Guard', art: 'glyph-shield-block', at: 12, unlocked: true },
              { label: 'Inferno Dive', art: 'fire-immolation', at: 22 },
            ],
          });
          pet.on('pet:feed', () => console.log('fed'));
          return pet.el;
        },
      },
    ],
  },
  {
    id: 'HousingGrid',
    name: 'HousingGrid',
    group: 'widgets',
    blurb: 'Place furniture on a floor plan — multi-cell pieces, rotation, collision, and a comfort score.',
    description:
      'Player housing is a placement puzzle: pieces occupy more than one cell, they rotate, they cannot overlap, and the room has a score you are trying to raise. The grid owns all of that — footprint, turn, collision — and reports every move so the game can persist the layout. The tray holds what you own but have not placed.',
    tags: ['housing', 'furniture', 'decorate', 'grid', 'placement', 'base building', 'room', 'layout', 'comfort', 'rotate'],
    related: ['InventoryGrid', 'BattleGrid', 'Tabletop', 'CraftingPanel'],
    demos: [
      {
        title: 'A room to furnish',
        note: 'Drag from the tray, click a placed piece to turn it. Overlaps are refused, not silently stacked.',
        build: () => {
          const room = new HousingGrid({
            title: 'Emberhold cottage',
            cols: 8,
            rows: 6,
            cell: 40,
            floor: 'boards',
            tray: true,
            target: 400,
            pieces: [
              { id: 'bed', label: 'Oak bed', art: 'icon-sack', w: 2, d: 3, at: [0, 0], score: 60, rarity: 'common' },
              { id: 'table', label: 'Long table', art: 'icon-chest', w: 3, d: 2, at: [4, 1], score: 85, rarity: 'rare' },
              { id: 'brazier', label: 'Ember brazier', art: 'fire-flame-ring', w: 1, d: 1, at: [3, 4], score: 45, rarity: 'epic' },
              { id: 'rug', label: 'Woven rug', art: 'icon-scroll', w: 3, d: 2, score: 30, owned: 2 },
              { id: 'shrine', label: 'Ancestor shrine', art: 'earth-rune-arch', w: 2, d: 1, score: 120, rarity: 'legendary', owned: 1 },
            ],
          });
          room.on<{ id: string; at: [number, number] }>('house:place', (p) => console.log('placed', p.id, p.at));
          return room.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'LoadoutSlots',
    name: 'LoadoutSlots',
    group: 'widgets',
    blurb: 'Saved gear and skill sets — swap builds in one tap, with locked slots priced rather than hidden.',
    description:
      'Anyone who plays both PvE and PvP re-equips constantly, and a loadout system is the fix. Each slot carries a name, the icons of what is in it, and a power number; one is active. Slots the player has not bought stay in the list with their unlock cost on them, because a hidden slot cannot sell itself.',
    tags: ['loadout', 'build', 'presets', 'gear set', 'swap', 'equipment', 'skills', 'saved', 'slots', 'pvp'],
    related: ['Paperdoll', 'CompareStats', 'SkillTree', 'InventoryScreen'],
    demos: [
      {
        title: 'Three builds and a locked slot',
        note: 'Save overwrites the active slot; the locked one prints its price rather than disappearing.',
        build: () => {
          const loadouts = new LoadoutSlots({
            title: 'Loadouts',
            hint: 'Swapping is free outside combat.',
            saveLabel: 'Save current',
            renameable: true,
            unlockCost: '800 gems',
            slots: [
              { id: 'raid', name: 'Raid — Fire', note: 'Ashen Anvil set', power: 84_200, active: true,
                art: ['weapon-flameblade', 'icon-armor', 'fire-flame-ring', 'rune-ember-mark'] },
              { id: 'pvp', name: 'Arena — Bruiser', note: 'Tenacity stack', power: 79_600,
                art: ['weapon-warhammer', 'icon-shield', 'earth-stone-ring', 'crest-warded-shield'] },
              { id: 'farm', name: 'Farming', note: 'Speed and drop rate', power: 61_400,
                art: ['weapon-hatchet', 'icon-sack', 'hunt-tracking-ring'] },
              { id: 'slot4', name: 'Slot 4', empty: true, locked: true, requirement: 'Unlock for 800 gems' },
            ],
          });
          loadouts.on<string>('loadout:equip', (id) => console.log('equip', id));
          loadouts.on<string>('loadout:unlock', (id) => console.log('buy slot', id));
          return loadouts.el;
        },
      },
    ],
  },
  {
    id: 'HagglePanel',
    name: 'HagglePanel',
    group: 'widgets',
    blurb: 'Barter with a merchant: name your price against their patience, and watch their mood decide the answer.',
    description:
      'Haggling turns a shop transaction into a small game. The player drags an offer between the merchant\'s asking price and a hidden floor; the further below the floor they push, the more patience it costs and the worse the mood gets. All three numbers are exposed, so the game keeps the economics and the panel keeps the drama.',
    tags: ['haggle', 'barter', 'merchant', 'trade', 'price', 'negotiate', 'shop', 'offer', 'patience', 'economy'],
    related: ['ShopPanel', 'AuctionHouse', 'Ledger', 'DialogueBox'],
    demos: [
      {
        title: 'Talking a smith down',
        note: 'Drag the offer. Below the floor the merchant loses patience — three refusals and the deal is off.',
        build: () => {
          const haggle = new HagglePanel({
            merchant: { name: 'Old Marrow', art: 'hero-lone-wanderer' },
            item: { name: 'Runed Warhammer', art: 'weapon-warhammer', rarity: 'epic', note: 'Item level 68' },
            asking: 8400,
            floor: 6100,
            purse: 12_480,
            patience: 3,
            mood: 0.65,
            glyph: 'glyph-trophy-cup',
            currency: 'g',
            action: 'Offer',
          });
          haggle.on<number>('haggle:accept', (price) => console.log('sold for', price));
          haggle.on<number>('haggle:refuse', (left) => console.log('patience left', left));
          return haggle.el;
        },
      },
    ],
  },
  {
    id: 'EventCalendar',
    name: 'EventCalendar',
    group: 'widgets',
    blurb: 'The live-ops month: overlapping banners, raids and sales packed into lanes so nothing hides behind anything.',
    description:
      'Live-ops schedules overlap constantly — a banner across two weeks, a weekend raid inside it, a sale on top of that. The calendar packs events into lanes so two events never share a row, which is the difference between a readable schedule and a pile. Kinds carry their own colours, live events pulse, and the "now" line marks today.',
    tags: ['calendar', 'events', 'schedule', 'live ops', 'banner', 'raid', 'sale', 'month', 'timeline', 'season'],
    related: ['ActivityCalendar', 'BannerCarousel', 'RewardTrack', 'TimeDial'],
    demos: [
      {
        title: 'A month of live-ops',
        note: 'Overlapping runs get their own lanes. Click a day to see what is on.',
        build: () => {
          const cal = new EventCalendar({
            month: 'Emberfall',
            days: 30,
            startsOn: 3,
            today: 12,
            now: true,
            events: [
              { id: 'season', label: 'Season 4', from: 1, to: 30, kind: 'season', glyph: 'glyph-trophy-cup' },
              { id: 'banner', label: 'Pyre Knight banner', from: 4, to: 18, kind: 'banner', glyph: 'glyph-magic-flame', live: true, endsIn: 6 * 86400 },
              { id: 'raid', label: 'Ashen Anvil raid', from: 10, to: 14, kind: 'raid', glyph: 'glyph-crossed-swords', live: true },
              { id: 'sale', label: 'Shard sale', from: 12, to: 15, kind: 'sale', glyph: 'glyph-trophy-cup', live: true },
              { id: 'login', label: 'Login gifts', from: 1, to: 7, kind: 'login', glyph: 'glyph-health-potion' },
              { id: 'maint', label: 'Maintenance', from: 19, kind: 'maintenance', glyph: 'glyph-hourglass' },
              { id: 'banner2', label: 'Vexhollow banner', from: 19, to: 30, kind: 'banner', glyph: 'glyph-flaming-skull' },
            ],
          });
          cal.on<number>('calendar:day', (day) => console.log('day', day, cal.eventsOn(day)));
          return cal.el;
        },
        stage: 'wide',
      },
    ],
  },
];
