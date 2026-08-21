import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { TradePanel } from '../../lib/components/TradePanel.ts';
import { QuestBoard } from '../../lib/components/QuestBoard.ts';
import { Compass } from '../../lib/components/Compass.ts';
import { TargetSelector } from '../../lib/components/TargetSelector.ts';
import { ThreatMeter } from '../../lib/components/ThreatMeter.ts';
import { FusionPanel } from '../../lib/components/FusionPanel.ts';
import { BondMeter } from '../../lib/components/BondMeter.ts';
import { ClanRoster } from '../../lib/components/ClanRoster.ts';
import { PlayerProfile } from '../../lib/components/PlayerProfile.ts';
import { ConnectionStatus } from '../../lib/components/ConnectionStatus.ts';
import { SpeechBubble } from '../../lib/components/SpeechBubble.ts';
import { TitleGate } from '../../lib/components/TitleGate.ts';
import { StorySlide } from '../../lib/components/StorySlide.ts';

const row = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-row' }, ...kids.filter(Boolean));
/** A full-width stack, for components that are a row in a real layout. */
const stack = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-col', style: { width: '100%', alignItems: 'stretch' } },
    ...kids.filter(Boolean));

export const SYSTEMS: CatalogEntry[] = [
  {
    id: 'TradePanel',
    name: 'TradePanel',
    group: 'widgets',
    blurb: 'Two-sided player trade with the lock-then-accept handshake that stops last-second swaps.',
    description:
      'Any change to your offer clears *both* accepts, and Accept stays disabled until both sides have locked. That single rule is what separates a safe trade window from a scam surface, so it lives in the component rather than in whatever calls it. Your half renders as buttons and theirs as plain cells, which means the read-only side cannot be clicked into by accident.',
    tags: ['trade', 'trading', 'exchange', 'swap', 'player', 'barter', 'market', 'p2p', 'offer'],
    related: ['InventoryGrid', 'ItemCard', 'ShopPanel', 'MailInbox'],
    demos: [
      {
        title: 'A trade mid-negotiation',
        note: 'Click one of your slots to fill it — watch both accepts clear when the offer changes.',
        build: () => {
          const trade = new TradePanel({
            you: {
              name: 'You',
              level: 61,
              avatar: 'hero-vanguard',
              gold: 120_000,
              items: [
                { id: 'a', name: 'Runeblade', art: 'weapon-runeblade', rarity: 'epic' },
                { id: 'b', name: 'Soul Shard', art: 'rune-crystal-shard', rarity: 'rare', qty: 4 },
              ],
            },
            them: {
              name: 'Rhogar',
              level: 58,
              avatar: 'tech-mech-suit',
              gold: 0,
              items: [{ id: 'c', name: 'Warhammer', art: 'weapon-warhammer', rarity: 'legendary' }],
              locked: true,
            },
            warning: 'Both sides must lock before either can accept.',
          });
          trade.on<number>('trade:slot', (i) =>
            trade.setItem(i, { id: `x${i}`, name: 'Sunblade', art: 'weapon-sunblade', rarity: 'epic' }),
          );
          return trade.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'QuestBoard',
    name: 'QuestBoard',
    group: 'widgets',
    blurb: 'The hub-town noticeboard: pinned contracts, an active-slot limit, a refresh timer and a reroll.',
    description:
      '`QuestLog` tracks what you already took; this is where you take it from. The slot limit is enforced in the component, so a full board turns every Accept into a labelled "Board full" rather than letting the click fail on the server. Each contract is pinned to the surface with a paper pin — the detail that makes the grid read as a noticeboard instead of a list of cards.',
    tags: ['quest', 'bounty', 'board', 'contract', 'noticeboard', 'daily', 'task', 'hub', 'reroll'],
    related: ['QuestLog', 'QuestTracker', 'MissionCard', 'EventBanner'],
    demos: [
      {
        title: 'A bounty board with two of three slots taken',
        note: 'The third contract can still be accepted; take it and the rest go dead.',
        build: () => {
          const board = new QuestBoard({
            title: 'Bounty board',
            slots: 3,
            rerolls: 2,
            refreshIn: 4 * 3600,
            bounties: [
              {
                id: 'b1', title: 'Cull the Rotmire', objective: 'Slay 30 bog wardens',
                art: 'hunt-dire-wolf', tier: 'rare', requirement: '80k power',
                rewards: ['120,000 gold'], rewardGlyph: 'icon-coins', expiresIn: 7200, taken: true,
              },
              {
                id: 'b2', title: 'The Pale Priest', objective: 'Break the ritual under Ashvale',
                art: 'blood-pale-priest', tier: 'legendary', requirement: '160k power',
                rewards: ['2 Ancient Shards', '1 Void Sigil'], rewardGlyph: 'icon-star',
                expiresIn: 25_200, complete: true,
              },
              {
                id: 'b3', title: 'Emberwake Sighting', objective: 'Track the phoenix to its nest',
                art: 'fire-phoenix-flight', tier: 'epic', requirement: '120k power',
                rewards: ['Legendary Book'], rewardGlyph: 'icon-scroll', expiresIn: 3600,
              },
            ],
          });
          board.on<string>('quest:accept', (id) => console.log('accepted', id));
          return board.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'Compass',
    name: 'Compass',
    group: 'widgets',
    blurb: 'The open-world heading band, or the same data as a round rose, with waypoints by absolute bearing.',
    description:
      'Waypoints are given absolute bearings and the component works out where they fall relative to where the player is looking, normalising into −180…180 so a marker behind you leaves the strip cleanly rather than wrapping across it. A marker past the edge pins to it and grows an arrow instead of vanishing — that is how a player knows to keep turning. Both variants share one render path; the dial ignores the horizontal placement and rotates by `--fui-compass-at` instead.',
    tags: ['compass', 'heading', 'bearing', 'waypoint', 'navigation', 'hud', 'open world', 'direction'],
    related: ['Minimap', 'WorldMap', 'QuestTracker', 'HudBar'],
    demos: [
      {
        title: 'Heading strip with waypoints',
        note: 'Drag along the strip to turn — the objective marker slides and eventually pins to the edge.',
        build: () => {
          const compass = new Compass({
            heading: 42,
            fieldOfView: 140,
            showDegrees: true,
            width: '100%',
            waypoints: [
              { bearing: 78, label: 'Ashfall Gate', quest: true, distance: '240m' },
              { bearing: 300, label: 'Camp', glyph: 'glyph-holy-totem', distance: '1.2km' },
              { bearing: 190, label: 'Boss', glyph: 'glyph-skull-wreath', color: '#d9534f' },
            ],
          });
          compass.el.addEventListener('pointermove', (ev) => {
            const box = compass.el.getBoundingClientRect();
            compass.setHeading(((ev as PointerEvent).clientX - box.left) / box.width * 360);
          });
          return compass.el;
        },
        stage: 'wide',
      },
      {
        title: 'The same bearings as a rose',
        build: () =>
          row(
            new Compass({
              variant: 'dial', size: 160, heading: 42, showDegrees: true,
              waypoints: [
                { bearing: 78, label: 'Ashfall Gate', quest: true },
                { bearing: 300, glyph: 'glyph-holy-totem' },
              ],
            }).el,
          ),
        stage: 'wide',
      },
    ],
  },
  {
    id: 'TargetSelector',
    name: 'TargetSelector',
    group: 'combat',
    blurb: 'The enemy line-up a turn-based fight targets through, with health, statuses and taunt.',
    description:
      'A taunting enemy is called out rather than silently redirecting the attack, because "my click did something else" is the worst thing a battle UI can do: `effectiveTarget()` returns where the hit will actually land while the selection stays where the player put it. Dead or untargetable units refuse the click instead of quietly accepting it.',
    tags: ['target', 'enemy', 'selection', 'battle', 'turn based', 'taunt', 'aggro', 'combat', 'lineup'],
    related: ['EnemyBar', 'BattleHud', 'ThreatMeter', 'SkillBar'],
    demos: [
      {
        title: 'Four enemies, one taunting',
        note: 'Select any of them — the panel says where the attack will really go.',
        build: () => {
          const targets = new TargetSelector({
            label: 'Enemies',
            bars: true,
            target: 'a',
            units: [
              { id: 'a', name: 'Bog Warden', art: 'hunt-dire-wolf', hp: 4200, maxHp: 9000 },
              {
                id: 'b', name: 'Revenant', art: 'blood-necromancer', hp: 18_400, maxHp: 18_400,
                elite: true, taunting: true, effects: ['glyph-shield-block'],
              },
              {
                id: 'c', name: 'Hexbinder', art: 'blood-witch', hp: 6100, maxHp: 8000,
                color: '#a335ee', effects: ['glyph-cursed-eye'],
              },
              { id: 'd', name: 'Husk', art: 'blood-skull', hp: 0, maxHp: 5000, dead: true },
            ],
          });
          targets.on<string>('target:change', () => console.log('hits', targets.effectiveTarget()));
          return targets.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'ThreatMeter',
    name: 'ThreatMeter',
    group: 'combat',
    blurb: 'The aggro list — who the boss is looking at, and how close everyone else is to taking it.',
    description:
      'Percentages run against the *leader*, not the total, because the only number that matters is how close you are to the one holding the boss. A tank at the top is normal and stays calm; anyone else near the top gets the warning colour. Feed it the whole list every tick — `setEntries()` re-sorts and repaints, so callers never track row order.',
    tags: ['threat', 'aggro', 'raid', 'tank', 'boss', 'meter', 'combat', 'mmo', 'pull'],
    related: ['PartyFrame', 'BattleHud', 'DamageMeter', 'TargetSelector'],
    demos: [
      {
        title: 'A raid group, one DPS about to pull',
        build: () =>
          new ThreatMeter({
            title: 'Threat',
            warnAt: 80,
            dangerAt: 95,
            showValues: true,
            entries: [
              { id: 'grix', name: 'Grixmaul', art: 'hero-vanguard', threat: 48_200, tank: true },
              { id: 'vex', name: 'Vexhollow', art: 'blood-necromancer', threat: 46_900, you: true, color: '#a335ee' },
              { id: 'sol', name: 'Solene', art: 'hero-green-sorceress', threat: 31_400, color: '#4fc3f7' },
              { id: 'kess', name: 'Kessra', art: 'hero-duelist', threat: 12_050, color: '#e8c14a' },
            ],
          }).el,
        stage: 'wide',
      },
    ],
  },
  {
    id: 'FusionPanel',
    name: 'FusionPanel',
    group: 'gacha',
    blurb: 'The fusion recipe: several specific champions consumed to summon a guaranteed one.',
    description:
      'Distinct from `RankUpPanel`, which spends fodder to raise a champion you already own — here the reward is a *new* unit and every slot carries its own requirement. The commit button reports how many slots are still missing rather than simply greying out, because "why can’t I press this" is the question that panel always has to answer.',
    tags: ['fusion', 'summon', 'recipe', 'craft', 'combine', 'gacha', 'event', 'guaranteed', 'merge'],
    related: ['RankUpPanel', 'SummonBanner', 'ChampionCard', 'AscensionPanel'],
    demos: [
      {
        title: 'A four-piece fusion, half filled',
        note: 'Click an empty slot to fill it and watch the button count down.',
        build: () => {
          const fusion = new FusionPanel({
            title: 'Fusion — Emberwake',
            result: {
              name: 'Emberwake', art: 'fire-phoenix-rise', rarity: 'legendary', stars: 5,
              note: 'Fire · Attack · Ignites on crit',
            },
            slots: [
              { requirement: 'Rare · Fire', color: '#ff7a3d', filled: { id: 'a', name: 'Cinder', art: 'fire-golden-flame', rarity: 'rare', stars: 4 } },
              { requirement: 'Epic · Fire', color: '#ff7a3d', filled: { id: 'b', name: 'Pyrelash', art: 'fire-flame-lance', rarity: 'epic', stars: 5 } },
              { requirement: 'Epic · Void', color: '#a335ee', hintArt: 'blood-void-lance' },
              { requirement: 'Any · 5★', hintArt: 'icon-star' },
            ],
            endsIn: 86_400 * 5,
            warning: 'Fused champions are consumed permanently.',
          });
          fusion.on<number>('fusion:slot', (i) =>
            fusion.setSlot(i, { id: `f${i}`, name: 'Voidling', art: 'blood-nightwing', rarity: 'epic', stars: 5 }),
          );
          return fusion.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'BondMeter',
    name: 'BondMeter',
    group: 'gacha',
    blurb: 'The affection track voice lines, art and small stat bumps hang off — a second progression axis.',
    description:
      '`gain()` carries points over into the next level rather than clamping, so one large award can push through several levels and still fire an event for each. The heart beats faster as the level nears full, which is the only animation on the component and the only one it needs.',
    tags: ['bond', 'affection', 'friendship', 'trust', 'loyalty', 'relationship', 'gacha', 'reward track'],
    related: ['ChampionCard', 'MasteryTree', 'BattlePass', 'AscensionPanel'],
    demos: [
      {
        title: 'Bond 4, mid-level',
        note: 'The button awards 120 points; keep pressing to roll into the next level.',
        build: () => {
          const bond = new BondMeter({
            name: 'Vexhollow',
            art: 'blood-necromancer',
            level: 4, maxLevel: 10, value: 320, next: 500,
            color: '#a335ee',
            hint: 'Win battles with Vexhollow in the team',
            rewards: [
              { level: 3, label: 'Voice line — "Again."', claimed: true },
              { level: 5, label: '+5% HP' },
              { level: 8, label: 'Alternate art' },
            ],
          });
          const give = h('button', { class: 'demo-btn', text: '+120 bond' });
          give.addEventListener('click', () => bond.gain(120));
          return stack(bond.el, row(give));
        },
        stage: 'wide',
      },
      {
        title: 'Compact, for a roster row',
        build: () =>
          new BondMeter({
            compact: true, name: 'Solene', art: 'hero-green-sorceress',
            level: 7, maxLevel: 10, value: 90, next: 600, color: '#6fb3a8',
          }).el,
        stage: 'wide',
      },
    ],
  },
  {
    id: 'ClanRoster',
    name: 'ClanRoster',
    group: 'social',
    blurb: 'The clan member table: rank, power, this cycle’s contribution and how long since anyone saw them.',
    description:
      '`ClanCard` is the clan seen from outside; this is the inside, and it is where a leader decides who to keep. Contribution bars scale against the top contributor rather than the total, and a member who has done nothing this cycle is flagged — those two together are the entire reason the screen exists. Sorting is a method, so the header buttons and a saved preference drive the same code path.',
    tags: ['clan', 'guild', 'roster', 'members', 'table', 'contribution', 'kick', 'promote', 'inactive'],
    related: ['ClanCard', 'FriendList', 'Leaderboard', 'ChatPanel'],
    demos: [
      {
        title: 'A clan of six, sorted by contribution',
        note: 'Click a column heading to re-sort. Two members have contributed nothing this cycle.',
        build: () => {
          const roster = new ClanRoster({
            title: 'Ashvale Covenant',
            capacity: 30,
            sort: 'contribution',
            bars: true,
            canManage: true,
            maxHeight: 340,
            members: [
              { id: 'a', name: 'Rhogar', art: 'tech-mech-suit', rank: 'leader', level: 61, power: 204_000, contribution: 48_200_000, online: true },
              { id: 'b', name: 'Vexhollow', art: 'blood-necromancer', rank: 'officer', level: 60, power: 191_400, contribution: 39_100_000, you: true, online: true },
              { id: 'c', name: 'Solene', art: 'hero-green-sorceress', rank: 'officer', level: 58, power: 172_900, contribution: 22_400_000, lastSeen: '2h' },
              { id: 'd', name: 'Kessra', art: 'hero-duelist', rank: 'member', level: 55, power: 148_000, contribution: 9_800_000, lastSeen: '1d' },
              { id: 'e', name: 'Brannoc', art: 'hero-brute', rank: 'member', level: 49, power: 96_500, contribution: 0, lastSeen: '6d' },
              { id: 'f', name: 'Drab', art: 'hero-lone-wanderer', rank: 'recruit', level: 31, power: 48_200, contribution: 0, lastSeen: '9d' },
            ],
          });
          roster.on<string>('clan:kick', (id) => console.log('kick', id, roster.inactive().length));
          return roster.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'PlayerProfile',
    name: 'PlayerProfile',
    group: 'social',
    blurb: 'The card a player taps a name to see — avatar, level ring, clan, badges and a champion showcase.',
    description:
      'The showcase is the point: it is the one place a player composes how they are seen, so it gets the largest, best-framed cells on the card and the stats line takes second billing. Level progress rides as a ring around the avatar rather than a separate bar, which keeps the header to one object.',
    tags: ['profile', 'player', 'card', 'avatar', 'showcase', 'badges', 'stats', 'friend', 'social'],
    related: ['ClanRoster', 'FriendList', 'ChampionCard', 'Leaderboard'],
    demos: [
      {
        title: 'A profile with a three-champion showcase',
        build: () =>
          new PlayerProfile({
            name: 'Rhogar',
            avatar: 'tech-mech-suit',
            banner: 'bg-wide',
            level: 61,
            levelProgress: 0.42,
            clan: 'ASH',
            rank: 'Gold I · EU-1',
            motto: 'Nightmare twice a week. Bring speed.',
            stats: [
              { label: 'Power', value: 204_000 },
              { label: 'Champions', value: 128 },
              { label: 'Arena wins', value: 1_842 },
            ],
            badges: [
              { label: 'Season 12 top 100', glyph: 'glyph-trophy-cup', color: '#e8c14a', note: 'Finished 84th' },
              { label: 'Clan Boss slayer', glyph: 'glyph-skull-wreath', color: '#d9534f' },
              { label: 'Founder', glyph: 'glyph-holy-totem', color: '#6fb3a8' },
            ],
            showcase: [
              { name: 'Vexhollow', art: 'blood-necromancer', rarity: 'legendary', stars: 6, level: 60 },
              { name: 'Emberwake', art: 'fire-phoenix-rise', rarity: 'legendary', stars: 5, level: 60 },
              { name: 'Solene', art: 'hero-green-sorceress', rarity: 'epic', stars: 5, level: 55 },
            ],
            playerId: '8842-1190',
            addable: true,
          }).el,
        stage: 'wide',
      },
    ],
  },
  {
    id: 'ConnectionStatus',
    name: 'ConnectionStatus',
    group: 'feedback',
    blurb: 'Latency as signal bars, plus the banner for when the socket actually drops.',
    description:
      'State is derived from the ping unless you force it, so the common case is one `setPing()` per heartbeat and nothing else. The four bars light in proportion to connection quality — a shape players already read without a legend — and each bar’s opacity is a `clamp()` on the strength, so there is no per-bar branching in script.',
    tags: ['connection', 'ping', 'latency', 'network', 'offline', 'reconnect', 'status', 'signal', 'lag'],
    related: ['Toast', 'Banner', 'LoadingScreen', 'HudBar'],
    demos: [
      {
        title: 'Every state, side by side',
        build: () =>
          row(
            new ConnectionStatus({ ping: 24, showPing: true, server: 'EU-1' }).el,
            new ConnectionStatus({ ping: 180, showPing: true }).el,
            new ConnectionStatus({ ping: 520, showPing: true }).el,
            new ConnectionStatus({ state: 'offline' }).el,
            new ConnectionStatus({ variant: 'dot', ping: 42, showPing: true, server: 'NA-2' }).el,
          ),
        stage: 'wide',
      },
      {
        title: 'The dropped-socket banner',
        note: 'Press retry to watch it walk back through reconnecting to online.',
        build: () => {
          const net = new ConnectionStatus({
            variant: 'banner',
            state: 'offline',
            server: 'EU-1',
            orb: 'orb-emberstorm',
            message: 'Lost connection to the realm.',
            retryable: true,
          });
          net.on('net:retry', () => {
            net.setState('reconnecting');
            setTimeout(() => net.setPing(38), 1200);
          });
          return net.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'SpeechBubble',
    name: 'SpeechBubble',
    group: 'feedback',
    blurb: 'One line of dialogue over a character’s head — barks, taunts, tutorial asides.',
    description:
      '`DialogueBox` is the full conversation panel; this is one line, in the world. The typewriter runs on a single interval that clears itself on completion and on `destroy()`, and clicking the bubble calls `skip()` to finish the line at once — which is what a click during a bark should do. Pass `at` to pin it over a unit in viewport coordinates; leave it off and the bubble flows inline.',
    tags: ['speech', 'bubble', 'bark', 'dialogue', 'taunt', 'callout', 'typewriter', 'chat', 'npc'],
    related: ['DialogueBox', 'Tooltip', 'TutorialTip', 'Toast'],
    demos: [
      {
        title: 'A boss taunt, typed out',
        note: 'Click the bubble to finish the line early.',
        build: () => {
          const bark = new SpeechBubble({
            text: 'You should not have come here.',
            speaker: 'Gravebound Revenant',
            art: 'blood-necromancer',
            tone: 'shout',
            typing: 34,
            width: 340,
          });
          bark.on('bubble:done', () => console.log('line finished'));
          return bark.el;
        },
        stage: 'wide',
      },
      {
        title: 'Tones and tails',
        build: () =>
          row(
            new SpeechBubble({ text: 'Meet me by the gate.', speaker: 'Rowan', tone: 'say' }).el,
            new SpeechBubble({ text: '…it is watching us.', tone: 'whisper', tail: 'left' }).el,
            new SpeechBubble({ text: 'Something is wrong here.', tone: 'think' }).el,
            new SpeechBubble({ text: 'Wave 3 incoming', tone: 'system', tail: 'none' }).el,
          ),
        stage: 'wide',
      },
    ],
  },
  {
    id: 'TitleGate',
    name: 'TitleGate',
    group: 'screens',
    blurb: 'The launch screen: key art, the title, a server to pick and one button through.',
    description:
      '`MainMenu` is what you see *after* this — the gate is the screen that has to hold a queue and a broken region gracefully. A full or offline server cannot be selected and the button reports why rather than going quietly dead, which is the state that matters most on launch day. `extra` takes any nodes, so a name field or a terms checkbox slots in above the button without a variant.',
    tags: ['title', 'launch', 'login', 'server', 'realm', 'select', 'splash', 'gate', 'start'],
    related: ['MainMenu', 'LoadingScreen', 'StorySlide', 'SettingsPanel'],
    demos: [
      {
        title: 'A gate with four realms',
        note: 'Ashvale is full and Duskwatch is down — neither can be selected.',
        build: () => {
          const gate = new TitleGate({
            title: 'Ashfall',
            tagline: 'The gate has opened.',
            art: 'bg-wide',
            figure: 'silhouette-warrior-m',
            figureSide: 'right',
            height: 580,
            servers: [
              { id: 'eu1', name: 'Emberwood', region: 'EU', load: 'good', ping: 24, hasCharacter: true, recommended: true },
              { id: 'eu2', name: 'Thornhollow', region: 'EU', load: 'busy', ping: 31 },
              { id: 'na2', name: 'Ashvale', region: 'NA', load: 'full', ping: 132 },
              { id: 'ap1', name: 'Duskwatch', region: 'AP', load: 'down', ping: 210 },
            ],
            action: 'Enter the realm',
            footnote: 'Build 1.14.2 · Patch notes',
          });
          gate.on<string>('gate:enter', (serverId) => console.log('connect', serverId));
          return gate.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'StorySlide',
    name: 'StorySlide',
    group: 'screens',
    blurb: 'One beat of a cutscene: key art, a character, narration typed out and a way forward.',
    description:
      'Clicking anywhere finishes the line first and only advances on a second click, which is the interaction every visual novel settled on: one tap should never skip text you have not read. String several together and you have an intro — `step`/`steps` drive the beat counter so the same component serves the whole scene.',
    tags: ['story', 'cutscene', 'intro', 'narration', 'visual novel', 'dialogue', 'prologue', 'chapter'],
    related: ['DialogueBox', 'SpeechBubble', 'TitleGate', 'LoadingScreen'],
    demos: [
      {
        title: 'The first beat of a prologue',
        note: 'One click finishes the line, the next advances.',
        build: () => {
          const scene = [
            { text: 'Three generations held this gate shut. Tonight, something on the other side is knocking.' },
            { text: 'Take the lantern. Do not look back at the water, whatever it says with your mother’s voice.' },
            { speaker: 'Narration', text: 'The stair went down further than the hill was tall.' },
          ];
          let i = 0;
          const slide = new StorySlide({
            chapter: 'Chapter I — The Sunken Gate',
            speaker: 'Elder Rowan',
            text: scene[0].text,
            art: 'bg-scene-dark',
            figure: 'silhouette-warrior-f',
            figureFrame: 'frame-tall',
            typing: 42,
            step: 1,
            steps: scene.length,
            skippable: true,
            height: 460,
          });
          slide.on('story:next', () => slide.setBeat({ ...scene[++i % scene.length], step: (i % scene.length) + 1 }));
          return slide.el;
        },
        stage: 'wide',
      },
    ],
  },
];
