import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { BossHealthBar } from '../../lib/components/BossHealthBar.ts';
import { ShieldBar } from '../../lib/components/ShieldBar.ts';
import { WaveTracker } from '../../lib/components/WaveTracker.ts';
import { DamageMeter } from '../../lib/components/DamageMeter.ts';
import { BattleLog } from '../../lib/components/BattleLog.ts';
import { ComboCounter } from '../../lib/components/ComboCounter.ts';
import { ArenaMatchup } from '../../lib/components/ArenaMatchup.ts';

import { PityCounter } from '../../lib/components/PityCounter.ts';
import { BannerCarousel } from '../../lib/components/BannerCarousel.ts';
import { TopBar } from '../../lib/components/TopBar.ts';
import { VipProgress } from '../../lib/components/VipProgress.ts';
import { EventBanner } from '../../lib/components/EventBanner.ts';
import { RewardPopup } from '../../lib/components/RewardPopup.ts';
import { StreakMeter } from '../../lib/components/StreakMeter.ts';

import { ClanCard } from '../../lib/components/ClanCard.ts';
import { MailInbox } from '../../lib/components/MailInbox.ts';
import { ChatPanel } from '../../lib/components/ChatPanel.ts';

const row = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-row' }, ...kids.filter(Boolean));
const col = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-col' }, ...kids.filter(Boolean));

export const COMBAT: CatalogEntry[] = [
  {
    id: 'BossHealthBar',
    name: 'BossHealthBar',
    group: 'combat',
    blurb: 'The wide phase bar across the top of a raid fight, with a damage trail and enrage timer.',
    description:
      'The trail is what makes a hit land: a pale ghost of the previous value holds for a beat before catching up, so a burst reads as a burst. Phase notches divide the track, and crossing one fires `boss:phase`.',
    tags: ['boss', 'health', 'raid', 'clan boss', 'phase', 'enrage', 'hp', 'bar'],
    related: ['StatBar', 'ShieldBar', 'DamageMeter', 'BattleLog'],
    demos: [
      {
        title: 'A four-phase clan boss',
        note: 'Click to land a hit and watch the trail catch up.',
        build: () => {
          const boss = new BossHealthBar({
            name: 'Demon Lord',
            subtitle: 'Nightmare · Stage 4',
            glyph: 'glyph-flaming-skull',
            value: 82_000_000,
            max: 100_000_000,
            phases: 4,
            enrage: 300,
            enrageElapsed: 90,
            effects: [
              { label: 'Decrease DEF', turns: 2, debuff: true, glyph: 'glyph-shield-block' },
              { label: 'Weaken', turns: 1, debuff: true, glyph: 'glyph-fist-punch' },
              { label: 'Shield', turns: 3, glyph: 'glyph-nature-shield' },
            ],
          });
          boss.on<number>('boss:phase', (p) => console.log('phase', p));
          boss.el.addEventListener('click', () => boss.damage(6_000_000));
          return boss.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'ShieldBar',
    name: 'ShieldBar',
    group: 'combat',
    blurb: 'Health with an absorb layer riding on top of it.',
    description:
      'The shield sits *past* the health fill rather than over it, so the player reads "620 health, plus 240 of barrier" instead of one ambiguous length. `hit()` applies damage the way the combat system should: shield first, remainder to health.',
    tags: ['shield', 'absorb', 'barrier', 'overshield', 'health', 'ward', 'bar'],
    related: ['StatBar', 'BossHealthBar', 'UnitFrame'],
    demos: [
      {
        title: 'Chewing through a barrier',
        note: 'Click to take 300 damage — the shield eats it first.',
        build: () => {
          const hp = new ShieldBar({
            value: 620,
            max: 1000,
            shield: 380,
            kind: 'health',
            label: 'Vexhollow',
            height: 22,
          });
          hp.on('shield:break', () => console.log('barrier down'));
          hp.el.addEventListener('click', () => hp.hit(300));
          return hp.el;
        },
        stage: 'wide',
      },
      {
        title: 'Variants',
        build: () =>
          col(
            new ShieldBar({ value: 780, max: 1000, shield: 120, kind: 'health', height: 14 }).el,
            new ShieldBar({ value: 420, max: 1000, kind: 'mana', height: 14 }).el,
            new ShieldBar({ value: 560, max: 1000, shield: 90, locked: 250, kind: 'rage', height: 18 }).el,
          ),
        stage: 'wide',
      },
    ],
  },

  {
    id: 'WaveTracker',
    name: 'WaveTracker',
    group: 'combat',
    blurb: 'How much of a stage run is left, with the boss wave marked.',
    description:
      'Pass an array instead of a number when the waves are not interchangeable — an elite room, a treasure room, a boss. The boss pip is a rotated square, different enough in silhouette to spot without reading the label.',
    tags: ['wave', 'stage', 'room', 'dungeon', 'progress', 'pips', 'run', 'floor'],
    related: ['StageSelect', 'BossHealthBar', 'HUD'],
    demos: [
      {
        title: 'A five-wave stage',
        note: 'Click to clear the current wave.',
        build: () => {
          const waves = new WaveTracker({
            label: 'Wave',
            current: 2,
            waves: [
              { label: '1' },
              { label: '2' },
              { label: '3', glyph: 'glyph-crossed-swords' },
              { label: '4' },
              { label: 'Boss', boss: true, glyph: 'glyph-skull-wreath' },
            ],
          });
          waves.on<number>('wave:change', (n) => console.log('wave', n));
          waves.el.addEventListener('click', () => waves.advance());
          return waves.el;
        },
        stage: 'wide',
      },
      {
        title: 'Plain and compact',
        build: () =>
          col(
            new WaveTracker({ waves: 8, current: 5, label: 'Room' }).el,
            new WaveTracker({ waves: 12, current: 9, size: 'sm', rail: false }).el,
          ),
        stage: 'wide',
      },
    ],
  },

  {
    id: 'DamageMeter',
    name: 'DamageMeter',
    group: 'combat',
    blurb: 'Who actually contributed, ranked and scaled against the leader.',
    description:
      'Bars are scaled against the top performer rather than the total, which is what makes the gap between first and second readable at a glance. The bar *is* the row background, so text never needs a second layer to stay legible.',
    tags: ['damage', 'meter', 'dps', 'contribution', 'ranking', 'clan boss', 'scoreboard'],
    related: ['BossHealthBar', 'Leaderboard', 'ResultScreen'],
    demos: [
      {
        title: 'End-of-fight breakdown',
        build: () =>
          new DamageMeter({
            title: 'Damage dealt',
            showShare: true,
            rateLabel: 'DPS',
            entries: [
              { id: 'vex', name: 'Vexhollow', art: 'blood-necromancer', value: 4_820_000, rate: 96_400, color: 'var(--fui-rarity-epic)', you: true },
              { id: 'ember', name: 'Emberwake', art: 'fire-phoenix-rise', value: 3_110_000, rate: 62_200, color: '#ff7a3d' },
              { id: 'grix', name: 'Grixmaul', art: 'weapon-warhammer', value: 2_240_000, rate: 44_800, color: '#d84b3a' },
              { id: 'sable', name: 'Sablethorn', art: 'hunt-dire-wolf', value: 1_180_000, rate: 23_600, color: '#38d13c' },
              { id: 'lume', name: 'Lumenshade', art: 'rune-crystal-shard', value: 402_000, rate: 8_040, color: '#3b8ae0' },
            ],
          }).el,
        stage: 'wide',
      },
    ],
  },

  {
    id: 'BattleLog',
    name: 'BattleLog',
    group: 'combat',
    blurb: 'The scrolling record of what hit what, and for how much.',
    description:
      'The screen a player opens when they want to know why they lost. `limit` keeps a twenty-minute raid from growing without bound, and turn dividers are cheaper to read than repeating the turn on every row.',
    tags: ['log', 'combat log', 'history', 'battle', 'events', 'turns', 'transcript'],
    related: ['DamageMeter', 'BossHealthBar', 'ResultScreen'],
    demos: [
      {
        title: 'A fight in progress',
        note: 'Filter chips hide event kinds without discarding them.',
        build: () => {
          const log = new BattleLog({
            title: 'Battle log',
            height: 250,
            filters: ['damage', 'crit', 'heal', 'buff', 'debuff'],
            lines: [
              { turn: 1, kind: 'turn', text: 'Vexhollow moves first (SPD 212)' },
              { turn: 1, kind: 'damage', actor: 'Vexhollow', text: 'strikes Demon Lord', value: 182_400 },
              { turn: 1, kind: 'debuff', actor: 'Vexhollow', text: 'applies Decrease DEF (2 turns)' },
              { turn: 1, kind: 'crit', actor: 'Emberwake', text: 'CRITS Demon Lord', value: 482_100 },
              { turn: 2, kind: 'damage', actor: 'Demon Lord', text: 'hits the party', value: 41_800 },
              { turn: 2, kind: 'heal', actor: 'Lumenshade', text: 'heals Grixmaul', value: 18_200 },
              { turn: 2, kind: 'buff', actor: 'Lumenshade', text: 'grants Increase DEF (2 turns)' },
              { turn: 3, kind: 'crit', actor: 'Grixmaul', text: 'CRITS Demon Lord', value: 301_500 },
              { turn: 3, kind: 'death', actor: 'Sablethorn', text: 'has fallen' },
            ],
          });
          log.on('log:line', (line) => console.log(line));
          return log.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'ComboCounter',
    name: 'ComboCounter',
    group: 'combat',
    blurb: 'The hit chain, its rank, and the timer that drops it.',
    description:
      'The decay timer is what makes this a mechanic rather than a label: `hit()` restarts it, and `combo:drop` fires when the chain expires. The number scales with the chain, capped so a 200-hit combo does not take over the screen.',
    tags: ['combo', 'chain', 'hits', 'streak', 'counter', 'multiplier', 'rank'],
    related: ['FloatingText', 'HUD', 'StreakMeter'],
    demos: [
      {
        title: 'Building a chain',
        note: 'Click to land a hit. Stop for 2.5 seconds and it drops.',
        build: () => {
          const combo = new ComboCounter({ decay: 2500, showTimer: true, size: 52 });
          combo.on<number>('combo:drop', (final) => console.log('combo ended at', final));
          const hit = h('button', {
            class: 'demo-target',
            text: 'Strike',
            attrs: { type: 'button' },
            style: { position: 'static', transform: 'none' },
            on: { click: () => combo.hit() },
          });
          return col(combo.el, hit);
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'ArenaMatchup',
    name: 'ArenaMatchup',
    group: 'combat',
    blurb: 'The pre-battle versus screen: two teams, their power, the odds and the stake.',
    description:
      'The odds bar is deliberately one tug-of-war rather than two percentages — the player only needs to know which way it leans and by how much. The right-hand side mirrors so the teams face each other.',
    tags: ['arena', 'pvp', 'versus', 'vs', 'matchup', 'battle', 'odds', 'preview'],
    related: ['TeamSlots', 'PowerRating', 'Leaderboard', 'ChampionCard'],
    demos: [
      {
        title: 'An arena challenge',
        build: () => {
          const match = new ArenaMatchup({
            left: {
              name: 'You',
              art: 'tech-mech-suit',
              power: 184_320,
              rank: 'Gold III',
              units: [
                { art: 'blood-necromancer', rarity: 'legendary', level: 60, name: 'Vexhollow' },
                { art: 'fire-phoenix-rise', rarity: 'legendary', level: 55, name: 'Emberwake' },
                { art: 'weapon-warhammer', rarity: 'epic', level: 50, name: 'Grixmaul' },
                { art: 'rune-crystal-shard', rarity: 'rare', level: 40, name: 'Lumenshade' },
              ],
            },
            right: {
              name: 'Ashvale',
              art: 'hunt-dire-wolf',
              power: 201_900,
              rank: 'Gold I',
              color: '#c0392b',
              units: [
                { art: 'earth-amethyst-cluster', rarity: 'legendary', level: 60 },
                { art: 'hunt-dire-wolf', rarity: 'epic', level: 60 },
                { art: 'tech-mech-suit', rarity: 'epic', level: 55 },
                { art: 'blood-necromancer', rarity: 'rare', level: 50 },
              ],
            },
            odds: 42,
            stake: '+24 points on a win · −11 on a loss',
            action: 'Battle',
          });
          match.on('arena:fight', () => console.log('start battle'));
          return match.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'PityCounter',
    name: 'PityCounter',
    group: 'gacha',
    blurb: 'How many pulls until the game owes you something.',
    description:
      'Games that show mercy convert better than games that hide it, because a visible guarantee turns a gamble into a countdown. `softStart` marks where the rate begins climbing, which is the detail that makes the bar honest rather than decorative.',
    tags: ['pity', 'mercy', 'guarantee', 'pulls', 'gacha', 'summon', 'odds', 'soft pity'],
    related: ['BannerCarousel', 'SummonResult', 'ShardCounter'],
    demos: [
      {
        title: 'Mercy on a void banner',
        note: 'Click to spend a pull.',
        build: () => {
          const pity = new PityCounter({
            title: 'Mercy',
            tracks: [
              { label: 'Legendary', current: 78, guaranteed: 100, softStart: 75, color: 'var(--fui-rarity-legendary)' },
              { label: 'Epic', current: 6, guaranteed: 20, color: 'var(--fui-rarity-epic)' },
              { label: 'Rate-up champion', current: 1, guaranteed: 2, color: 'var(--fui-gold)' },
            ],
          });
          pity.el.addEventListener('click', () => pity.pull());
          return pity.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'BannerCarousel',
    name: 'BannerCarousel',
    group: 'gacha',
    blurb: 'The rotating summon rail on a gacha front page.',
    description:
      'Tabs across the top, key art with the featured champion bleeding off the right edge, and the two pull buttons underneath. Both buttons emit the *banner id*, so one listener handles every banner in the rotation.',
    tags: ['banner', 'summon', 'gacha', 'pull', 'rate-up', 'featured', 'portal', 'wish'],
    related: ['Carousel', 'SummonResult', 'PityCounter', 'EventBanner'],
    demos: [
      {
        title: 'Three live banners',
        build: () => {
          const banners = new BannerCarousel({
            autoplay: 7000,
            banners: [
              {
                id: 'void', title: 'Void Ascendant', subtitle: 'Rate-up: Vexhollow',
                art: 'blood-necromancer', featured: 'blood-necromancer',
                endsIn: 86_400 * 3, cost: '1 Void Shard', rate: 'Legendary 6%', color: '#a335ee',
              },
              {
                id: 'ember', title: 'Ember Rising', subtitle: 'Rate-up: Emberwake',
                art: 'fire-phoenix-rise', featured: 'fire-phoenix-rise',
                endsIn: 86_400 * 6, cost: '1 Sacred Shard', rate: 'Legendary 4%', color: '#ff7a3d',
              },
              {
                id: 'ancient', title: 'Ancient Portal', subtitle: 'Always available',
                art: 'earth-amethyst-cluster', featured: 'rune-crystal-shard',
                cost: '1 Ancient Shard', rate: 'Legendary 0.5%', color: '#4a8ede',
              },
            ],
          });
          banners.on<string>('banner:pull', (id) => console.log('summon 1 from', id));
          banners.on<string>('banner:multi', (id) => console.log('summon 10 from', id));
          return banners.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'TopBar',
    name: 'TopBar',
    group: 'gacha',
    blurb: 'The persistent resource header above every screen in a mobile RPG.',
    description:
      'Who you are, what you hold, what is capped, and the buttons that never move. `setResource` updates one value in place, which is what every reward claim, purchase and energy tick needs. The level ring is a conic gradient behind the avatar, so XP costs no extra element.',
    tags: ['top bar', 'header', 'hud', 'currency', 'energy', 'resources', 'mobile', 'chrome'],
    related: ['CurrencyBar', 'BottomNav', 'HUD', 'EnergyBar'],
    demos: [
      {
        title: 'A full header',
        build: () => {
          const top = new TopBar({
            name: 'Marvin',
            avatar: 'tech-mech-suit',
            level: 42,
            levelProgress: 0.62,
            resources: [
              { id: 'energy', glyph: 'glyph-magic-flame', value: 84, max: 120, refillIn: 246, buyable: true, label: 'Energy', color: 'var(--fui-stamina)' },
              { id: 'gold', art: 'icon-coins', value: 1_284_000, label: 'Gold' },
              { id: 'gems', glyph: 'glyph-arcane-symbol', value: 3_420, buyable: true, label: 'Gems', color: 'var(--fui-rarity-epic)' },
            ],
            actions: [
              { id: 'mail', glyph: 'glyph-burning-scroll', badge: 3, label: 'Mail' },
              { id: 'events', glyph: 'glyph-trophy-cup', label: 'Events' },
            ],
          });
          top.on<string>('top:buy', (id) => console.log('open shop for', id));
          top.on<string>('top:action', (id) => console.log('open', id));
          return top.el;
        },
        stage: 'wide',
      },
      {
        title: 'Compact, for a phone',
        build: () =>
          new TopBar({
            avatar: 'blood-necromancer',
            level: 12,
            levelProgress: 0.25,
            compact: true,
            resources: [
              { id: 'energy', glyph: 'glyph-magic-flame', value: 120, max: 120 },
              { id: 'gold', art: 'icon-coins', value: 84_200 },
            ],
          }).el,
        stage: 'wide',
      },
    ],
  },

  {
    id: 'VipProgress',
    name: 'VipProgress',
    group: 'gacha',
    blurb: 'The VIP ladder, and what the next tier actually unlocks.',
    description:
      'Showing the level alone tells a player where they are, not why they should care — so the next tier’s perks are the point of the component.',
    tags: ['vip', 'tier', 'ladder', 'perks', 'progress', 'loyalty', 'membership'],
    related: ['RewardTrack', 'PowerRating', 'OfferCard'],
    demos: [
      {
        title: 'Mid-ladder',
        build: () =>
          new VipProgress({
            style: { width: '340px', maxWidth: '100%' },
            points: 4_200,
            label: 'VIP',
            showPerks: true,
            tiers: [
              { level: 1, at: 500 },
              { level: 2, at: 1_500 },
              { level: 3, at: 3_000, perks: ['+1 daily free summon'] },
              { level: 4, at: 6_000, perks: ['+10% campaign XP', 'Auto-repeat ×5', 'Second daily quest reroll'] },
              { level: 5, at: 12_000, perks: ['Instant clear tickets'] },
            ],
          }).el,
      },
    ],
  },

  {
    id: 'EventBanner',
    name: 'EventBanner',
    group: 'gacha',
    blurb: 'The live-ops tile an events hub is tiled from.',
    description:
      'Key art, a name, a countdown and a way in. The countdown owns its own interval and clears it on `destroy()`, so a hub with twelve of these does not leak twelve timers. Under an hour left the tile turns urgent on its own.',
    tags: ['event', 'banner', 'live-ops', 'tile', 'promo', 'countdown', 'limited', 'hub'],
    related: ['Carousel', 'CountdownTimer', 'OfferCard', 'RewardTrack'],
    demos: [
      {
        title: 'An events hub',
        build: () => {
          const ember = new EventBanner({
            title: 'Ember Ascendant',
            subtitle: 'Double fire shard drops across every keep',
            art: 'fire-phoenix-rise',
            tag: '2× DROPS',
            endsIn: 3 * 3600 + 480,
            progress: 0.4,
            progressLabel: '12 / 30 stages',
            color: '#ff7a3d',
            action: 'Enter',
          });
          ember.on('event:enter', () => console.log('enter ember event'));
          return row(
            ember.el,
            new EventBanner({
              title: 'Void Tournament',
              subtitle: 'Climb the bracket for a guaranteed Void shard',
              art: 'blood-necromancer',
              tag: 'ENDS SOON',
              endsIn: 1_800,
              color: '#a335ee',
              action: 'Compete',
            }).el,
          );
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'RewardPopup',
    name: 'RewardPopup',
    group: 'feedback',
    blurb: 'The reward grid that pops after anything good happens.',
    description:
      'A stage clear, a daily login, a completed quest, a chest. `stagger` is what makes a ten-item drop feel like ten things rather than one table appearing.',
    tags: ['reward', 'popup', 'loot', 'claim', 'chest', 'drop', 'grid', 'modal'],
    related: ['LootWindow', 'SummonResult', 'DailyRewards', 'Modal'],
    demos: [
      {
        title: 'A stage clear',
        build: () => {
          const rewards = new RewardPopup({
            title: 'Stage Cleared',
            subtitle: 'Fire Keep 12 · Brutal',
            stagger: true,
            columns: 4,
            items: [
              { art: 'rune-crystal-shard', name: 'Void Shard', qty: 1, rarity: 'legendary', tag: 'NEW' },
              { art: 'icon-coins', name: 'Gold', qty: 120_000 },
              { art: 'earth-amethyst-cluster', name: 'Ember Core', qty: 12, rarity: 'epic' },
              { art: 'weapon-warhammer', name: 'Cruel Gauntlets', qty: 1, rarity: 'rare' },
              { glyph: 'glyph-spell-book', name: 'Skill Book', qty: 3, rarity: 'epic' },
              { glyph: 'glyph-magic-flame', name: 'Energy', qty: 20 },
            ],
          });
          rewards.on('reward:claim', () => console.log('claimed'));
          return rewards.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'StreakMeter',
    name: 'StreakMeter',
    group: 'gacha',
    blurb: 'Consecutive logins or wins, with milestones and an expiry warning.',
    description:
      'The expiry warning is the working part: a streak with nothing at stake is just a number, and a streak about to lapse is a reason to open the game. Past the end of the track the pips wrap, so a 23-day run on a 7-pip track shows two lit rather than a meaningless full row.',
    tags: ['streak', 'login', 'daily', 'consecutive', 'wins', 'milestone', 'retention'],
    related: ['DailyRewards', 'ComboCounter', 'RewardTrack'],
    demos: [
      {
        title: 'A six-day login streak',
        build: () => {
          const streak = new StreakMeter({
            value: 6,
            length: 7,
            milestones: [3, 7],
            unit: 'day streak',
            glyph: 'glyph-magic-flame',
            expiresIn: 5,
            pending: true,
          });
          streak.on<number>('streak:milestone', (n) => console.log('milestone at', n));
          streak.on('streak:claim', () => console.log('claim today'));
          return streak.el;
        },
      },
      {
        title: 'Arena win streak',
        build: () =>
          new StreakMeter({
            value: 23,
            length: 10,
            milestones: [5, 10],
            unit: 'win streak',
            glyph: 'glyph-trophy-cup',
            size: 'sm',
          }).el,
      },
    ],
  },

  {
    id: 'ClanCard',
    name: 'ClanCard',
    group: 'social',
    blurb: 'The row a clan browser is made of, and the header a clan screen opens with.',
    description:
      'Members-against-capacity and the entry mode are the two facts a player actually decides on, so both are impossible to miss. The crest is a shield silhouette rather than a square, so it never reads as an inventory slot.',
    tags: ['clan', 'guild', 'alliance', 'crest', 'members', 'recruit', 'social', 'join'],
    related: ['ChatPanel', 'Leaderboard', 'MailInbox'],
    demos: [
      {
        title: 'A clan browser',
        build: () => {
          const ash = new ClanCard({
            name: 'Ashvale Covenant',
            tag: 'ASH',
            crest: 'glyph-phoenix',
            level: 18,
            members: 28,
            capacity: 30,
            motto: 'Nightmare clears twice a week. Bring speed.',
            requirement: '180k power',
            activity: 0.82,
            bossTier: 'Nightmare',
            entry: 'apply',
            action: 'Apply',
            color: '#ff7a3d',
          });
          ash.on('clan:join', (mode) => console.log('join mode', mode));
          return h(
            'div',
            { class: 'demo-col', style: { width: '100%', alignItems: 'stretch' } },
            ash.el,
            new ClanCard({
              name: 'Hollowlight',
              tag: 'HLW',
              crest: 'glyph-celestial-body',
              level: 11,
              members: 19,
              capacity: 30,
              motto: 'Casual. Everyone welcome.',
              activity: 0.44,
              bossTier: 'Brutal',
              entry: 'open',
              action: 'Join',
              color: '#a335ee',
            }).el,
            new ClanCard({
              name: 'The Ninth Gate',
              tag: 'IX',
              crest: 'glyph-skull-wreath',
              level: 24,
              members: 30,
              capacity: 30,
              requirement: '400k power',
              activity: 0.97,
              bossTier: 'Ultra-Nightmare',
              entry: 'closed',
              color: '#c0392b',
            }).el,
          );
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'MailInbox',
    name: 'MailInbox',
    group: 'social',
    blurb: 'Compensation, event payouts and clan gifts, with claimable attachments.',
    description:
      'Unread is a dot on the leading edge rather than a bold row, so it survives theming and stays legible over artwork. `remove()` takes a claimed message out without a rebuild, which is what the claim handler calls once the server confirms.',
    tags: ['mail', 'inbox', 'messages', 'compensation', 'gifts', 'claim', 'attachments'],
    related: ['ChatPanel', 'RewardPopup', 'EmptyState', 'ToastStack'],
    demos: [
      {
        title: 'An inbox with attachments',
        build: () => {
          const inbox = new MailInbox({
            title: 'Mail',
            claimAll: true,
            maxHeight: 340,
            messages: [
              {
                id: 'm1',
                from: 'System',
                subject: 'Maintenance compensation',
                body: 'Sorry about the downtime last night. Here is something for the trouble.',
                time: '2h ago',
                expires: 'Expires in 6d',
                attachments: [
                  { art: 'icon-coins', qty: 50_000, name: 'Gold' },
                  { glyph: 'glyph-magic-flame', qty: 60, name: 'Energy' },
                ],
              },
              {
                id: 'm2',
                from: 'Ashvale Covenant',
                subject: 'Clan boss chest — Nightmare',
                body: 'Your clan cleared Nightmare. Personal chest attached.',
                time: '9h ago',
                attachments: [{ art: 'rune-crystal-shard', qty: 1, name: 'Void Shard' }],
              },
              {
                id: 'm3',
                from: 'System',
                subject: 'Season 14 results',
                body: 'You finished Gold III. Rewards were delivered to your account.',
                time: '2d ago',
                read: true,
              },
            ],
          });
          inbox.on<string>('mail:claim', (id) => inbox.remove(id));
          inbox.on('mail:claim-all', (ids) => console.log('claim', ids));
          return inbox.el;
        },
        stage: 'wide',
      },
    ],
  },

  {
    id: 'ChatPanel',
    name: 'ChatPanel',
    group: 'social',
    blurb: 'Clan and world chat: channel tabs, rank tags and a composer.',
    description:
      'Messages are held per channel, so switching tabs does not lose the other channel’s history. The player’s own lines mirror to the right, which is the one cue that makes a busy clan channel scannable.',
    tags: ['chat', 'clan chat', 'world chat', 'messages', 'social', 'channels', 'composer'],
    related: ['ClanCard', 'MailInbox', 'TextInput'],
    demos: [
      {
        title: 'Clan chat',
        note: 'Type and send — the message is echoed back through the same API a socket would use.',
        build: () => {
          const chat = new ChatPanel({
            height: 240,
            channels: [
              { id: 'clan', label: 'Clan' },
              { id: 'world', label: 'World', unread: 4 },
              { id: 'whisper', label: 'Whispers' },
            ],
            messages: [
              { system: true, text: 'Ashvale Covenant · Nightmare boss is up' },
              { author: 'Rhogar', tag: 'Leader', text: 'Boss up in 10. Bring speed teams.', time: '20:12', color: 'var(--fui-gold-soft)' },
              { author: 'Nell', tag: 'Officer', text: 'I can hit 42m if someone brings Decrease DEF', time: '20:13' },
              { author: 'You', text: 'Vexhollow has it, I am in', time: '20:14', mine: true },
            ],
          });
          chat.on<{ channel: string; text: string }>('chat:send', ({ text }) => {
            chat.push({ author: 'You', text, time: '20:15', mine: true });
          });
          return chat.el;
        },
        stage: 'wide',
      },
    ],
  },
];
