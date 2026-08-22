import type { CatalogEntry } from '../types.ts';

import { WishList } from '../../lib/components/WishList.ts';
import { ExchangeShop } from '../../lib/components/ExchangeShop.ts';
import { SkinSelector } from '../../lib/components/SkinSelector.ts';
import { SynergyPanel } from '../../lib/components/SynergyPanel.ts';
import { SubscriptionCard } from '../../lib/components/SubscriptionCard.ts';

export const VAULT: CatalogEntry[] = [
  {
    id: 'WishList',
    name: 'WishList',
    group: 'gacha',
    blurb: 'Aim the pity: pick what the banner is being saved for, see how close it is, and pull without leaving.',
    description:
      'Pity is drawn as one bar with the soft-pity threshold marked on it rather than as a bare "61 / 90", because the number players plan around is *how many more* — and the interesting point is where the rate jumps, not the ceiling. Affordability is checked against the balance before the pull buttons enable, so the panel never offers a wish the player cannot pay for.',
    tags: ['wish', 'pity', 'gacha', 'banner', 'target', 'guarantee', 'pull', 'summon', 'rates', 'soft pity'],
    related: ['SummonScreen', 'BannerCarousel', 'RateTable', 'SummonResult'],
    demos: [
      {
        title: 'Past soft pity, guaranteed',
        note: 'The bar turns gold past the soft-pity mark. Pick a different target and the guarantee text follows it.',
        build: () => {
          const wishes = new WishList({
            title: 'Path of the Ember',
            pity: 76,
            softPity: 74,
            hardPity: 90,
            guaranteed: true,
            currency: 'Astral Shards',
            currencyArt: 'glyph-celestial-body',
            balance: 3200,
            cost: 160,
            selected: 'pyre',
            targets: [
              { id: 'pyre', name: 'Pyre Knight', art: 'hero-emberknight', rarity: 'legendary', chance: 0.006, note: 'Featured · Fire DPS' },
              { id: 'vex', name: 'Vexhollow', art: 'blood-necromancer', rarity: 'legendary', chance: 0.003, note: 'Standard pool', owned: true },
              { id: 'storm', name: 'Stormblade', art: 'hero-stormblade', rarity: 'epic', chance: 0.051, note: 'Rate-up' },
              { id: 'duel', name: 'Sable Duelist', art: 'hero-duelist', rarity: 'epic', chance: 0.051, owned: true },
            ],
          });
          wishes.on<{ id: string; count: number }>('wish:pull', (p) => console.log('pull', p.count, 'for', p.id));
          return wishes.el;
        },
      },
    ],
  },
  {
    id: 'ExchangeShop',
    name: 'ExchangeShop',
    group: 'gacha',
    blurb: 'The token shop every event ends at — per-cycle stock limits, a reset clock and honest affordability.',
    description:
      'Stock and affordability are what make a token shop legible, so both live on the tile: "3 / 5 left" under the price, and a tile that visibly dims the moment the balance drops below cost. Sold out and too expensive look different on purpose — one is gone, the other is a savings target. `buy()` decrements stock optimistically so a ten-tap spending spree stays responsive.',
    tags: ['exchange', 'token shop', 'event shop', 'currency', 'stock', 'limit', 'reset', 'trade', 'shards', 'live ops'],
    related: ['ShopPanel', 'Ledger', 'SubscriptionCard', 'RewardTrack'],
    demos: [
      {
        title: 'An event exchange',
        note: 'Buy something — stock ticks down and the balance follows. Unaffordable tiles go dashed.',
        build: () => {
          const shop = new ExchangeShop({
            title: 'Ember Exchange',
            token: 'Ember Marks',
            tokenArt: 'glyph-magic-flame',
            balance: 1840,
            resetsIn: 3 * 86_400 + 4200,
            size: 110,
            offers: [
              { id: 'core', name: 'Ember Core', art: 'fire-molten-heart', rarity: 'legendary', cost: 1500, limit: 1, tag: 'New' },
              { id: 'shard', name: 'Ascension Shard', art: 'rune-crystal-shard', rarity: 'epic', cost: 400, limit: 5, bought: 2, amount: 10 },
              { id: 'gold', name: 'Gold Pouch', art: 'icon-coins', rarity: 'rare', cost: 120, limit: 10, bought: 3, amount: 5000 },
              { id: 'potion', name: 'Greater Elixir', art: 'icon-potion', cost: 60, limit: 20, bought: 6, amount: 3 },
              { id: 'stone', name: 'Runestone', art: 'icon-rune-stone', rarity: 'rare', cost: 220, limit: 5 },
              { id: 'energy', name: 'Stamina Flask', art: 'icon-heart', cost: 80, amount: 60 },
            ],
          });
          shop.on<{ name: string }>('shop:buy', (o) => console.log('bought', o.name));
          return shop.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'SkinSelector',
    name: 'SkinSelector',
    group: 'gacha',
    blurb: 'The cosmetics wardrobe: a big preview, the strip of everything you own, dye swatches and one button.',
    description:
      'One button, three meanings, is deliberate: a wardrobe that shows Equip and Buy side by side makes the player read both every time. The action reflects the selected skin\'s state, so there is only ever one thing to press — and the preview updates before any network round-trip, because trying skins on is the whole point of the screen. Unowned skins preview as silhouettes.',
    tags: ['skin', 'cosmetic', 'wardrobe', 'outfit', 'dye', 'tint', 'appearance', 'shop', 'equip', 'collection'],
    related: ['DyePicker', 'ChampionCard', 'ChampionList', 'InventoryScreen'],
    demos: [
      {
        title: 'Four skins for one hero',
        note: 'Locked skins preview as silhouettes with an unlock price; owned ones offer dyes and Equip.',
        build: () => {
          const wardrobe = new SkinSelector({
            character: 'Pyre Knight',
            height: 240,
            equipped: 'default',
            skins: [
              { id: 'default', name: 'Emberguard', art: 'hero-emberknight', rarity: 'common', owned: true,
                blurb: 'The plate she was knighted in.', source: 'Default', tints: ['#c9502a', '#6fb3a8', '#c9a248'] },
              { id: 'vanguard', name: 'Ashen Vanguard', art: 'hero-vanguard', rarity: 'epic', owned: true,
                blurb: 'Scorched at the Anvil and never repaired.', source: 'Season 3 reward', tints: ['#8a3a20', '#3b3468', '#7fb069'] },
              { id: 'void', name: 'Voidguard', art: 'hero-voidguard', rarity: 'legendary', price: 1680, priceArt: 'glyph-celestial-body',
                blurb: 'Something answered when she called.', source: 'Emberfall banner' },
              { id: 'storm', name: 'Stormcaller', art: 'hero-stormblade', rarity: 'epic', price: 980, priceArt: 'glyph-celestial-body',
                blurb: 'Lightning, borrowed and not returned.', source: 'Cosmetic shop' },
            ],
          });
          wardrobe.on<{ name: string }>('skin:equip', (s) => console.log('wearing', s.name));
          wardrobe.on<{ name: string }>('skin:buy', (s) => console.log('buy', s.name));
          return wardrobe.el;
        },
        stage: 'scene',
      },
    ],
  },
  {
    id: 'SynergyPanel',
    name: 'SynergyPanel',
    group: 'gacha',
    blurb: 'Team traits and their breakpoints — whether one more Emberborn is worth a board slot.',
    description:
      'Traits sort by how far into their tiers they are, so the ones actually doing work rise to the top and the "one more unit" candidates sit right under them. Every row prints both the tier it has reached *and* the next one, because the decision being made is always about the gap between those two — a panel that only shows the active bonus tells the player nothing about what to build toward.',
    tags: ['synergy', 'traits', 'bonds', 'auto battler', 'tft', 'composition', 'breakpoints', 'resonance', 'team', 'elements'],
    related: ['ElementWheel', 'PartyFrame', 'ChampionList', 'TierList'],
    demos: [
      {
        title: 'A board mid-build',
        note: 'Click a row to expand every tier and the units contributing. Inactive traits stay listed, greyed.',
        build: () => {
          const synergy = new SynergyPanel({
            title: 'Bonds',
            showInactive: true,
            expanded: 'ember',
            synergies: [
              { id: 'ember', name: 'Emberborn', icon: 'glyph-magic-flame', color: '#c9502a', count: 4,
                units: ['Pyre Knight', 'Cinder Adept', 'Ash Hound', 'Emberwing'],
                tiers: [{ at: 2, effect: '+15% burn damage' }, { at: 4, effect: 'Attacks ignite for 3s' }, { at: 6, effect: 'Burns spread on death' }] },
              { id: 'warden', name: 'Thornwarden', icon: 'glyph-nature-shield', color: '#7fb069', count: 2,
                units: ['Thornwarden', 'Bog Sentinel'],
                tiers: [{ at: 2, effect: '+120 armour to the front row' }, { at: 4, effect: 'Roots the first attacker' }] },
              { id: 'void', name: 'Voidtouched', icon: 'glyph-spirit-vortex', color: '#9a6fd0', count: 1,
                units: ['Vexhollow'],
                tiers: [{ at: 2, effect: '+20% spell power' }, { at: 3, effect: 'Casts echo once' }] },
              { id: 'oath', name: 'Oathbound', icon: 'glyph-holy-cross', color: '#e0b04a', count: 0,
                tiers: [{ at: 2, effect: 'Shield the lowest ally' }, { at: 4, effect: 'Revive once per fight' }] },
            ],
          });
          synergy.on<{ name: string }>('synergy:open', (s) => console.log('inspect', s.name));
          return synergy.el;
        },
      },
    ],
  },
  {
    id: 'SubscriptionCard',
    name: 'SubscriptionCard',
    group: 'gacha',
    blurb: 'The monthly pass: price and perks when unowned, a countdown and a daily claim once bought.',
    description:
      'The card has two lives and only ever shows one of them: unowned it is an offer with a price; owned it is a claim button with a countdown. Rendering both — the mistake that makes a shop card feel like an upsell after you have already paid — is why the footer re-renders rather than toggling a class over a merged layout.',
    tags: ['subscription', 'monthly pass', 'battle pass', 'offer', 'daily', 'claim', 'perks', 'store', 'iap', 'streak'],
    related: ['RewardTrack', 'DailyRewards', 'ExchangeShop', 'ShopPanel'],
    demos: [
      {
        title: 'Owned — with today’s gift waiting',
        note: 'Claim it and the button settles into its claimed state and the streak ticks up.',
        build: () => {
          const pact = new SubscriptionCard({
            title: "Adventurer's Pact",
            tagline: '30 days of daily shards',
            art: 'bg-wide',
            price: '$4.99',
            wasPrice: '$7.99',
            badge: 'Best value',
            daysLeft: 18,
            termDays: 30,
            claimable: true,
            dailyReward: '90 shards',
            dailyArt: 'glyph-celestial-body',
            streak: 12,
            perks: [
              { text: '90 Astral Shards every day', icon: 'glyph-celestial-body', highlight: true },
              { text: '+50 stamina cap', icon: 'glyph-health-potion' },
              { text: 'Two extra daily quests', icon: 'glyph-burning-scroll' },
              { text: 'Exclusive Pact banner frame', icon: 'glyph-trophy-cup' },
            ],
          });
          pact.on<{ streak: number }>('sub:claim', (c) => console.log('claimed, streak', c.streak));
          return pact.el;
        },
      },
      {
        title: 'Unowned — the offer',
        note: 'The same component with no `daysLeft`: price, perks and a Subscribe button.',
        build: () =>
          new SubscriptionCard({
            title: 'Ember Pact',
            tagline: 'A season of extra rewards',
            art: 'bg-tall',
            price: '480 gems',
            badge: 'New',
            perks: [
              { text: '2,000 gems, paid over 30 days', icon: 'glyph-celestial-body', highlight: true },
              { text: 'Skip one dungeon lockout daily', icon: 'glyph-hourglass' },
              { text: 'Ash Husk mount at day 30', icon: 'glyph-phoenix' },
            ],
          }).el,
      },
    ],
  },
];
