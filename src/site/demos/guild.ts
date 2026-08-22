import type { CatalogEntry } from '../types.ts';

import { GuildBank } from '../../lib/components/GuildBank.ts';
import { RequestList } from '../../lib/components/RequestList.ts';
import { GiftPanel } from '../../lib/components/GiftPanel.ts';
import { ClanPerks } from '../../lib/components/ClanPerks.ts';
import { ClanFinder } from '../../lib/components/ClanFinder.ts';

export const GUILD: CatalogEntry[] = [
  {
    id: 'GuildBank',
    name: 'GuildBank',
    group: 'social',
    blurb: 'The shared vault: tabs, a per-rank withdrawal allowance, and the log that stops it being emptied quietly.',
    description:
      'The allowance is the whole reason this component exists, so it is a bar at the top rather than a message on failure: a member should see "2 of 5 left" before choosing what to take, not after being refused. When it runs out every tile disables at once and the reason is printed once, in one place, instead of five identical error toasts. Rank-locked, emptied and allowance-blocked all look different.',
    tags: ['guild bank', 'vault', 'shared storage', 'clan', 'withdraw', 'deposit', 'allowance', 'rank', 'log', 'tabs'],
    related: ['InventoryGrid', 'Ledger', 'ClanPerks', 'RequestList'],
    demos: [
      {
        title: 'Two withdrawals left',
        note: 'Take something — the allowance bar drains. The relic is rank-locked; the marked tiles say why.',
        build: () => {
          const bank = new GuildBank({
            title: 'Ashfall Vault',
            tabs: ['Consumables', 'Materials', 'Relics'],
            used: 3,
            allowance: 5,
            rank: 'Veteran',
            items: [
              { id: 'elixir', name: 'Greater Elixir', art: 'icon-potion', qty: 24, tab: 'Consumables' },
              { id: 'flask', name: 'Stamina Flask', art: 'icon-heart', qty: 12, tab: 'Consumables' },
              { id: 'scroll', name: 'Scroll of Recall', art: 'icon-scroll', qty: 7, tab: 'Consumables', rarity: 'rare' },
              { id: 'ash', name: 'Emberdust', art: 'fire-flame-drop', qty: 340, tab: 'Materials' },
              { id: 'ingot', name: 'Runed Ingot', art: 'icon-rune-stone', qty: 18, tab: 'Materials', rarity: 'rare' },
              { id: 'core', name: 'Ember Core', art: 'fire-molten-heart', qty: 1, tab: 'Relics', rarity: 'legendary', locked: true },
              { id: 'seal', name: 'Obsidian Seal', art: 'rune-obsidian-seal', qty: 2, tab: 'Relics', rarity: 'epic' },
            ],
            log: [
              { who: 'Korr', what: 'took 2 × Greater Elixir', kind: 'out', when: '10m ago' },
              { who: 'Veyra', what: 'deposited 40 × Emberdust', kind: 'in', when: '1h ago' },
              { who: 'Marrow', what: 'took Obsidian Seal', kind: 'out', when: '3h ago' },
              { who: 'You', what: 'deposited Runed Ingot ×6', kind: 'in', when: 'Yesterday' },
            ],
          });
          bank.on<{ name: string }>('bank:withdraw', (i) => console.log('took', i.name));
          return bank.el;
        },
      },
    ],
  },
  {
    id: 'RequestList',
    name: 'RequestList',
    group: 'social',
    blurb: 'The applications queue an officer works through — who wants in, whether they clear the bar, seats left.',
    description:
      'Seats count down in the header and every Accept disables at zero, because the failure an officer must not hit is accepting four people into three seats. Applicants below the guild\'s requirements stay in the list and get a marker rather than being filtered out — letting someone in anyway is a normal decision, and hiding the row takes it away from them.',
    tags: ['applications', 'requests', 'guild', 'clan', 'join', 'accept', 'decline', 'recruit', 'officer', 'queue'],
    related: ['ClanFinder', 'GuildBank', 'FriendList', 'PartyFinder'],
    demos: [
      {
        title: 'Three seats, four applicants',
        note: 'Accept one and the seat count drops. Fill the guild and every Accept greys out at once.',
        build: () => {
          const queue = new RequestList({
            title: 'Applications',
            seats: 3,
            minLevel: 40,
            requests: [
              { id: 'a', name: 'Sablewick', art: 'hero-duelist', level: 58, power: 84_200, when: '20m ago',
                message: 'Cleared Ashen Anvil on my old server. Looking for a raid team that starts on time.',
                tags: ['EU', 'Daily player', 'Voice'] },
              { id: 'b', name: 'Korr Ironjaw', art: 'hero-brute', level: 44, power: 61_800, when: '2h ago',
                message: 'I mostly PvP but I show up for guild wars.', tags: ['NA', 'PvP'] },
              { id: 'c', name: 'Little Ash', art: 'hero-lone-wanderer', level: 31, power: 22_400, when: '5h ago',
                message: 'New but I learn fast! My friend Veyra is already in.', tags: ['EU'], belowBar: true },
              { id: 'd', name: 'Veyra the Pale', art: 'blood-pale-priest', level: 61, power: 91_100, when: 'Yesterday',
                message: 'Healer. Have logs.', tags: ['EU', 'Healer', 'Voice'] },
            ],
          });
          queue.on<{ name: string }>('request:accept', (r) => console.log('accepted', r.name));
          queue.on<{ name: string }>('request:decline', (r) => console.log('declined', r.name));
          return queue.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'GiftPanel',
    name: 'GiftPanel',
    group: 'social',
    blurb: 'The daily friend-gift round: send to everyone, claim everything waiting, both caps in view.',
    description:
      'Both bulk buttons emit an array — one id for a single row, many for "send all" — so a caller writes one handler and batches one request instead of firing twenty. The cap is checked before the batch is built, so "Send all" with four sends left sends to the first four rather than failing the whole action. Claim outranks send on a row: a waiting gift is what the player came for.',
    tags: ['gifts', 'friends', 'social', 'daily', 'send', 'claim', 'stamina', 'energy', 'bulk', 'hearts'],
    related: ['FriendList', 'DailyRewards', 'ClanFinder', 'Ledger'],
    demos: [
      {
        title: 'Nine waiting, fourteen sends left',
        note: 'Claim all takes everything at once and emits one array. Sent rows settle into their done state.',
        build: () => {
          const gifts = new GiftPanel({
            title: 'Stamina gifts',
            currency: 'Stamina',
            giftArt: 'glyph-health-potion',
            sendsLeft: 14,
            sendCap: 20,
            claimsLeft: 9,
            friends: [
              { id: '1', name: 'Sablewick', art: 'hero-duelist', incoming: true, online: true },
              { id: '2', name: 'Korr Ironjaw', art: 'hero-brute', incoming: true, seen: '2h ago' },
              { id: '3', name: 'Veyra the Pale', art: 'blood-pale-priest', sent: true, online: true },
              { id: '4', name: 'Old Marrow', art: 'hero-lone-wanderer', seen: '1d ago' },
              { id: '5', name: 'Emberwing', art: 'hero-stormblade', incoming: true, seen: '4h ago' },
              { id: '6', name: 'Thornwarden', art: 'hero-vanguard', sent: true, seen: '3d ago' },
            ],
          });
          gifts.on<string[]>('gift:claim', (ids) => console.log('claimed', ids.length));
          gifts.on<string[]>('gift:send', (ids) => console.log('sent to', ids.length));
          return gifts.el;
        },
      },
    ],
  },
  {
    id: 'ClanPerks',
    name: 'ClanPerks',
    group: 'social',
    blurb: 'The guild upgrade board: shared perks bought from the treasury, gated by guild level and by each other.',
    description:
      'Every locked perk says *why* it is locked — guild level, a prerequisite perk, an empty treasury, or a rank that cannot spend — because "can\'t buy" with no reason is what sends members to ask an officer. The reason is resolved in priority order, so a perk with three problems gets one sentence rather than a list nobody reads. Each card\'s ground fills as the perk levels.',
    tags: ['guild perks', 'clan upgrades', 'treasury', 'fund', 'levels', 'unlock', 'progression', 'hall', 'donate', 'officer'],
    related: ['GuildBank', 'MasteryGrid', 'SkillTree', 'RequestList'],
    demos: [
      {
        title: 'A hall mid-upgrade',
        note: 'Fund one and the treasury drops. Locked cards print the exact reason on their own button.',
        build: () => {
          const perks = new ClanPerks({
            title: 'Hall upgrades',
            treasury: 84_000,
            guildLevel: 6,
            treasuryArt: 'glyph-trophy-cup',
            canFund: true,
            perks: [
              { id: 'stash', name: 'Deeper Vault', icon: 'glyph-spell-book', level: 3, max: 5, cost: 12_000,
                effect: '+30 vault slots per level.' },
              { id: 'xp', name: 'Shared Study', icon: 'glyph-burning-scroll', level: 5, max: 5, cost: 0,
                effect: '+15% experience for every member.' },
              { id: 'forge', name: 'Guild Forge', icon: 'glyph-hammer-hit', level: 1, max: 4, cost: 26_000,
                effect: 'Craft guild-only gear.', requires: 8 },
              { id: 'raid', name: 'War Banner', icon: 'glyph-crossed-swords', level: 0, max: 3, cost: 40_000,
                effect: '+8% damage in guild raids.', after: ['forge'] },
              { id: 'gold', name: 'Tithe Coffer', icon: 'glyph-trophy-cup', level: 2, max: 5, cost: 96_000,
                effect: '+5% gold from all sources.' },
            ],
          });
          perks.on<{ name: string }>('perk:fund', (p) => console.log('funded', p.name));
          return perks.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'ClanFinder',
    name: 'ClanFinder',
    group: 'social',
    blurb: 'The guild browser: who is recruiting, how alive they are, and whether the door is even open.',
    description:
      'Activity gets a meter rather than a "last active" date, because the question a player is really asking is "will anyone be here tomorrow" and a date makes them do that arithmetic themselves. Full guilds and level-gated ones stay in the list, marked — a browser that hides them looks empty and leaves a new player with nothing to aim at.',
    tags: ['clan finder', 'guild browser', 'recruit', 'search', 'join', 'apply', 'activity', 'filters', 'social', 'lfg'],
    related: ['RequestList', 'PartyFinder', 'ClanPerks', 'Leaderboard'],
    demos: [
      {
        title: 'Browsing for a home',
        note: 'Filter chips emit `clan:filter`. Open guilds join instantly; the rest send an application.',
        build: () => {
          const finder = new ClanFinder({
            title: 'Find a guild',
            playerLevel: 34,
            filters: ['All', 'Auto-accept', 'English', 'Casual'],
            showCreate: true,
            clans: [
              { id: 'ash', name: 'Ashfall', crest: 'crest-ember-shield', level: 12, members: [42, 50], activity: 0.92,
                rank: 84, autoAccept: true, blurb: 'Nightly raids, no attendance rules. We just like clearing things.',
                tags: ['EU', 'English', 'Voice'] },
              { id: 'thorn', name: 'The Thornwardens', crest: 'crest-warded-shield', level: 9, members: [50, 50], activity: 0.71,
                minLevel: 30, blurb: 'Full at the moment — applications still reviewed weekly.', tags: ['NA', 'Casual'] },
              { id: 'gild', name: 'Gilded Compact', crest: 'crest-gilded-crown', level: 15, members: [38, 50], activity: 0.55,
                rank: 12, minLevel: 45, blurb: 'Competitive guild wars. Level 45 and 60k power minimum.', tags: ['EU', 'PvP'] },
              { id: 'wander', name: 'Wanderers Rest', crest: 'crest-sacred-anchor', level: 4, members: [11, 30], activity: 0.28,
                autoAccept: true, blurb: 'Small and quiet. Come say hello.', tags: ['Casual', 'English'] },
            ],
          });
          finder.on<{ name: string }>('clan:apply', (c) => console.log('applied to', c.name));
          finder.on<{ name: string }>('clan:join', (c) => console.log('joined', c.name));
          return finder.el;
        },
        stage: 'wide',
      },
    ],
  },
];
