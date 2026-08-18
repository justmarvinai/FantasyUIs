import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { InventoryGrid } from '../../lib/components/InventoryGrid.ts';
import { ActionBar } from '../../lib/components/ActionBar.ts';
import { UnitFrame } from '../../lib/components/UnitFrame.ts';
import { PartyFrame } from '../../lib/components/PartyFrame.ts';
import { BuffBar } from '../../lib/components/BuffBar.ts';
import { CastBar } from '../../lib/components/CastBar.ts';
import { DialogueBox } from '../../lib/components/DialogueBox.ts';
import { QuestLog } from '../../lib/components/QuestLog.ts';
import { QuestTracker } from '../../lib/components/QuestTracker.ts';
import { ShopPanel } from '../../lib/components/ShopPanel.ts';
import { ItemCard } from '../../lib/components/ItemCard.ts';
import { LootWindow } from '../../lib/components/LootWindow.ts';
import { CraftingPanel } from '../../lib/components/CraftingPanel.ts';
import { SkillTree } from '../../lib/components/SkillTree.ts';
import { StatsPanel } from '../../lib/components/StatsPanel.ts';
import { Paperdoll } from '../../lib/components/Paperdoll.ts';
import { Minimap } from '../../lib/components/Minimap.ts';
import { CurrencyBar } from '../../lib/components/CurrencyBar.ts';
import { Leaderboard } from '../../lib/components/Leaderboard.ts';
import { RadialMenu } from '../../lib/components/RadialMenu.ts';
import { Button } from '../../lib/components/Button.ts';

const row = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-row' }, ...kids.filter(Boolean));
const col = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-col' }, ...kids.filter(Boolean));

export const WIDGETS: CatalogEntry[] = [
  {
    id: 'InventoryGrid',
    name: 'InventoryGrid',
    group: 'widgets',
    blurb: 'A grid of slots with working drag-and-drop, stacking, sorting and capacity tracking.',
    description:
      'The backpack, bank, stash or chest window. `add()` merges into an existing stack when there is room and otherwise takes the first free cell; dragging a slot onto another swaps them.',
    tags: ['inventory', 'bag', 'backpack', 'grid', 'items', 'stash', 'chest', 'drag', 'storage'],
    related: ['Slot', 'Paperdoll', 'Tooltip'],
    demos: [
      {
        title: 'Backpack',
        note: 'Drag items between cells. Buttons add and sort.',
        build: () => {
          const bag = new InventoryGrid({
            cols: 6,
            size: 24,
            items: [
              { icon: 'icon-sword', name: 'Iron Sword', rarity: 'common' },
              { icon: 'icon-shield', name: 'Oak Shield', rarity: 'uncommon' },
              { icon: 'icon-potion', name: 'Healing Draught', qty: 12, rarity: 'uncommon' },
              { icon: 'icon-armor', name: 'Plate Cuirass', rarity: 'rare' },
              { icon: 'icon-rune-stone', name: 'Ember Rune', qty: 4, rarity: 'epic' },
              { icon: 'icon-key', name: 'Sunken Key', rarity: 'legendary' },
              null,
              { icon: 'icon-scroll', name: 'Old Map' },
              { icon: 'icon-coins', name: 'Gold', qty: 340 },
            ],
            lockedFrom: 18,
          });
          bag.on('inventory:change', () => console.log('bag changed', bag.free, 'free'));

          const add = new Button({ label: 'Add potion', size: 'sm' });
          add.el.addEventListener('click', () =>
            bag.add({ icon: 'icon-potion', name: 'Healing Draught', qty: 1, rarity: 'uncommon' }),
          );
          const sort = new Button({ label: 'Sort', size: 'sm', variant: 'ghost' });
          sort.el.addEventListener('click', () => bag.sort());

          return col(bag.el, row(add.el, sort.el));
        },
      },
    ],
  },

  {
    id: 'ActionBar',
    name: 'ActionBar',
    group: 'widgets',
    blurb: 'The hotbar: numbered ability slots with keybinds, cooldowns, charges and cost shading.',
    description:
      'Actions the player cannot currently afford grey out automatically as you update the resource pool, and pressing a bound number key fires the slot.',
    tags: ['hotbar', 'actionbar', 'abilities', 'skills', 'keybind', 'cooldown', 'spells', 'combat'],
    related: ['Slot', 'HUD', 'BuffBar'],
    demos: [
      {
        title: 'Hotbar with cooldowns',
        note: 'Click a slot, or press 1–6. The last two cost more mana than you have.',
        build: () => {
          const bar = new ActionBar({
            resource: 60,
            bindKeys: true,
            actions: [
              { icon: 'skill-firehand', name: 'Firebolt', cooldown: 4, cost: 20 },
              { icon: 'skill-comet', name: 'Comet Slash', cooldown: 8, cost: 35 },
              { icon: 'skill-soulskull', name: 'Soul Burn', cooldown: 12, cost: 50 },
              { icon: 'skill-thunderhammer', name: 'Thunder Hammer', cooldown: 20, cost: 80 },
              { icon: 'icon-potion', name: 'Healing Draught', cooldown: 30, charges: 5 },
              { icon: 'icon-shield', name: 'Guard', cooldown: 6, cost: 90 },
            ],
          });
          bar.on<{ index: number }>('action:trigger', ({ index }) => console.log('cast', index));
          bar.on('action:denied', () => console.log('not enough mana'));
          return bar.el;
        },
      },
    ],
  },

  {
    id: 'UnitFrame',
    name: 'UnitFrame',
    group: 'widgets',
    blurb: 'Portrait, name, level and resource bars — player, target and boss frames in one.',
    tags: ['unit', 'nameplate', 'player', 'target', 'boss', 'health', 'frame', 'hud', 'enemy'],
    related: ['PartyFrame', 'StatBar', 'Portrait'],
    demos: [
      {
        title: 'Player, target and boss',
        note: 'Click the player frame to take damage.',
        build: () => {
          const player = new UnitFrame({
            name: 'Kaelen',
            level: 24,
            portraitArt: 'silhouette-warrior-m',
            role: 'icon-sword',
            health: 780,
            healthMax: 900,
            mana: 210,
            manaMax: 400,
          });
          player.el.style.cursor = 'pointer';
          player.el.addEventListener('click', () =>
            player.setHealth(player.health.get() <= 90 ? 900 : player.health.get() - 90),
          );

          const target = new UnitFrame({
            kind: 'target',
            name: 'Bog Warden',
            level: 26,
            portraitArt: 'skill-soulskull',
            health: 420,
            healthMax: 1400,
            elite: 'Elite',
          });

          const boss = new UnitFrame({
            kind: 'boss',
            name: 'Thal, the Sunken Gate',
            level: 30,
            portraitArt: 'skill-thunderhammer',
            health: 18400,
            healthMax: 24000,
            mana: 700,
            manaMax: 1000,
            manaKind: 'rage',
            elite: 'Boss',
          });

          return col(row(player.el, target.el), boss.el);
        },
      },
    ],
  },

  {
    id: 'PartyFrame',
    name: 'PartyFrame',
    group: 'widgets',
    blurb: 'The party or raid list — a stack of compact unit frames addressable by id.',
    tags: ['party', 'raid', 'group', 'team', 'allies', 'roster', 'coop'],
    related: ['UnitFrame', 'HUD'],
    demos: [
      {
        title: 'Four-person party',
        note: 'Click a row to select it.',
        build: () => {
          const party = new PartyFrame({
            title: 'Party',
            members: [
              { id: 'p1', name: 'Kaelen', level: 24, health: 780, healthMax: 900, mana: 210, manaMax: 400, role: 'icon-sword', portraitArt: 'silhouette-warrior-m' },
              { id: 'p2', name: 'Sera', level: 22, health: 410, healthMax: 620, mana: 380, manaMax: 500, role: 'icon-scroll', portraitArt: 'silhouette-warrior-f' },
              { id: 'p3', name: 'Bram', level: 25, health: 1020, healthMax: 1100, role: 'icon-shield', portraitArt: 'silhouette-warrior-m' },
              { id: 'p4', name: 'Nix', level: 21, health: 0, healthMax: 540, role: 'icon-key', portraitArt: 'silhouette-warrior-f' },
            ],
          });
          party.setInactive('p4', true);
          party.on<{ id: string }>('party:select', ({ id }) => console.log('target', id));
          return party.el;
        },
      },
    ],
  },

  {
    id: 'BuffBar',
    name: 'BuffBar',
    group: 'widgets',
    blurb: 'Buff and debuff strip with depletion sweeps, countdowns and stack counts.',
    tags: ['buff', 'debuff', 'status', 'effects', 'aura', 'timer', 'dot', 'combat'],
    related: ['UnitFrame', 'HUD'],
    demos: [
      {
        title: 'Active effects',
        note: 'Timers tick live and expired effects drop off.',
        build: () => {
          const buffs = new BuffBar({
            buffs: [
              { id: 'haste', icon: 'skill-comet', name: 'Haste', remaining: 24, total: 30, stacks: 3 },
              { id: 'shield', icon: 'icon-shield', name: 'Barrier', remaining: 55, total: 60 },
              { id: 'might', icon: 'skill-thunderhammer', name: "Giant's Might" },
              { id: 'burn', icon: 'skill-firehand', name: 'Burning', remaining: 9, total: 12, kind: 'debuff' },
              { id: 'curse', icon: 'skill-soulskull', name: 'Soul Rot', remaining: 4, total: 20, stacks: 2, kind: 'debuff' },
            ],
          });
          buffs.on('buff:expire', (b) => console.log('expired', b));
          return buffs.el;
        },
      },
    ],
  },

  {
    id: 'CastBar',
    name: 'CastBar',
    group: 'widgets',
    blurb: 'Timed spell fill with the ability name, icon and countdown, plus interruption.',
    tags: ['cast', 'casting', 'channel', 'spell', 'progress', 'interrupt', 'combat'],
    related: ['StatBar', 'ActionBar'],
    demos: [
      {
        title: 'Cast and interrupt',
        build: () => {
          const cast = new CastBar({ width: 320 });
          const start = new Button({ label: 'Cast', size: 'sm' });
          const stop = new Button({ label: 'Interrupt', size: 'sm', variant: 'ghost' });
          start.el.addEventListener('click', () =>
            cast.start({ name: 'Thunder Hammer', icon: 'skill-thunderhammer', duration: 3 }),
          );
          stop.el.addEventListener('click', () => cast.interrupt());
          cast.on('cast:complete', () => console.log('boom'));
          return col(cast.el, row(start.el, stop.el));
        },
      },
    ],
  },

  {
    id: 'DialogueBox',
    name: 'DialogueBox',
    group: 'widgets',
    blurb: 'Conversation window with portrait, typewriter body text and branching choices.',
    description:
      'Clicking fast-forwards the typewriter, then advances the line. Choices support disabled states, skill-check tags and a dimmed treatment for options the player has already picked.',
    tags: ['dialogue', 'conversation', 'npc', 'talk', 'choices', 'typewriter', 'story', 'text'],
    related: ['Portrait', 'QuestLog'],
    demos: [
      {
        title: 'NPC conversation',
        note: 'Click to skip the typewriter.',
        stage: 'wide',
        build: () => {
          const box = new DialogueBox({ width: 660 });
          box.say({
            speaker: 'Elder Rowan',
            portraitArt: 'silhouette-warrior-m',
            text: 'The Sunken Gate has not opened in an age, and the last who tried it did not come back whole. You are certain you want the key?',
            choices: [
              { id: 'yes', text: 'Give me the key.' },
              { id: 'ask', text: 'What happened to the last one?', tag: '[Insight]' },
              { id: 'bribe', text: 'I can pay for the trouble.', tag: 'Requires 500 Gold', disabled: true },
              { id: 'leave', text: 'Another time.', seen: true },
            ],
          });
          box.on<{ id: string }>('dialogue:choice', ({ id }) => console.log('chose', id));
          return box.el;
        },
      },
    ],
  },

  {
    id: 'QuestLog',
    name: 'QuestLog',
    group: 'widgets',
    blurb: 'The journal: quest list plus a detail pane with objectives, counters and rewards.',
    tags: ['quest', 'journal', 'log', 'objectives', 'missions', 'tasks', 'story'],
    related: ['QuestTracker', 'DialogueBox'],
    demos: [
      {
        title: 'Journal',
        stage: 'wide',
        build: () => {
          const log = new QuestLog({
            quests: [
              {
                id: 'q1',
                title: 'The Sunken Gate',
                kind: 'main',
                level: 24,
                region: 'Emberwood Vale',
                summary: 'Elder Rowan spoke of a gate beneath the marsh that has stayed shut for three generations. Find the key, and find out why.',
                objectives: [
                  { text: 'Speak with Elder Rowan', have: 1, need: 1, done: true },
                  { text: 'Recover the Sunken Key', have: 0, need: 1 },
                  { text: 'Slay bog wardens', have: 3, need: 8 },
                  { text: 'Find the drowned journal', optional: true },
                ],
                rewards: [{ icon: 'icon-sword', label: 'Emberfang' }, { icon: 'icon-potion', qty: 5 }],
                xp: 4200,
                gold: 860,
              },
              { id: 'q2', title: 'Bounty: Marsh Hag', kind: 'bounty', level: 26, region: 'Emberwood Vale', complete: true, objectives: [{ text: 'Slay the Marsh Hag', have: 1, need: 1, done: true }], gold: 300 },
              { id: 'q3', title: 'Herbs for Mira', kind: 'side', level: 18, region: 'Ashfall Keep', objectives: [{ text: 'Gather emberroot', have: 4, need: 10 }], tracked: true },
              { id: 'q4', title: 'Daily: Training Grounds', kind: 'daily', level: 20, objectives: [{ text: 'Win 3 duels', have: 1, need: 3 }] },
            ],
          });
          log.on('quest:track', (q) => console.log('tracking', q));
          return log.el;
        },
      },
    ],
  },

  {
    id: 'QuestTracker',
    name: 'QuestTracker',
    group: 'widgets',
    blurb: 'The compact on-screen objective list pinned to the HUD, with live counters.',
    tags: ['tracker', 'objectives', 'hud', 'quest', 'todo', 'pinned', 'waypoint'],
    related: ['QuestLog', 'HUD'],
    demos: [
      {
        title: 'Pinned objectives',
        note: 'Click the header to collapse.',
        build: () => {
          const tracker = new QuestTracker({
            quests: [
              { id: 'q1', title: 'The Sunken Gate', kind: 'main', objectives: [{ text: 'Recover the Sunken Key', have: 0, need: 1 }, { text: 'Slay bog wardens', have: 3, need: 8 }] },
              { id: 'q3', title: 'Herbs for Mira', kind: 'side', objectives: [{ text: 'Gather emberroot', have: 10, need: 10, done: true }], complete: true },
            ],
          });
          return tracker.el;
        },
      },
    ],
  },

  {
    id: 'ItemCard',
    name: 'ItemCard',
    group: 'data',
    blurb: 'Horizontal item row with icon, name, type line, price and an action button.',
    description: 'The shared building block behind shop lists, loot windows and mail attachments.',
    tags: ['item', 'row', 'list', 'card', 'shop', 'loot', 'entry'],
    related: ['ShopPanel', 'LootWindow', 'Tooltip'],
    demos: [
      {
        title: 'Rows',
        build: () =>
          col(
            new ItemCard({
              item: { icon: 'icon-sword', name: 'Emberfang', type: 'Two-Handed Sword', rarity: 'epic', price: 14500, detail: '+24 Strength' },
              action: 'Buy',
            }).el,
            new ItemCard({
              item: { icon: 'icon-potion', name: 'Healing Draught', type: 'Consumable', rarity: 'uncommon', qty: 12, price: 45 },
              action: 'Buy',
            }).el,
            new ItemCard({
              item: { icon: 'icon-armor', name: 'Wardens Plate', type: 'Chest', rarity: 'legendary', price: 92000, disabled: true },
              action: 'Buy',
            }).el,
          ),
      },
    ],
  },

  {
    id: 'ShopPanel',
    name: 'ShopPanel',
    group: 'widgets',
    blurb: 'Merchant window with category tabs, a stock list and a live purse that greys out what you cannot afford.',
    tags: ['shop', 'merchant', 'store', 'vendor', 'buy', 'sell', 'trade', 'economy'],
    related: ['ItemCard', 'CurrencyBar'],
    demos: [
      {
        title: 'Merchant',
        stage: 'wide',
        build: () => {
          const shop = new ShopPanel({
            title: 'The Ashen Anvil',
            merchant: 'Bram Ironhand',
            gold: 1200,
            categories: [
              {
                id: 'weapons',
                label: 'Weapons',
                icon: 'icon-sword',
                items: [
                  { icon: 'icon-sword', name: 'Iron Sword', type: 'Longsword', rarity: 'common', price: 120, detail: '+6 Strength' },
                  { icon: 'icon-axe', name: 'Bearded Axe', type: 'Battle Axe', rarity: 'uncommon', price: 480, detail: '+11 Strength' },
                  { icon: 'icon-sword', name: 'Emberfang', type: 'Two-Handed Sword', rarity: 'epic', price: 14500 },
                ],
              },
              {
                id: 'armor',
                label: 'Armour',
                icon: 'icon-armor',
                items: [
                  { icon: 'icon-armor', name: 'Plate Cuirass', type: 'Chest', rarity: 'rare', price: 940 },
                  { icon: 'icon-shield', name: 'Oak Shield', type: 'Off Hand', rarity: 'common', price: 85 },
                ],
              },
              {
                id: 'supplies',
                label: 'Supplies',
                icon: 'icon-potion',
                items: [
                  { icon: 'icon-potion', name: 'Healing Draught', type: 'Consumable', rarity: 'uncommon', price: 45 },
                  { icon: 'icon-rune-stone', name: 'Ember Rune', type: 'Material', rarity: 'epic', price: 2200 },
                ],
              },
            ],
          });
          shop.on('shop:buy', (item) => console.log('bought', item));
          return shop.el;
        },
      },
    ],
  },

  {
    id: 'LootWindow',
    name: 'LootWindow',
    group: 'widgets',
    blurb: 'Reward window with hero art, gold and XP chips, and per-item or take-all collection.',
    tags: ['loot', 'reward', 'drop', 'chest', 'spoils', 'treasure', 'pickup'],
    related: ['ItemCard', 'ResultScreen'],
    demos: [
      {
        title: 'Chest contents',
        build: () => {
          const loot = new LootWindow({
            source: 'Ancient Sarcophagus',
            hero: 'icon-chest',
            gold: 340,
            xp: 1200,
            items: [
              { id: 'a', icon: 'icon-sword', name: 'Emberfang', type: 'Two-Handed Sword', rarity: 'epic' },
              { id: 'b', icon: 'icon-rune-stone', name: 'Ember Rune', type: 'Material', rarity: 'rare', qty: 3 },
              { id: 'c', icon: 'icon-potion', name: 'Healing Draught', type: 'Consumable', qty: 5 },
            ],
          });
          loot.on('loot:takeAll', (items) => console.log('took', items));
          return loot.el;
        },
      },
    ],
  },

  {
    id: 'CraftingPanel',
    name: 'CraftingPanel',
    group: 'widgets',
    blurb: 'Recipe list plus ingredient checklist and a craft button that unlocks only when you hold every material.',
    tags: ['craft', 'crafting', 'recipe', 'forge', 'bench', 'materials', 'smithing', 'alchemy'],
    related: ['InventoryGrid', 'ItemCard'],
    demos: [
      {
        title: 'Forge',
        stage: 'wide',
        build: () => {
          const bench = new CraftingPanel({
            title: 'The Ashen Anvil',
            recipes: [
              {
                id: 'sword', name: 'Iron Sword', icon: 'icon-sword', type: 'Blacksmithing · Rank 1', rarity: 'common',
                ingredients: [
                  { icon: 'icon-rune-stone', name: 'Iron Ingot', need: 4, have: 6 },
                  { icon: 'icon-sack', name: 'Leather Strip', need: 2, have: 3 },
                ],
                craftTime: 5,
              },
              {
                id: 'ember', name: 'Emberfang', icon: 'icon-axe', type: 'Blacksmithing · Rank 5', rarity: 'epic',
                ingredients: [
                  { icon: 'icon-rune-stone', name: 'Ember Rune', need: 3, have: 1 },
                  { icon: 'icon-armor', name: 'Warden Plating', need: 1, have: 0 },
                ],
                chance: 0.65, craftTime: 30,
              },
              {
                id: 'potion', name: 'Healing Draught', icon: 'icon-potion', type: 'Alchemy · Rank 2', rarity: 'uncommon',
                ingredients: [{ icon: 'icon-scroll', name: 'Emberroot', need: 2, have: 10 }],
                craftTime: 3,
              },
            ],
          });
          bench.on('craft:start', (r) => console.log('crafting', r));
          return bench.el;
        },
      },
    ],
  },

  {
    id: 'SkillTree',
    name: 'SkillTree',
    group: 'widgets',
    blurb: 'Tiered talent nodes wired by dependency lines, with rank pips and point spending.',
    description:
      'Nodes stay locked until every prerequisite is maxed, and the connector lines light up as branches open.',
    tags: ['skill', 'talent', 'tree', 'perks', 'abilities', 'progression', 'unlock', 'build'],
    related: ['StatsPanel', 'Slot'],
    demos: [
      {
        title: 'Fire branch',
        note: 'Click nodes to spend the 6 available points.',
        build: () => {
          const tree = new SkillTree({
            title: 'Pyromancy',
            points: 6,
            columns: 3,
            nodes: [
              { id: 'kindle', name: 'Kindling', icon: 'skill-firehand', tier: 0, col: 1, rank: 1, maxRank: 3 },
              { id: 'comet', name: 'Comet', icon: 'skill-comet', tier: 1, col: 0, maxRank: 3, requires: ['kindle'] },
              { id: 'burn', name: 'Soul Burn', icon: 'skill-soulskull', tier: 1, col: 2, maxRank: 2, requires: ['kindle'] },
              { id: 'hammer', name: 'Thunder Hammer', icon: 'skill-thunderhammer', tier: 2, col: 1, maxRank: 1, requires: ['comet', 'burn'], keystone: true },
            ],
          });
          tree.on('skill:invest', (d) => console.log('invested', d));
          return tree.el;
        },
      },
    ],
  },

  {
    id: 'StatsPanel',
    name: 'StatsPanel',
    group: 'widgets',
    blurb: 'The character sheet: grouped attribute rows with gear bonuses and point allocation.',
    tags: ['stats', 'attributes', 'character', 'sheet', 'strength', 'points', 'progression'],
    related: ['Paperdoll', 'SkillTree'],
    demos: [
      {
        title: 'Character sheet',
        note: 'Three points to spend on the allocatable rows.',
        build: () => {
          const sheet = new StatsPanel({
            title: 'Kaelen',
            points: 3,
            groups: [
              {
                label: 'Attributes',
                rows: [
                  { id: 'str', label: 'Strength', value: 24, bonus: 6, allocatable: true, icon: 'icon-sword' },
                  { id: 'agi', label: 'Agility', value: 17, bonus: 2, allocatable: true, icon: 'icon-key' },
                  { id: 'arc', label: 'Arcana', value: 9, allocatable: true, icon: 'skill-firehand' },
                  { id: 'vit', label: 'Vitality', value: 21, bonus: 11, allocatable: true, icon: 'icon-heart' },
                ],
              },
              {
                label: 'Combat',
                rows: [
                  { id: 'dmg', label: 'Damage', value: '84 – 112', hint: 'Main hand' },
                  { id: 'arm', label: 'Armour', value: 412, bonus: 40 },
                  { id: 'crit', label: 'Critical', value: '18.4%' },
                  { id: 'res', label: 'Fire Resist', value: '-12%', bonus: -12 },
                ],
              },
            ],
          });
          sheet.on('stats:allocate', (d) => console.log('spent', d));
          return sheet.el;
        },
      },
    ],
  },

  {
    id: 'Paperdoll',
    name: 'Paperdoll',
    group: 'widgets',
    blurb: 'Equipment sockets arranged around a character silhouette, accepting drops from an inventory.',
    tags: ['equipment', 'paperdoll', 'gear', 'equip', 'character', 'armor', 'loadout', 'slots'],
    related: ['InventoryGrid', 'StatsPanel', 'Slot'],
    demos: [
      {
        title: 'Equipped gear',
        build: () => {
          const doll = new Paperdoll({
            silhouette: 'silhouette-warrior-m',
            gearScore: 412,
            equipped: {
              chest: { icon: 'icon-armor', name: 'Plate Cuirass', rarity: 'rare' },
              mainhand: { icon: 'icon-sword', name: 'Emberfang', rarity: 'epic' },
              offhand: { icon: 'icon-shield', name: 'Oak Shield', rarity: 'common' },
              trinket: { icon: 'icon-rune-stone', name: 'Ember Rune', rarity: 'legendary' },
              amulet: { icon: 'icon-star', name: 'Dawnward', rarity: 'mythic' },
            },
          });
          doll.on('equip:click', (d) => console.log('slot', d));
          return doll.el;
        },
      },
    ],
  },

  {
    id: 'Minimap',
    name: 'Minimap',
    group: 'widgets',
    blurb: 'Masked scrolling map with a rotating player arrow and edge-clamped pins.',
    description:
      'Pins outside the visible radius clamp to the edge and shrink, so off-screen objectives still read as directional hints.',
    tags: ['minimap', 'map', 'radar', 'compass', 'navigation', 'pins', 'waypoint', 'hud'],
    related: ['HUD', 'QuestTracker'],
    demos: [
      {
        title: 'Round and square',
        note: 'Click the map to log world coordinates.',
        build: () => {
          const pins = [
            { id: 'gate', x: 1050, y: 1120, kind: 'objective' as const, label: 'The Sunken Gate' },
            { id: 'bram', x: 880, y: 1180, kind: 'vendor' as const, label: 'Bram Ironhand' },
            { id: 'warden', x: 1010, y: 1330, kind: 'enemy' as const, label: 'Bog Warden' },
            { id: 'sera', x: 960, y: 1150, kind: 'ally' as const, label: 'Sera' },
            { id: 'ruin', x: 1600, y: 700, kind: 'poi' as const, label: 'Old Ruin' },
          ];
          const round = new Minimap({ size: 190, x: 1000, y: 1200, heading: 35, zoom: 500, zone: 'Emberwood Vale', pins });
          const square = new Minimap({ size: 190, shape: 'square', x: 1000, y: 1200, heading: 210, zoom: 800, pins });
          return row(round.el, square.el);
        },
      },
    ],
  },

  {
    id: 'CurrencyBar',
    name: 'CurrencyBar',
    group: 'widgets',
    blurb: 'The wallet strip — gold, gems, shards and materials, with gain/spend flashes.',
    tags: ['currency', 'gold', 'money', 'wallet', 'gems', 'shards', 'economy', 'hud'],
    related: ['ShopPanel', 'HUD'],
    demos: [
      {
        title: 'Wallet',
        note: 'Buttons add and spend gold.',
        build: () => {
          const wallet = new CurrencyBar({
            clickable: true,
            currencies: [
              { id: 'gold', icon: 'icon-coins', amount: 12480, label: 'Gold' },
              { id: 'runes', icon: 'icon-rune-stone', amount: 37, label: 'Ember Runes' },
              { id: 'keys', icon: 'icon-key', amount: 3, max: 5, label: 'Dungeon Keys' },
            ],
          });
          const earn = new Button({ label: '+250 gold', size: 'sm' });
          const spend = new Button({ label: '-500 gold', size: 'sm', variant: 'ghost' });
          earn.el.addEventListener('click', () => wallet.add('gold', 250));
          spend.el.addEventListener('click', () => wallet.add('gold', -500));
          return col(wallet.el, row(earn.el, spend.el));
        },
      },
    ],
  },

  {
    id: 'Leaderboard',
    name: 'Leaderboard',
    group: 'widgets',
    blurb: 'Ranked table for high scores, arena ladders and raid clears, with podium treatments.',
    tags: ['leaderboard', 'ranking', 'scores', 'ladder', 'arena', 'table', 'competitive', 'pvp'],
    related: ['ResultScreen'],
    demos: [
      {
        title: 'Arena ladder',
        build: () =>
          new Leaderboard({
            title: 'Arena Ladder',
            scoreLabel: 'Rating',
            pinYou: true,
            entries: [
              { rank: 1, name: 'Vexhollow', score: 2840, level: 30, detail: 'Ashen Order', icon: 'skill-soulskull', change: 2 },
              { rank: 2, name: 'Bramble', score: 2795, level: 30, detail: 'Ironhand', icon: 'icon-axe', change: -1 },
              { rank: 3, name: 'Sera Vale', score: 2740, level: 29, icon: 'skill-firehand', change: 1 },
              { rank: 4, name: 'Nix', score: 2610, level: 28, icon: 'icon-key' },
              { rank: 5, name: 'Kaelen', score: 2588, level: 24, detail: 'You', icon: 'icon-sword', you: true, change: 4 },
              { rank: 6, name: 'Thal', score: 2510, level: 27, icon: 'skill-thunderhammer', change: -3 },
            ],
          }).el,
      },
    ],
  },

  {
    id: 'RadialMenu',
    name: 'RadialMenu',
    group: 'controls',
    blurb: 'Quick-select wheel for consumables, emotes and weapon swaps — mouse, touch or hold-key.',
    tags: ['radial', 'wheel', 'quickselect', 'emote', 'consumable', 'gamepad', 'touch', 'menu'],
    related: ['ActionBar', 'ContextMenu'],
    demos: [
      {
        title: 'Quick wheel',
        note: 'Hover a wedge to read its label.',
        stage: 'scene',
        build: () => {
          const wheel = new RadialMenu({
            centerLabel: 'Quick Use',
            items: [
              { id: 'potion', label: 'Draught', icon: 'icon-potion', count: 4 },
              { id: 'sword', label: 'Emberfang', icon: 'icon-sword' },
              { id: 'shield', label: 'Guard', icon: 'icon-shield' },
              { id: 'rune', label: 'Ember Rune', icon: 'icon-rune-stone', count: 2 },
              { id: 'scroll', label: 'Recall', icon: 'icon-scroll' },
              { id: 'key', label: 'Key', icon: 'icon-key', disabled: true },
            ],
          });
          wheel.open();
          wheel.on('radial:select', (item) => console.log('used', item));
          return wheel.el;
        },
      },
    ],
  },
];
