import type { CatalogEntry } from '../types.ts';

import { CharacterCreator } from '../../lib/components/CharacterCreator.ts';
import { InventoryScreen } from '../../lib/components/InventoryScreen.ts';
import { SummonScreen } from '../../lib/components/SummonScreen.ts';
import { CreditsRoll } from '../../lib/components/CreditsRoll.ts';
import { SeasonEndScreen } from '../../lib/components/SeasonEndScreen.ts';

export const CHAPTERS: CatalogEntry[] = [
  {
    id: 'CharacterCreator',
    name: 'CharacterCreator',
    group: 'screens',
    blurb: 'The whole new-hero flow: class list, full-height portrait, stats and choices, one button out.',
    description:
      'Everything the player picks funnels into one `creator:confirm` payload, so a caller never has to reassemble the build from four separate events. A locked class stays visible with its unlock condition on the button: part of the point of the screen is to show what there is to play toward, and a hidden class cannot do that.',
    tags: ['character creation', 'class select', 'new game', 'hero', 'origin', 'stats', 'build', 'start', 'creator', 'rpg'],
    related: ['StatAllocator', 'SkinSelector', 'TitleGate', 'ChampionCard'],
    demos: [
      {
        title: 'Four classes and an origin',
        note: 'Pick a class; the portrait, stats and skills follow. The locked class prints its unlock condition.',
        build: () => {
          const creator = new CharacterCreator({
            title: 'Create your hero',
            nameField: true,
            namePlaceholder: 'Name your hero',
            confirmLabel: 'Begin',
            statMax: 20,
            classes: [
              { id: 'knight', name: 'Emberknight', art: 'hero-emberknight', icon: 'glyph-shield-block', difficulty: 1,
                blurb: 'Plate, a burning blade and no interest in subtlety. Forgiving to learn, hard to master.',
                stats: { Strength: 16, Vitality: 15, Dexterity: 9, Intellect: 7 },
                skills: [
                  { name: 'Emberbrand', icon: 'glyph-magic-flame', hint: 'Ignite your weapon for 12s.' },
                  { name: 'Bulwark', icon: 'glyph-shield-block', hint: 'Block the next three hits.' },
                ] },
              { id: 'duelist', name: 'Sable Duelist', art: 'hero-duelist', icon: 'glyph-sword-clash', difficulty: 2,
                blurb: 'Fast, brittle, and lethal if you never get hit. Rewards reading the enemy.',
                stats: { Strength: 11, Vitality: 9, Dexterity: 18, Intellect: 10 },
                skills: [
                  { name: 'Riposte', icon: 'glyph-sword-clash', hint: 'Counter a parried blow.' },
                  { name: 'Shadowstep', icon: 'glyph-cloaked-figure', hint: 'Blink behind your target.' },
                ] },
              { id: 'necro', name: 'Vexbinder', art: 'blood-necromancer', icon: 'glyph-flaming-skull', difficulty: 3,
                blurb: 'Trades health for power and keeps a standing army. Punishing until it clicks.',
                stats: { Strength: 7, Vitality: 10, Dexterity: 9, Intellect: 19 },
                skills: [
                  { name: 'Soul Ribbon', icon: 'glyph-spirit-vortex', hint: 'Drain 4% max HP per second.' },
                  { name: 'Raise Husk', icon: 'glyph-flaming-skull', hint: 'Summon a husk from a corpse.' },
                ] },
              { id: 'void', name: 'Voidguard', art: 'hero-voidguard', icon: 'glyph-spirit-vortex', difficulty: 3,
                blurb: 'Something else fights beside you. It has opinions.',
                lockedBy: 'Finish the game once to unlock',
                stats: { Strength: 13, Vitality: 12, Dexterity: 12, Intellect: 15 } },
            ],
            options: [
              { id: 'origin', label: 'Origin', value: 'exile',
                choices: [
                  { id: 'exile', label: 'Exile', hint: '+1 Dexterity, start with a map' },
                  { id: 'noble', label: 'Noble', hint: '+200 gold, worse prices in the Wilds' },
                  { id: 'orphan', label: 'Ashborn', hint: '+1 Vitality, fire resistance' },
                ] },
              { id: 'mode', label: 'Difficulty', value: 'normal',
                choices: [
                  { id: 'story', label: 'Story' },
                  { id: 'normal', label: 'Normal' },
                  { id: 'ember', label: 'Ember', hint: 'Permadeath. No respecs.' },
                ] },
            ],
          });
          creator.on<{ class: string; name: string }>('creator:confirm', (b) => console.log('start', b));
          return creator.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'InventoryScreen',
    name: 'InventoryScreen',
    group: 'screens',
    blurb: 'The bag screen: filter tabs, a slot grid, a detail pane, and the bulk sell that stops a full bag being a chore.',
    description:
      'Capacity is printed beside the tabs and turns amber before the bag is actually full, because the moment worth warning about is the one where the next drop is at risk — not the one after it has already been lost. Marking junk is a per-item toggle (right-click a slot) that feeds one bulk sell, so clearing twenty grey items is one confirmation instead of twenty.',
    tags: ['inventory', 'bag', 'backpack', 'items', 'grid', 'sell', 'junk', 'loot', 'equip', 'screen'],
    related: ['InventoryGrid', 'ItemCard', 'LoadoutSlots', 'GuildBank'],
    demos: [
      {
        title: 'A bag near full',
        note: 'Click a slot to inspect it, right-click to mark junk. The bulk button totals what the junk is worth.',
        build: () => {
          const bag = new InventoryScreen({
            title: 'Backpack',
            tabs: ['All', 'Weapons', 'Armour', 'Consumables'],
            slots: 24,
            gold: 12_480,
            goldArt: 'glyph-trophy-cup',
            selected: 'dawn',
            actions: [
              { id: 'equip', label: 'Equip', tone: 'primary' },
              { id: 'sell', label: 'Sell', tone: 'danger' },
            ],
            items: [
              { id: 'dawn', name: 'Dawnbreaker', art: 'weapon-sunblade', rarity: 'legendary', type: 'Weapons', power: 812,
                description: 'Forged at the Anvil and quenched in the last light of the siege.',
                stats: { Damage: '184 – 231', Strength: '+42', 'Crit chance': '+7.5%' }, equipped: true, value: 4200 },
              { id: 'hammer', name: 'Runed Warhammer', art: 'weapon-warhammer', rarity: 'epic', type: 'Weapons', power: 688,
                stats: { Damage: '210 – 260', Strength: '+31' }, value: 1850 },
              { id: 'axe', name: 'Frost Hatchet', art: 'weapon-frost-axe', rarity: 'rare', type: 'Weapons', power: 402, value: 640 },
              { id: 'blade', name: 'Chipped Longsword', art: 'weapon-longsword-red', type: 'Weapons', power: 88, junk: true, value: 40 },
              { id: 'plate', name: "Warden's Plate", art: 'icon-armor', rarity: 'epic', type: 'Armour', power: 640,
                stats: { Armour: '482', Vitality: '+28' }, value: 2100 },
              { id: 'shield', name: 'Oak Shield', art: 'icon-shield', type: 'Armour', power: 120, junk: true, value: 55 },
              { id: 'potion', name: 'Greater Elixir', art: 'icon-potion', type: 'Consumables', qty: 12,
                description: 'Restores 60% health over 6 seconds.', value: 90 },
              { id: 'scroll', name: 'Scroll of Recall', art: 'icon-scroll', rarity: 'rare', type: 'Consumables', qty: 3, value: 220 },
              { id: 'sack', name: 'Tattered Sack', art: 'icon-sack', type: 'Consumables', qty: 5, junk: true, value: 12 },
              { id: 'key', name: 'Vault Key', art: 'icon-key', rarity: 'rare', type: 'Consumables', qty: 1, value: 400 },
            ],
          });
          bag.on<{ action: string }>('bag:action', (a) => console.log('action', a.action));
          bag.on<unknown[]>('bag:sell-junk', (items) => console.log('sold', items.length, 'items'));
          return bag.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'SummonScreen',
    name: 'SummonScreen',
    group: 'screens',
    blurb: 'The full-screen banner and its reveal — art, cost, pity, two pull buttons and the grid results land in.',
    description:
      '`reveal()` flips the same component from banner to results rather than swapping in a second screen, so the art, the pity counter and the balance the player was just looking at stay put and only the middle changes. Results stagger in on a per-tile delay set from the index, which is what makes a ten-pull feel like ten pulls instead of one grid appearing.',
    tags: ['summon', 'gacha', 'banner', 'pull', 'reveal', 'ten pull', 'rates', 'pity', 'screen', 'lootbox'],
    related: ['WishList', 'SummonResult', 'BannerCarousel', 'RateTable'],
    demos: [
      {
        title: 'A ten-pull, mid-reveal',
        note: 'Continue goes back to the banner; Summon ×10 would call `reveal()` with the server’s results.',
        build: () => {
          const summon = new SummonScreen({
            banner: 'Emberfall',
            art: 'bg-wide',
            featured: 'Pyre Knight · rate-up 50%',
            cost: 160,
            balance: 3200,
            currencyArt: 'glyph-celestial-body',
            pity: 82,
            pityCap: 90,
            endsIn: 5 * 86_400,
            rates: [
              { label: '★★★★★ featured', chance: 0.003 },
              { label: '★★★★★ any', chance: 0.006 },
              { label: '★★★★ rate-up', chance: 0.051 },
              { label: '★★★', chance: 0.943 },
            ],
            results: [
              { id: 'r1', name: 'Pyre Knight', art: 'hero-emberknight', rarity: 'legendary', isNew: true },
              { id: 'r2', name: 'Stormblade', art: 'hero-stormblade', rarity: 'epic' },
              { id: 'r3', name: 'Ash Hound', art: 'hunt-dire-wolf', rarity: 'rare', duplicate: true, converted: '+40 shards' },
              { id: 'r4', name: 'Emberdust', art: 'fire-flame-drop', rarity: 'common' },
              { id: 'r5', name: 'Runed Ingot', art: 'icon-rune-stone', rarity: 'rare' },
              { id: 'r6', name: 'Bog Sentinel', art: 'hero-stone-golem', rarity: 'rare', duplicate: true, converted: '+40 shards' },
              { id: 'r7', name: 'Greater Elixir', art: 'icon-potion', rarity: 'common' },
              { id: 'r8', name: 'Sable Duelist', art: 'hero-duelist', rarity: 'epic', isNew: true },
              { id: 'r9', name: 'Gold Pouch', art: 'icon-coins', rarity: 'common' },
              { id: 'r10', name: 'Ascension Shard', art: 'rune-crystal-shard', rarity: 'epic' },
            ],
          });
          summon.on<number>('summon:pull', (count) => console.log('pull', count));
          summon.on('summon:done', () => summon.reset());
          return summon.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'CreditsRoll',
    name: 'CreditsRoll',
    group: 'screens',
    blurb: 'The end-of-game scroll, with a skip that respects the player who has seen it before.',
    description:
      'The scroll is a single CSS animation over the whole column — one composited transform rather than a scroll position nudged on a timer, so it stays smooth on a phone with a battle still unloading behind it. Travel is expressed in the column\'s own height, which means a longer credits list scrolls further at the same speed instead of racing.',
    tags: ['credits', 'roll', 'scroll', 'end game', 'staff', 'thanks', 'outro', 'ending', 'names', 'screen'],
    related: ['TitleGate', 'ResultScreen', 'SeasonEndScreen', 'LoadingScreen'],
    demos: [
      {
        title: 'A short roll',
        note: 'Set to 24 seconds so you can see it move. `credits:end` fires when the column clears the top.',
        build: () => {
          const credits = new CreditsRoll({
            title: 'Ashfall',
            subtitle: 'A tale of the Emberlands',
            crest: 'crest-ember-shield',
            duration: 24,
            height: 380,
            auto: true,
            skipLabel: 'Skip',
            outro: 'Thank you for playing.',
            sections: [
              { role: 'Design', names: ['Marielle Ashcroft', 'Ivo Renn'] },
              { role: 'Engineering', names: ['Kaz Oyelaran', 'Petra Vance', 'Sam Okonjo'] },
              { role: 'Art', names: ['Yuki Tanabe', 'Rosa Delacroix'] },
              { role: 'Music', names: ['The Emberhold Consort'] },
              { role: 'Thanks', names: ['Everyone who played the beta', 'and stayed for the hard mode'] },
            ],
          });
          credits.on('credits:end', () => console.log('to main menu'));
          credits.on('credits:skip', () => console.log('skipped'));
          return credits.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'SeasonEndScreen',
    name: 'SeasonEndScreen',
    group: 'screens',
    blurb: 'The season wrap-up: where you landed, what you did all season, and what the rank paid out.',
    description:
      'Placement is printed with its percentile worked out for the player — "1,284th of 96,500 · top 1.3%" — because the raw pair means nothing without the division and every player does it anyway. The soft reset to next season\'s starting rank is stated on the same screen rather than discovered later, which is the most common complaint about competitive seasons that end quietly.',
    tags: ['season end', 'wrap up', 'rank', 'placement', 'rewards', 'recap', 'ladder', 'reset', 'competitive', 'screen'],
    related: ['RankUpPanel', 'Leaderboard', 'ResultScreen', 'RewardTrack'],
    demos: [
      {
        title: 'Season 4 results',
        note: 'Claim once — the button settles and `season:claim` hands back the reward list.',
        build: () => {
          const wrap = new SeasonEndScreen({
            season: 'Season 4 — Emberfall',
            art: 'bg-scene-dark',
            rank: 'Emberguard II',
            rankArt: 'crest-warmark',
            placement: 1284,
            entrants: 96_500,
            nextRank: 'Ashbound V',
            nextStarts: 'in 3 days',
            claimLabel: 'Claim rewards',
            stats: [
              { label: 'Battles won', value: 412, delta: '+64', icon: 'glyph-crossed-swords' },
              { label: 'Win rate', value: '58%', delta: '+4%', icon: 'glyph-trophy-cup' },
              { label: 'Best streak', value: 17, delta: '+5', icon: 'glyph-magic-flame' },
              { label: 'Hours played', value: 84, icon: 'glyph-hourglass' },
            ],
            rewards: [
              { id: 'crest', name: 'Emberguard Crest', art: 'crest-ember-shield', rarity: 'legendary' },
              { id: 'shards', name: 'Astral Shards', art: 'rune-crystal-shard', rarity: 'epic', qty: 1200 },
              { id: 'gold', name: 'Gold', art: 'icon-coins', qty: 40_000 },
              { id: 'frame', name: 'Emberfall Frame', art: 'deco-frame-07', rarity: 'epic' },
            ],
          });
          wrap.on<unknown[]>('season:claim', (rewards) => console.log('claimed', rewards.length));
          return wrap.el;
        },
        stage: 'scene',
      },
    ],
  },
];
