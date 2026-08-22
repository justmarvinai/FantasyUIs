import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { AuctionHouse } from '../../lib/components/AuctionHouse.ts';
import { CraftingQueue } from '../../lib/components/CraftingQueue.ts';
import { AutoBattleRules } from '../../lib/components/AutoBattleRules.ts';
import { SkillCheck } from '../../lib/components/SkillCheck.ts';
import { DungeonMap } from '../../lib/components/DungeonMap.ts';
import { SpinWheel } from '../../lib/components/SpinWheel.ts';
import { RateTable } from '../../lib/components/RateTable.ts';
import { IdleRewards } from '../../lib/components/IdleRewards.ts';
import { PartyFinder } from '../../lib/components/PartyFinder.ts';
import { WarBoard } from '../../lib/components/WarBoard.ts';
import { DamageVignette } from '../../lib/components/DamageVignette.ts';
import { DeathScreen } from '../../lib/components/DeathScreen.ts';

/** A full-width stack, for components that are a row in a real layout. */
const stack = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-col', style: { width: '100%', alignItems: 'stretch' } },
    ...kids.filter(Boolean));

export const ECONOMY: CatalogEntry[] = [
  {
    id: 'AuctionHouse',
    name: 'AuctionHouse',
    group: 'widgets',
    blurb: 'The player market: bids, buyouts, and how long is left on each listing.',
    description:
      '`ShopPanel` sells the game’s own stock at fixed prices; this is the one where the prices come from other players and the clock matters. Buyout goes dead when the player cannot afford it and says *why* on the button, and a listing the player is already winning is marked rather than merely sorted differently — the two states a market UI has to get right, because both cost real money to discover the hard way.',
    tags: ['auction', 'market', 'trade', 'bid', 'buyout', 'listing', 'economy', 'sell', 'broker'],
    related: ['ShopPanel', 'TradePanel', 'ItemCard', 'Pagination'],
    demos: [
      {
        title: 'A live board with 480,000 gold to spend',
        note: 'One buyout is out of reach and says so. The clocks are ticking.',
        build: () => {
          const ah = new AuctionHouse({
            title: 'Auction house',
            sort: 'ending',
            funds: 480_000,
            currencyGlyph: 'glyph-trophy-cup',
            maxHeight: 300,
            listings: [
              { id: 'l1', name: 'Runeblade', art: 'weapon-runeblade', rarity: 'epic', note: 'ilvl 62',
                bid: 82_000, buyout: 240_000, endsIn: 5400, seller: 'Rhogar' },
              { id: 'l2', name: 'Emberheart', art: 'fire-phoenix-rise', rarity: 'legendary', note: 'ilvl 70',
                bid: 640_000, buyout: 1_250_000, endsIn: 240, seller: 'Vexhollow' },
              { id: 'l3', name: 'Soul Shard', art: 'rune-crystal-shard', rarity: 'rare', qty: 12,
                buyout: 96_000, endsIn: 21_600, seller: 'Kessra' },
              { id: 'l4', name: 'Frost Axe', art: 'weapon-frost-axe', rarity: 'uncommon',
                bid: 14_000, buyout: 38_000, endsIn: 900, seller: 'Drab', winning: true },
              { id: 'l5', name: 'Warhammer', art: 'weapon-warhammer', rarity: 'rare', note: 'yours',
                bid: 21_000, buyout: 74_000, endsIn: 43_200, yours: true },
            ],
          });
          ah.on<string>('auction:buy', (id) => console.log('bought', id));
          return ah.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'CraftingQueue',
    name: 'CraftingQueue',
    group: 'widgets',
    blurb: 'Timed crafts queued up — one running, the rest waiting, finished work held for collection.',
    description:
      '`CraftingPanel` is where a recipe is chosen; this is what happens after you press Craft. One interval drives the whole queue rather than one per job, and it stops itself the moment nothing is running — a forge screen left open overnight should not be a timer leak. A finished job stays in its slot until collected, because "where did my sword go" is not a question a crafting UI should raise.',
    tags: ['crafting', 'queue', 'forge', 'timer', 'production', 'collect', 'rush', 'idle'],
    related: ['CraftingPanel', 'UpgradePanel', 'CountdownTimer', 'IdleRewards'],
    demos: [
      {
        title: 'A forge with four slots',
        note: 'The first job is ticking. One is ready — collect it and the queue advances.',
        build: () => {
          const forge = new CraftingQueue({
            title: 'Forge',
            slots: 4,
            parallel: 1,
            running: true,
            rushCost: (left) => `${Math.max(1, Math.ceil(left / 60))} gems`,
            jobs: [
              { id: 'j1', name: 'Runeblade', art: 'weapon-runeblade', rarity: 'epic', total: 5400, elapsed: 3900 },
              { id: 'j0', name: 'Frost Axe', art: 'weapon-frost-axe', rarity: 'rare', total: 900, elapsed: 900, done: true },
              { id: 'j2', name: 'Health Draught', art: 'icon-potion', qty: 5, total: 600 },
            ],
          });
          forge.on<string>('craft:collect', (id) => console.log('collected', id));
          return forge.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'AutoBattleRules',
    name: 'AutoBattleRules',
    group: 'widgets',
    blurb: 'The "if this, then that" list a player writes once and trusts to farm overnight.',
    description:
      'Every rule reads as one English sentence across the row, because the thing a player has to verify at a glance is what the rule *says*, not which dropdown holds which half of it. Ordering is the semantics — first match wins — so the row order is stated in the hint rather than left to be discovered, and the add button reports when the slots are used up instead of going quietly dead.',
    tags: ['auto battle', 'rules', 'conditions', 'automation', 'macro', 'idle', 'rotation', 'ai'],
    related: ['ReorderList', 'BattleControls', 'ActionBar', 'SkillCard'],
    demos: [
      {
        title: 'Four rules, fired top to bottom',
        note: 'Change a dropdown, reorder with the arrows, or add one until the slots run out.',
        build: () => {
          const rules = new AutoBattleRules({
            title: 'Auto-battle',
            max: 6,
            unit: '%',
            hint: 'Rules fire top to bottom. The first one that matches wins.',
            conditions: [
              { value: 'ally-hp', label: 'an ally’s HP is' },
              { value: 'my-hp', label: 'my HP is' },
              { value: 'enemy-hp', label: 'the target’s HP is' },
              { value: 'turn', label: 'the turn number is' },
            ],
            tests: [
              { value: 'below', label: 'below' },
              { value: 'above', label: 'above' },
            ],
            actions: [
              { value: 'skill-2', label: 'cast Sanctuary' },
              { value: 'skill-3', label: 'cast Voidlance' },
              { value: 'potion', label: 'drink a draught' },
              { value: 'basic', label: 'attack' },
            ],
            rules: [
              { id: 'r1', when: 'ally-hp', test: 'below', value: '40', then: 'skill-2', art: 'fx-lotus-spring' },
              { id: 'r2', when: 'my-hp', test: 'below', value: '25', then: 'potion', art: 'icon-potion' },
              { id: 'r3', when: 'enemy-hp', test: 'above', value: '80', then: 'skill-3', art: 'blood-void-lance' },
              { id: 'r4', when: 'turn', test: 'above', value: '1', then: 'basic', off: true },
            ],
          });
          rules.on('rules:change', () => console.log('saved', rules.value()));
          return rules.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'SkillCheck',
    name: 'SkillCheck',
    group: 'combat',
    blurb: 'The timing bar — lockpicking, a parry window, a fishing reel. Stop it in the green.',
    description:
      'Position is derived from elapsed time rather than accumulated per frame, so a stutter or a backgrounded tab skips the marker ahead instead of letting the bar drift out of sync with what the player saw. Zones may overlap — a narrow "perfect" band inside a wide "good" one is the standard shape — so the highest score wins rather than the first hit.',
    tags: ['timing', 'qte', 'minigame', 'skill check', 'lockpick', 'parry', 'fishing', 'reflex', 'bar'],
    related: ['CastBar', 'ConfirmSlider', 'BattleControls', 'ComboCounter'],
    demos: [
      {
        title: 'A parry window with three attempts',
        note: 'Press Stop — or tap the bar itself, which is the bigger target.',
        build: () => {
          const check = new SkillCheck({
            label: 'Parry',
            speed: 0.9,
            attempts: 3,
            autoStart: true,
            bounce: true,
            width: '100%',
            zones: [
              { from: 0.32, to: 0.68, score: 1, label: 'Good' },
              { from: 0.46, to: 0.54, score: 2, label: 'Perfect', color: '#e8c14a' },
            ],
          });
          check.on<{ score: number }>('check:stop', (r) => console.log('parry', r.score));
          return check.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'DungeonMap',
    name: 'DungeonMap',
    group: 'combat',
    blurb: 'The floor plan of a run — rooms on a grid, corridors between them, and fog over the rest.',
    description:
      '`WorldMap` places campaign nodes on painted art; this is the procedural grid a roguelike run draws fresh every time. Only rooms linked to where the party stands can be entered, and that rule is computed from the same `links` the corridors are drawn from — so a room you can see a path to is always a room you can walk to. Fog hides a room’s *kind*, never its existence.',
    tags: ['dungeon', 'map', 'roguelike', 'rooms', 'floor', 'run', 'fog', 'grid', 'crawler'],
    related: ['WorldMap', 'StageSelect', 'Minimap', 'WaveTracker'],
    demos: [
      {
        title: 'Floor 3 of a run',
        note: 'Only rooms with a lit corridor can be entered. Walking reveals what is next.',
        build: () => {
          const map = new DungeonMap({
            title: 'The Sunken Vault',
            floor: 'Floor 3',
            at: 'r3',
            size: 48,
            rooms: [
              { id: 'r1', x: 0, y: 1, kind: 'start', cleared: true, links: ['r2'] },
              { id: 'r2', x: 1, y: 1, kind: 'battle', cleared: true, links: ['r3', 'r4'] },
              { id: 'r3', x: 2, y: 0, kind: 'rest', links: ['r5'] },
              { id: 'r4', x: 2, y: 2, kind: 'treasure', seen: true, links: ['r5', 'r6'] },
              { id: 'r5', x: 3, y: 1, kind: 'elite', seen: true, links: ['r7'] },
              { id: 'r6', x: 3, y: 2, kind: 'shop', seen: true, links: ['r7'] },
              { id: 'r7', x: 4, y: 1, kind: 'event', links: ['r8'] },
              { id: 'r8', x: 5, y: 1, kind: 'boss' },
            ],
          });
          map.on<string>('dungeon:enter', (id) => console.log('entered', id));
          return map.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'SpinWheel',
    name: 'SpinWheel',
    group: 'gacha',
    blurb: 'The prize wheel, with weighted segments and the odds printed on them.',
    description:
      'The result is drawn from the weights *before* the animation starts, and the wheel is then spun to land on it. Doing it the other way round — spinning and reading off where it stopped — makes the odds a property of a CSS transition, which is neither auditable nor honest. `odds()` returns the same numbers the wheel prints, so a rate disclosure cannot drift from the draw.',
    tags: ['wheel', 'spin', 'prize', 'lottery', 'gacha', 'roulette', 'reward', 'daily', 'event'],
    related: ['RateTable', 'DailyRewards', 'LootRoll', 'SummonResult'],
    demos: [
      {
        title: 'An eight-segment login wheel',
        note: 'Press spin. The prize is drawn first, then the wheel is turned onto it.',
        build: () => {
          const wheel = new SpinWheel({
            size: 280,
            spins: 3,
            showOdds: true,
            cost: '200 gems per spin',
            prizes: [
              { id: 'gold', label: 'Gold ×10k', art: 'icon-coins', weight: 40 },
              { id: 'potion', label: 'Draughts', art: 'icon-potion', rarity: 'uncommon', weight: 26 },
              { id: 'scroll', label: 'Skill Tome', art: 'icon-scroll', rarity: 'rare', weight: 14 },
              { id: 'shard', label: 'Soul Shard', art: 'rune-crystal-shard', rarity: 'rare', weight: 10 },
              { id: 'chest', label: 'Chest', art: 'icon-chest', rarity: 'epic', weight: 6 },
              { id: 'gem', label: 'Gem', art: 'rune-radiant-gem', rarity: 'legendary', weight: 3 },
              { id: 'blade', label: 'Sunblade', art: 'weapon-sunblade', rarity: 'epic', weight: 1 },
              { id: 'phoenix', label: 'Emberwake', art: 'fire-phoenix-rise', rarity: 'mythic', weight: 0.5 },
            ],
          });
          wheel.on<{ label: string }>('wheel:prize', (p) => console.log('won', p.label));
          return wheel.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'RateTable',
    name: 'RateTable',
    group: 'gacha',
    blurb: 'The drop-rate disclosure — pools, per-unit rates, the pity counter and the fine print.',
    description:
      'The total is computed from the rows rather than declared, and shown even when it does not reach 100% — a disclosure that quietly rounds itself to look tidy is worse than no disclosure at all. The bar beside each rate is what makes a 0.5% next to a 74% legible as a ratio instead of as two similar-looking numbers.',
    tags: ['rates', 'drop rate', 'odds', 'gacha', 'disclosure', 'pity', 'probability', 'banner', 'legal'],
    related: ['SpinWheel', 'PityCounter', 'BannerCarousel', 'SummonResult'],
    demos: [
      {
        title: 'A rate-up banner',
        note: 'Open a tier to see the units inside it.',
        build: () =>
          new RateTable({
            title: 'Drop rates',
            subtitle: 'Emberwake — rate-up until Sunday 23:59 UTC',
            pity: { at: 90, done: 62, label: 'Legendary guaranteed at' },
            expanded: true,
            notes: [
              'Rates are per summon and do not change with the number of summons made.',
              'The pity counter carries across banners and resets on any legendary.',
            ],
            rows: [
              {
                label: 'Legendary', rate: 0.5, rarity: 'legendary', featured: true, art: 'fire-phoenix-rise',
                items: [
                  { label: 'Emberwake', rate: 0.25, art: 'fire-phoenix-rise', featured: true },
                  { label: 'All other legendaries', rate: 0.25 },
                ],
              },
              {
                label: 'Epic', rate: 4.5, rarity: 'epic', art: 'blood-necromancer',
                items: [
                  { label: 'Vexhollow', rate: 1.5, art: 'blood-necromancer', featured: true },
                  { label: 'All other epics', rate: 3.0 },
                ],
              },
              { label: 'Rare', rate: 20, rarity: 'rare', art: 'hunt-dire-wolf' },
              { label: 'Uncommon', rate: 75, rarity: 'uncommon', art: 'icon-sword' },
            ],
          }).el,
        stage: 'wide',
      },
    ],
  },
  {
    id: 'IdleRewards',
    name: 'IdleRewards',
    group: 'gacha',
    blurb: 'The "while you were away" haul, including what the accrual cap ate.',
    description:
      '`DailyRewards` pays for showing up; this pays for the hours in between. When the away time has hit the cap the panel says so plainly and shows how much was lost to it, because a silent cap is how an idle game quietly trains players to distrust it. `totals()` applies the boost if one was taken, so the number the player sees is the number that gets granted.',
    tags: ['idle', 'afk', 'offline', 'rewards', 'collect', 'away', 'accrual', 'boost', 'mobile'],
    related: ['DailyRewards', 'CraftingQueue', 'EnergyBar', 'RewardPopup'],
    demos: [
      {
        title: 'Nine hours away against an eight-hour cap',
        note: 'Take the multiplier — the numbers change, because the promise has to match the payout.',
        build: () => {
          const idle = new IdleRewards({
            title: 'While you were away',
            source: 'Emberwood Vale · Stage 12-4',
            art: 'bg-wide',
            awayFor: 9 * 3600,
            cap: 8 * 3600,
            boost: { multiplier: 2, label: 'Double it', cost: 'Watch an ad' },
            rewards: [
              { label: 'Gold', amount: 184_000, glyph: 'icon-coins' },
              { label: 'XP', amount: 42_500, glyph: 'icon-star' },
              { label: 'Shards', amount: 18, art: 'rune-crystal-shard', rarity: 'rare' },
              { label: 'Chests', amount: 2, art: 'icon-chest', rarity: 'epic' },
            ],
          });
          idle.on('idle:collect', () => console.log('granted', idle.totals()));
          return idle.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'PartyFinder',
    name: 'PartyFinder',
    group: 'social',
    blurb: 'Who is running what, which slots are open, and whether you are what they are missing.',
    description:
      'The pips are the whole point: a group is scanned by which slots are still empty, not by reading its title. A slot the player can actually fill is drawn differently from one they cannot, so the answer to "is this for me" arrives before the text does — and the apply button carries the reason it is dead, because a full group and an under-geared player are different problems with different fixes.',
    tags: ['lfg', 'party', 'group', 'finder', 'raid', 'queue', 'roles', 'matchmaking', 'social'],
    related: ['FriendList', 'ClanRoster', 'PartyFrame', 'WarBoard'],
    demos: [
      {
        title: 'Four groups, one that needs a healer',
        note: 'You can play Healer and Support. The group that needs one is lit.',
        build: () => {
          const lfg = new PartyFinder({
            title: 'Looking for group',
            power: 148_000,
            canPlay: ['Healer', 'Support'],
            createLabel: 'Start a group',
            maxHeight: 300,
            listings: [
              {
                id: 'g1', title: 'Sunken Vault', note: 'Nightmare', leader: 'Rhogar', art: 'hero-vanguard',
                requirement: 140_000, voice: true, age: 240,
                roles: [
                  { label: 'Tank', need: 1, filled: 1, glyph: 'glyph-shield-block', color: '#3b8ae0' },
                  { label: 'Healer', need: 2, filled: 1, glyph: 'glyph-holy-cross', color: '#52b96b' },
                  { label: 'DPS', need: 3, filled: 3, glyph: 'glyph-crossed-swords', color: '#d0453a' },
                ],
              },
              {
                id: 'g2', title: 'Ember Spire', note: 'Hard', leader: 'Kessra', art: 'hero-duelist',
                requirement: 90_000, age: 900,
                roles: [
                  { label: 'Tank', need: 1, filled: 0, glyph: 'glyph-shield-block', color: '#3b8ae0' },
                  { label: 'DPS', need: 4, filled: 2, glyph: 'glyph-crossed-swords', color: '#d0453a' },
                ],
              },
              {
                id: 'g3', title: 'Crimson Gate', note: 'Brutal', leader: 'Vexhollow', art: 'blood-necromancer',
                requirement: 210_000, voice: true, age: 60,
                roles: [
                  { label: 'Healer', need: 2, filled: 0, glyph: 'glyph-holy-cross', color: '#52b96b' },
                  { label: 'DPS', need: 4, filled: 1, glyph: 'glyph-crossed-swords', color: '#d0453a' },
                ],
              },
              {
                id: 'g4', title: 'Thornhollow Run', leader: 'Drab', art: 'hero-lone-wanderer',
                requirement: 40_000, age: 3600,
                roles: [
                  { label: 'Tank', need: 1, filled: 1, glyph: 'glyph-shield-block', color: '#3b8ae0' },
                  { label: 'DPS', need: 3, filled: 3, glyph: 'glyph-crossed-swords', color: '#d0453a' },
                ],
              },
            ],
          });
          lfg.on<string>('party:apply', (id) => console.log('applied', id));
          return lfg.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'WarBoard',
    name: 'WarBoard',
    group: 'social',
    blurb: 'Clan war: the score, the clock, and who already has that target.',
    description:
      'The claim is the mechanic this screen exists for — two clan mates burning attacks on the same target is how wars are lost — so a claimed target names its attacker and shows how long the claim holds rather than merely being unavailable. Claims expire on the same second the war clock ticks, because one timer running both beats a second interval racing the first.',
    tags: ['clan war', 'guild war', 'war', 'attack', 'claim', 'stars', 'score', 'clan', 'siege'],
    related: ['ClanRoster', 'ClanCard', 'PartyFinder', 'ArenaMatchup'],
    demos: [
      {
        title: 'Day two, two attacks left',
        note: 'Two targets are claimed by clan mates. The claim clock runs with the war clock.',
        build: () => {
          const war = new WarBoard({
            title: 'Clan war — day 2',
            endsIn: 20 * 3600,
            attacksLeft: 2,
            maxHeight: 260,
            us: { name: 'Ashvale Covenant', score: 41, crest: 'crest-ember-shield' },
            them: { name: 'Iron Compact', score: 38, crest: 'crest-stone-guard', color: '#c2764a' },
            targets: [
              { id: 't1', name: 'Rhogar', art: 'tech-mech-suit', power: 204_000, stars: 3, done: true },
              { id: 't2', name: 'Vexhollow', art: 'blood-necromancer', power: 191_400, stars: 1, attacker: 'Solene', claimFor: 780 },
              { id: 't3', name: 'Kessra', art: 'hero-duelist', power: 148_000, stars: 0 },
              { id: 't4', name: 'Brannoc', art: 'hero-brute', power: 96_500, stars: 2, attacker: 'Drab', claimFor: 240 },
              { id: 't5', name: 'The Iron Gate', art: 'crest-warded-shield', power: 260_000, stars: 0, maxStars: 5 },
            ],
          });
          war.on<string>('war:attack', (id) => console.log('attacking', id));
          return war.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'DamageVignette',
    name: 'DamageVignette',
    group: 'feedback',
    blurb: 'The screen-edge wash that says it happened to you — a hit, a heal, low health.',
    description:
      '`FloatingText` says how much; this says it happened to *you*. A flash is one timer that replaces itself, so a burst of ten hits in a second leaves one pending clear rather than ten racing each other — and the resting state a flash returns to is whatever `setTone()` last set, so a heal landing mid-fight cannot wipe out a low-health warning.',
    tags: ['vignette', 'screen', 'damage', 'hit', 'heal', 'low health', 'flash', 'hud', 'feedback'],
    related: ['FloatingText', 'HUD', 'BossHealthBar', 'HealthPips'],
    demos: [
      {
        title: 'Flashes over a scene',
        note: 'Press a tone to flash, or hold the low-health heartbeat on.',
        build: () => {
          const stage = h('div', { class: 'demo-screen', style: { height: '210px' } });
          stage.appendChild(
            h('p', {
              class: 'demo-note',
              style: { position: 'absolute', inset: '0', display: 'grid', placeItems: 'center' },
              text: 'The fight continues underneath',
            }),
          );
          // Resting on the low-health heartbeat, so the pre-rendered page shows
          // the effect rather than an empty box.
          const vig = new DamageVignette({ tone: 'low', level: 0.5, spread: 30, pulse: true });
          stage.appendChild(vig.el);

          const buttons = h('div', { class: 'demo-row' });
          for (const tone of ['damage', 'heal', 'poison', 'freeze', 'shield'] as const) {
            const btn = h('button', { class: 'demo-btn', text: tone });
            btn.addEventListener('click', () => vig.flash(tone, 0.75));
            buttons.appendChild(btn);
          }
          const low = h('button', { class: 'demo-btn', text: 'low health' });
          let on = true;
          low.addEventListener('click', () => vig.setLow((on = !on)));
          buttons.appendChild(low);

          return stack(stage, buttons);
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'DeathScreen',
    name: 'DeathScreen',
    group: 'screens',
    blurb: 'The defeat overlay: what killed you, how the run went, and what it costs to get back up.',
    description:
      '`ResultScreen` reports a battle that ended; this is the one that ended badly and is still asking for a decision. The revive clock runs down and then takes the offer away — that is the whole tension of the screen — so when it expires the buttons go with it, rather than staying on screen as a lie.',
    tags: ['death', 'defeat', 'game over', 'revive', 'respawn', 'you died', 'run', 'screen', 'overlay'],
    related: ['ResultScreen', 'LevelUpModal', 'Modal', 'DamageVignette'],
    demos: [
      {
        title: 'A run ending on floor 12',
        note: 'The offer expires after ten seconds and the revive buttons go with it.',
        build: () => {
          const death = new DeathScreen({
            title: 'You Died',
            subtitle: 'The Sunken Vault claims another.',
            killedBy: 'Gravebound Revenant',
            art: 'bg-scene-dark',
            height: 460,
            reviveIn: 10,
            stats: [
              { label: 'Floor', value: 12 },
              { label: 'Gold', value: 48_200 },
              { label: 'Kills', value: 194 },
              { label: 'Time', value: '38:12' },
            ],
            revives: [
              { id: 'feather', label: 'Revive', cost: '1 Phoenix Feather', glyph: 'glyph-phoenix', owned: 2, primary: true },
              { id: 'gems', label: 'Revive with gems', cost: '80 gems', glyph: 'glyph-arcane-symbol' },
            ],
          });
          death.on<string>('death:revive', (id) => console.log('revived with', id));
          death.on('death:quit', () => console.log('run ended'));
          return death.el;
        },
        stage: 'wide',
      },
    ],
  },
];
