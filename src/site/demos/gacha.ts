import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { Glyph } from '../../lib/components/Glyph.ts';
import { StarRating } from '../../lib/components/StarRating.ts';
import { AffinityBadge } from '../../lib/components/AffinityBadge.ts';
import { ChampionCard } from '../../lib/components/ChampionCard.ts';
import { SummonResult } from '../../lib/components/SummonResult.ts';
import { TeamSlots } from '../../lib/components/TeamSlots.ts';
import { TurnMeter } from '../../lib/components/TurnMeter.ts';
import { EnergyBar } from '../../lib/components/EnergyBar.ts';
import { RewardTrack } from '../../lib/components/RewardTrack.ts';
import { DailyRewards } from '../../lib/components/DailyRewards.ts';
import { UpgradePanel } from '../../lib/components/UpgradePanel.ts';
import { StageSelect } from '../../lib/components/StageSelect.ts';
import { OfferCard } from '../../lib/components/OfferCard.ts';
import { CountdownTimer } from '../../lib/components/CountdownTimer.ts';
import { BottomNav } from '../../lib/components/BottomNav.ts';
import { BattleControls } from '../../lib/components/BattleControls.ts';
import { TierBadge } from '../../lib/components/TierBadge.ts';

const row = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-row' }, ...kids.filter(Boolean));
const col = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-col' }, ...kids.filter(Boolean));

export const GACHA: CatalogEntry[] = [
  {
    id: 'Glyph',
    name: 'Glyph',
    group: 'data',
    blurb: 'A monochrome vector icon drawn as a CSS mask, so one file tints to any colour.',
    description:
      'The library ships 40 single-colour glyphs. Because they are painted through a mask rather than embedded as coloured art, the same file serves a greyed-out row, a gold legendary card and a red warning — no duplicate assets, no recolouring pipeline.',
    tags: ['glyph', 'icon', 'line', 'mono', 'svg', 'tint', 'ui', 'symbol', 'vector'],
    related: ['Icon', 'BottomNav', 'AffinityBadge'],
    demos: [
      {
        title: 'One file, every colour',
        note: 'All four are the same SVG; only `tone` differs.',
        build: () =>
          row(
            new Glyph({ glyph: 'glyph-crossed-swords', size: 40, tone: 'dim' }).el,
            new Glyph({ glyph: 'glyph-crossed-swords', size: 40, tone: 'accent' }).el,
            new Glyph({ glyph: 'glyph-crossed-swords', size: 40, tone: 'gold', glow: true }).el,
            new Glyph({ glyph: 'glyph-crossed-swords', size: 40, color: 'var(--fui-rarity-epic)' }).el,
          ),
      },
      {
        title: 'The collection',
        note: 'Forty glyphs for stats, currencies, navigation and status.',
        build: () =>
          row(
            ...[
              'glyph-crossed-swords', 'glyph-shield-block', 'glyph-spell-book', 'glyph-magic-flame',
              'glyph-health-potion', 'glyph-trophy-cup', 'glyph-hourglass', 'glyph-owl',
              'glyph-phoenix', 'glyph-peace-dove', 'glyph-skull-wreath', 'glyph-flaming-skull',
              'glyph-bow-and-arrow', 'glyph-fist-punch', 'glyph-holy-cross', 'glyph-evil-eye',
              'glyph-arcane-symbol', 'glyph-celestial-body', 'glyph-spirit-vortex', 'glyph-nature-shield',
              'glyph-exploding-bomb', 'glyph-broken-shackle', 'glyph-burning-scroll', 'glyph-cloaked-figure',
            ].map((id) => new Glyph({ glyph: id, size: 34, tone: 'dim', label: id }).el),
          ),
      },
    ],
  },

  {
    id: 'StarRating',
    name: 'StarRating',
    group: 'gacha',
    blurb: 'The star track for champion rarity, ascension and campaign clear ratings.',
    tags: ['stars', 'rating', 'rarity', 'ascension', 'awaken', 'tier', 'gacha', 'collection'],
    related: ['ChampionCard', 'StageSelect'],
    demos: [
      {
        title: 'Tracks',
        build: () =>
          col(
            new StarRating({ value: 4, max: 6 }).el,
            new StarRating({ value: 2, max: 6, variant: 'awaken' }).el,
            new StarRating({ value: 3, max: 3, variant: 'stage', size: 15 }).el,
            new StarRating({ value: 5, max: 6, showValue: true, size: 22 }).el,
          ),
      },
      {
        title: 'Earning a star',
        note: 'Click to set the rating — only the newest star pops.',
        build: () => {
          const stars = new StarRating({ value: 3, max: 6, size: 26, interactive: true });
          stars.on<number>('stars:change', (v) => console.log('rating', v));
          return stars.el;
        },
      },
    ],
  },

  {
    id: 'AffinityBadge',
    name: 'AffinityBadge',
    group: 'gacha',
    blurb: 'Element / affinity marker with the counter-relationship arrow used on battle previews.',
    tags: ['affinity', 'element', 'faction', 'type', 'magic', 'spirit', 'force', 'void', 'counter'],
    related: ['ChampionCard', 'Glyph'],
    demos: [
      {
        title: 'Affinity wheel',
        build: () =>
          col(
            row(
              ...['magic', 'spirit', 'force', 'void'].map(
                (a) => new AffinityBadge({ affinity: a, variant: 'chip', size: 30 }).el,
              ),
            ),
            row(
              ...['fire', 'water', 'earth', 'light', 'dark'].map(
                (a) => new AffinityBadge({ affinity: a, size: 32 }).el,
              ),
            ),
            row(
              new AffinityBadge({ affinity: 'force', variant: 'chip', advantage: 'up' }).el,
              new AffinityBadge({ affinity: 'magic', variant: 'chip', advantage: 'down' }).el,
            ),
          ),
      },
    ],
  },

  {
    id: 'ChampionCard',
    name: 'ChampionCard',
    group: 'gacha',
    blurb: 'The collection card: portrait, rarity frame, stars, level, affinity, role and power.',
    description:
      'Everything scales from one width variable, so the same component covers a 96px roster thumbnail and a 200px summon reveal. The top two rarities get a slow shimmer so they stand out in a full roster grid.',
    tags: ['champion', 'hero', 'card', 'unit', 'collection', 'gacha', 'roster', 'rarity', 'portrait'],
    related: ['StarRating', 'TeamSlots', 'SummonResult', 'AffinityBadge'],
    demos: [
      {
        title: 'Rarity ladder',
        build: () =>
          row(
            new ChampionCard({
              name: 'Bramble', art: 'hero-berserker', rarity: 'rare', stars: 3,
              level: 20, maxLevel: 30, affinity: 'spirit', role: 'glyph-fist-punch', power: 8420,
            }).el,
            new ChampionCard({
              name: 'Sera Vale', art: 'hero-green-sorceress', rarity: 'epic', stars: 4,
              level: 40, maxLevel: 40, affinity: 'magic', role: 'glyph-spell-book', power: 21750,
            }).el,
            new ChampionCard({
              name: 'Vexhollow', art: 'blood-necromancer', rarity: 'legendary', stars: 5,
              level: 50, maxLevel: 60, affinity: 'void', role: 'glyph-skull-wreath',
              power: 42180, isNew: true,
            }).el,
            new ChampionCard({
              name: 'Thal', art: 'hero-demon-lord', rarity: 'mythic', stars: 6, awakened: 2,
              level: 60, maxLevel: 60, affinity: 'dark', role: 'glyph-crossed-swords', power: 68900,
            }).el,
          ),
      },
      {
        title: 'States',
        note: 'Selectable, duplicate stacks, locked and not-yet-collected.',
        build: () => {
          const pick = new ChampionCard({
            name: 'Kaelen', art: 'hero-emberknight', rarity: 'epic', stars: 4,
            level: 35, affinity: 'force', role: 'glyph-shield-block', power: 18400,
            size: 120, selectable: true,
          });
          pick.on<{ selected: boolean }>('champion:select', ({ selected }) => console.log('picked', selected));
          return row(
            pick.el,
            new ChampionCard({ name: 'Nix', art: 'hero-duelist', rarity: 'rare', stars: 3, size: 120, count: 4 }).el,
            new ChampionCard({ name: 'Reserved', art: 'hunt-dire-wolf', rarity: 'epic', stars: 4, size: 120, locked: true }).el,
            new ChampionCard({ name: '???', art: 'tech-mech-suit', rarity: 'legendary', stars: 5, size: 120, unowned: true }).el,
          );
        },
      },
    ],
  },

  {
    id: 'SummonResult',
    name: 'SummonResult',
    group: 'gacha',
    blurb: 'The summon reveal — face-down cards that flip, with a burst scaled to the best pull.',
    tags: ['summon', 'gacha', 'pull', 'reveal', 'lootbox', 'draw', 'banner', 'roll'],
    related: ['ChampionCard', 'OfferCard'],
    demos: [
      {
        title: 'Ten-pull',
        note: 'Tap a card to flip it, or reveal all. A legendary lights the whole screen.',
        stage: 'wide',
        build: () => {
          const result = new SummonResult({
            title: 'Void Summon ×5',
            cardSize: 118,
            pulls: [
              { id: 'a', name: 'Bramble', art: 'hero-berserker', rarity: 'rare', stars: 3, affinity: 'spirit' },
              { id: 'b', name: 'Nix', art: 'hero-duelist', rarity: 'rare', stars: 3, affinity: 'force' },
              { id: 'c', name: 'Sera Vale', art: 'hero-green-sorceress', rarity: 'epic', stars: 4, affinity: 'magic', isNew: true },
              { id: 'd', name: 'Ironhand', art: 'hero-stone-golem', rarity: 'uncommon', stars: 2, affinity: 'earth' },
              { id: 'e', name: 'Vexhollow', art: 'blood-necromancer', rarity: 'legendary', stars: 5, affinity: 'void', isNew: true },
            ],
          });
          result.on('summon:done', () => console.log('pull complete'));
          return result.el;
        },
      },
    ],
  },

  {
    id: 'TeamSlots',
    name: 'TeamSlots',
    group: 'gacha',
    blurb: 'The battle lineup — champion cards and empty add tiles, reorderable by drag.',
    tags: ['team', 'lineup', 'formation', 'squad', 'party', 'roster', 'slots', 'gacha'],
    related: ['ChampionCard', 'TurnMeter'],
    demos: [
      {
        title: 'Five-slot formation',
        note: 'Drag to reorder, hover a card for its remove pip, tap a gap to add.',
        build: () => {
          const team = new TeamSlots({
            title: 'Arena Team',
            showPower: true,
            leader: 'vex',
            members: [
              { id: 'vex', name: 'Vexhollow', art: 'blood-necromancer', rarity: 'legendary', stars: 5, level: 50, affinity: 'void', power: 42180 },
              { id: 'sera', name: 'Sera Vale', art: 'hero-green-sorceress', rarity: 'epic', stars: 4, level: 40, affinity: 'magic', power: 21750 },
              { id: 'kael', name: 'Kaelen', art: 'hero-emberknight', rarity: 'epic', stars: 4, level: 35, affinity: 'force', power: 18400 },
              null,
              null,
            ],
          });
          team.on<{ index: number }>('team:add', ({ index }) => console.log('open roster for slot', index));
          return team.el;
        },
      },
    ],
  },

  {
    id: 'TurnMeter',
    name: 'TurnMeter',
    group: 'gacha',
    blurb: 'Live turn-order queue where each unit fills a meter at the rate of its speed stat.',
    description:
      'The queue reorders itself as meters fill, which is exactly why players care about the speed stat. Run it off the built-in clock, or drive `tick()` from your own combat loop.',
    tags: ['turn', 'order', 'initiative', 'speed', 'queue', 'combat', 'battle', 'atb'],
    related: ['TeamSlots', 'BattleControls', 'UnitFrame'],
    demos: [
      {
        title: 'Live queue',
        note: 'Meters fill in real time and the order reshuffles as they do.',
        build: () => {
          const meter = new TurnMeter({
            running: true,
            rate: 0.09,
            units: [
              { id: 'vex', name: 'Vexhollow', art: 'blood-necromancer', speed: 180, meter: 0.3 },
              { id: 'sera', name: 'Sera Vale', art: 'hero-green-sorceress', speed: 140, meter: 0.5 },
              { id: 'kael', name: 'Kaelen', art: 'hero-emberknight', speed: 110, meter: 0.15 },
              { id: 'boss', name: 'Bog Warden', art: 'blood-cursed-beast', speed: 160, meter: 0.6, enemy: true },
              { id: 'add', name: 'Warden Spawn', art: 'blood-plague-drake', speed: 95, enemy: true },
            ],
          });
          meter.on<{ id: string }>('turn:ready', (u) => meter.consume(u.id));
          return meter.el;
        },
      },
    ],
  },

  {
    id: 'EnergyBar',
    name: 'EnergyBar',
    group: 'gacha',
    blurb: 'The capped, regenerating energy pool that paces mobile sessions, with a refill countdown.',
    tags: ['energy', 'stamina', 'regen', 'timer', 'gate', 'mobile', 'session', 'refill'],
    related: ['CountdownTimer', 'StageSelect'],
    demos: [
      {
        title: 'Energy with regeneration',
        note: 'Spend 20 to see the clock restart; spending more than you hold shakes.',
        build: () => {
          const energy = new EnergyBar({
            value: 42, max: 130, regenSeconds: 6, refillable: true, width: 300,
          });
          const spend = h('button', { class: 'demo-btn', text: 'Spend 20' });
          spend.addEventListener('click', () => energy.spend(20));
          const drain = h('button', { class: 'demo-btn', text: 'Spend 999' });
          drain.addEventListener('click', () => energy.spend(999));
          energy.on('energy:refill', () => energy.set(130));
          return col(energy.el, row(spend, drain));
        },
      },
    ],
  },

  {
    id: 'RewardTrack',
    name: 'RewardTrack',
    group: 'gacha',
    blurb: 'Battle-pass rail with free and premium milestone nodes that unlock as you progress.',
    tags: ['battlepass', 'season', 'pass', 'milestone', 'track', 'rewards', 'progress', 'liveops'],
    related: ['DailyRewards', 'CountdownTimer'],
    demos: [
      {
        title: 'Season pass',
        note: 'Gold nodes are premium; reached nodes pulse until claimed.',
        stage: 'wide',
        build: () => {
          const pass = new RewardTrack({
            title: 'Season Pass',
            subtitle: 'Season 4 · 12 days left',
            unit: 'XP',
            progress: 620,
            premiumLocked: true,
            nodes: [
              { at: 100, icon: 'icon-coins', qty: 500, claimed: true },
              { at: 250, icon: 'icon-potion', qty: 5, claimed: true },
              { at: 400, icon: 'earth-amethyst-cluster', qty: 2, premium: true },
              { at: 600, icon: 'icon-chest', qty: 1 },
              { at: 800, icon: 'hunt-golden-egg', premium: true },
              { at: 1000, icon: 'fire-phoenix-rise' },
            ],
          });
          pass.on('track:claim', (n) => console.log('claimed', n));
          return pass.el;
        },
      },
    ],
  },

  {
    id: 'DailyRewards',
    name: 'DailyRewards',
    group: 'gacha',
    blurb: 'The login calendar — collected, claimable and upcoming days, with milestone tiles.',
    tags: ['daily', 'login', 'calendar', 'streak', 'rewards', 'retention', 'liveops'],
    related: ['RewardTrack', 'CountdownTimer'],
    demos: [
      {
        title: 'Seven-day streak',
        note: 'Day 4 is claimable; the rest are locked or already taken.',
        stage: 'wide',
        build: () => {
          const daily = new DailyRewards({
            title: 'Daily Login',
            subtitle: 'Come back tomorrow for more',
            currentDay: 4,
            rewards: [
              { icon: 'icon-coins', qty: 500 },
              { icon: 'icon-potion', qty: 3 },
              { icon: 'earth-citrine-shard', qty: 10 },
              { icon: 'icon-key', qty: 1 },
              { icon: 'icon-sack', qty: 2 },
              { icon: 'earth-amethyst-cluster', qty: 5 },
              { icon: 'icon-chest', qty: 1, milestone: true, label: 'Legendary Chest' },
            ],
          });
          daily.on('daily:claim', (d) => console.log('claimed day', d));
          return daily.el;
        },
      },
    ],
  },

  {
    id: 'UpgradePanel',
    name: 'UpgradePanel',
    group: 'gacha',
    blurb: 'Ascension dialog: stat deltas, material costs, success chance and an affordability gate.',
    tags: ['upgrade', 'ascend', 'levelup', 'rankup', 'materials', 'cost', 'craft', 'progression'],
    related: ['ChampionCard', 'CraftingPanel'],
    demos: [
      {
        title: 'Ascension',
        note: 'The confirm button unlocks only once every cost is covered.',
        build: () =>
          row(
            new UpgradePanel({
              title: 'Ascend Champion',
              icon: 'blood-necromancer',
              from: '★4', to: '★5',
              chance: 0.7,
              stats: [
                { label: 'Attack', from: 1240, to: 1580 },
                { label: 'Health', from: 18200, to: 22400 },
                { label: 'Defence', from: 940, to: 1160 },
              ],
              materials: [
                { icon: 'earth-amethyst-cluster', name: 'Void Shard', need: 4, have: 6 },
                { icon: 'icon-rune-stone', name: 'Ember Rune', need: 2, have: 2 },
              ],
              cost: 120000, balance: 240000,
            }).el,
            new UpgradePanel({
              title: 'Ascend Champion',
              icon: 'hero-demon-lord',
              from: '★5', to: '★6',
              chance: 0.35,
              materials: [
                { icon: 'earth-sapphire-shard', name: 'Astral Shard', need: 6, have: 2 },
                { icon: 'hunt-golden-egg', name: 'Primal Core', need: 1, have: 0 },
              ],
              cost: 500000, balance: 240000,
            }).el,
          ),
      },
    ],
  },

  {
    id: 'StageSelect',
    name: 'StageSelect',
    group: 'gacha',
    blurb: 'Campaign map nodes with clear ratings, energy costs, boss markers and lock state.',
    tags: ['campaign', 'stage', 'level', 'map', 'chapter', 'nodes', 'progress', 'select'],
    related: ['StarRating', 'EnergyBar'],
    demos: [
      {
        title: 'Chapter run',
        note: 'The solid path marks cleared ground; the gold node is next.',
        stage: 'wide',
        build: () => {
          const stages = new StageSelect({
            title: 'Emberwood Vale',
            subtitle: 'Chapter 4 · Brutal',
            stages: [
              { id: '4-1', label: '1', stars: 3, state: 'cleared', cost: 8 },
              { id: '4-2', label: '2', stars: 3, state: 'cleared', cost: 8 },
              { id: '4-3', label: '3', stars: 1, state: 'cleared', cost: 10 },
              { id: '4-4', label: '4', state: 'current', cost: 10 },
              { id: '4-5', label: '5', state: 'locked' },
              { id: '4-6', label: '6', state: 'locked', boss: true },
            ],
          });
          stages.on('stage:select', (s) => console.log('enter', s));
          return stages.el;
        },
      },
    ],
  },

  {
    id: 'OfferCard',
    name: 'OfferCard',
    group: 'gacha',
    blurb: 'Shop bundle with contents, discount flash, live expiry clock and a price button.',
    tags: ['shop', 'offer', 'bundle', 'iap', 'store', 'discount', 'sale', 'monetisation', 'liveops'],
    related: ['CountdownTimer', 'ShopPanel'],
    demos: [
      {
        title: 'Store bundles',
        build: () =>
          row(
            new OfferCard({
              title: 'Starter Bundle',
              subtitle: 'One purchase per account',
              featured: true,
              discount: 60,
              tag: 'BEST VALUE',
              art: 'fire-radiant-dawn',
              price: '£4.99',
              wasPrice: '£12.99',
              endsAt: Date.now() + 86_400_000,
              remaining: 1,
              contents: [
                { icon: 'icon-coins', qty: 5000, label: 'Gold' },
                { icon: 'icon-chest', qty: 3, label: 'Chests' },
                { icon: 'earth-amethyst-cluster', qty: 20, label: 'Shards' },
              ],
            }).el,
            new OfferCard({
              title: 'Rune Pack',
              art: 'earth-emerald-burst',
              price: '£1.99',
              endsAt: Date.now() + 5400_000,
              contents: [
                { icon: 'icon-rune-stone', qty: 12, label: 'Runes' },
                { icon: 'icon-potion', qty: 10, label: 'Potions' },
              ],
            }).el,
          ),
      },
    ],
  },

  {
    id: 'CountdownTimer',
    name: 'CountdownTimer',
    group: 'gacha',
    blurb: 'The "ends in…" clock for offers, dungeon resets and battle passes.',
    description:
      'Anchored to an absolute end time rather than counting ticks, so it stays correct after the tab is backgrounded and the interval is throttled.',
    tags: ['countdown', 'timer', 'clock', 'expiry', 'event', 'reset', 'liveops', 'urgency'],
    related: ['OfferCard', 'EnergyBar', 'RewardTrack'],
    demos: [
      {
        title: 'Formats and urgency',
        note: 'Under an hour the clock turns red and pulses.',
        build: () =>
          col(
            new CountdownTimer({ endsAt: Date.now() + 3 * 86_400_000, label: 'Season ends', glyph: 'glyph-hourglass' }).el,
            new CountdownTimer({ seconds: 5400, label: 'Dungeon reset', glyph: 'glyph-hourglass' }).el,
            new CountdownTimer({ seconds: 95, label: 'Offer ends' }).el,
            new CountdownTimer({ seconds: 4, variant: 'block', label: 'Next wave', doneText: 'Go!' }).el,
          ),
      },
    ],
  },

  {
    id: 'BottomNav',
    name: 'BottomNav',
    group: 'gacha',
    blurb: 'Persistent mobile section bar with per-tab badges and a raised centre action.',
    tags: ['nav', 'navigation', 'tabbar', 'mobile', 'menu', 'sections', 'badge', 'bottom'],
    related: ['Glyph', 'HUD'],
    demos: [
      {
        title: 'Game navigation',
        stage: 'wide',
        build: () => {
          const nav = new BottomNav({
            active: 'battle',
            items: [
              { id: 'champions', label: 'Champions', glyph: 'glyph-cloaked-figure', badge: 3 },
              { id: 'bastion', label: 'Bastion', glyph: 'glyph-holy-totem', dot: true },
              { id: 'battle', label: 'Battle', glyph: 'glyph-crossed-swords', primary: true },
              { id: 'shop', label: 'Shop', glyph: 'glyph-trophy-cup', badge: 12 },
              { id: 'clan', label: 'Clan', glyph: 'glyph-owl' },
            ],
          });
          nav.on<{ id: string }>('nav:change', ({ id }) => console.log('section', id));
          return nav.el;
        },
      },
    ],
  },

  {
    id: 'BattleControls',
    name: 'BattleControls',
    group: 'gacha',
    blurb: 'Auto-play toggle, speed multiplier cycle, pause and retreat for auto-battle RPGs.',
    tags: ['battle', 'auto', 'speed', 'pause', 'retreat', 'controls', 'combat', 'idle'],
    related: ['TurnMeter', 'ActionBar'],
    demos: [
      {
        title: 'Combat chrome',
        note: '×3 is gated, so the cycle skips it.',
        build: () => {
          const controls = new BattleControls({
            speeds: [1, 2, 3],
            lockedSpeeds: [3],
            retreatable: true,
          });
          controls.on<{ speed: number }>('battle:speed', ({ speed }) => console.log('speed', speed));
          controls.on<boolean>('battle:auto', (on) => console.log('auto', on));
          return controls.el;
        },
      },
    ],
  },

  {
    id: 'TierBadge',
    name: 'TierBadge',
    group: 'gacha',
    blurb: 'Arena rank emblem with tier metal, division numeral and rating.',
    tags: ['tier', 'rank', 'arena', 'league', 'division', 'ladder', 'pvp', 'badge', 'competitive'],
    related: ['Leaderboard', 'StarRating'],
    demos: [
      {
        title: 'Ladder tiers',
        build: () =>
          row(
            new TierBadge({ tier: 'bronze', division: 3, size: 64 }).el,
            new TierBadge({ tier: 'silver', division: 1, size: 64 }).el,
            new TierBadge({ tier: 'gold', division: 2, size: 64 }).el,
            new TierBadge({ tier: 'diamond', division: 2, points: 2588, rank: 41, size: 72 }).el,
            new TierBadge({ tier: 'legend', points: 3140, rank: 4, size: 78 }).el,
          ),
      },
    ],
  },
];
