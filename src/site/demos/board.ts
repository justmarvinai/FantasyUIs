import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { Minion } from '../../lib/components/Minion.ts';
import { BoardLane } from '../../lib/components/BoardLane.ts';
import { HeroPortrait } from '../../lib/components/HeroPortrait.ts';
import { HeroPower } from '../../lib/components/HeroPower.ts';
import { WeaponSlot } from '../../lib/components/WeaponSlot.ts';
import { SecretRow, type Secret } from '../../lib/components/SecretRow.ts';
import { ManaTray } from '../../lib/components/ManaTray.ts';
import { DeckPile } from '../../lib/components/DeckPile.ts';
import { TurnRope } from '../../lib/components/TurnRope.ts';
import { EndTurnButton } from '../../lib/components/EndTurnButton.ts';
import { TargetArrow } from '../../lib/components/TargetArrow.ts';
import { PlayHistory } from '../../lib/components/PlayHistory.ts';
import { EmoteWheel, type Emote } from '../../lib/components/EmoteWheel.ts';
import { QuestTile } from '../../lib/components/QuestTile.ts';

const row = (...kids: Node[]) =>
  h('div', { style: { display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' } }, ...kids);

const col = (...kids: Node[]) =>
  h('div', { style: { display: 'grid', gap: '14px', justifyItems: 'start' } }, ...kids);

/** A dark felt board, for components that live on one. */
const felt = (height: string, ...kids: Node[]) =>
  h('div', {
    style: {
      position: 'relative', width: '100%', height, borderRadius: '8px', overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 45%, rgba(90,70,45,.4), transparent 65%), #17130f',
    },
  }, ...kids);

export const BOARD: CatalogEntry[] = [
  {
    id: 'Minion',
    name: 'Minion',
    group: 'board',
    collection: 'cardgame',
    blurb: 'A card once it hits the board: a round token with stacking status overlays.',
    description:
      'Not a card — a card is a rectangle in your hand, and the moment it is played it becomes a round token with different rules, a different silhouette and a stack of status overlays.\n\nKeywords stack as separate layers on purpose: a taunt shield, a divine-shield halo and a frozen sheet all read at once, which is exactly the case a single "status" border cannot handle and the case that decides a turn.\n\n`asleep` and `exhausted` are different states with the same consequence, and conflating them is the classic mistake: a sleeping minion becomes attackable next turn, an exhausted one already attacked. The zzz and the grey-out say which, so a player can plan the *next* turn rather than only this one.',
    tags: ['minion', 'board', 'token', 'taunt', 'divine shield', 'frozen', 'stealth', 'summoning sickness', 'hearthstone', 'tcg'],
    related: ['BoardLane', 'PlayingCard', 'HeroPortrait', 'TargetArrow'],
    demos: [
      {
        title: 'Six minions, every state',
        note: 'Click the first — it takes damage. The second has a divine shield, which pops instead.',
        build: () => {
          const drake = new Minion({
            name: 'Emberwing Drake', art: 'blood-plague-drake', attack: 4, health: 5, maxHealth: 5,
            keywords: ['taunt'], elite: true,
          });
          drake.on('minion:attack', () => drake.damage(2));

          const shielded = new Minion({
            name: 'Bog Sentinel', art: 'hero-stone-golem', attack: 2, health: 6, maxHealth: 6,
            keywords: ['taunt', 'divine-shield'],
          });
          shielded.on('minion:attack', () => shielded.damage(3));

          return row(
            drake.el,
            shielded.el,
            new Minion({ name: 'Ash Hound', art: 'hunt-dire-wolf', attack: 3, health: 1, maxHealth: 2, keywords: ['rush', 'poisonous'], side: 'enemy' }).el,
            new Minion({ name: 'Frost Wraith', art: 'blood-nightwing', attack: 2, health: 3, maxHealth: 3, keywords: ['frozen'], side: 'enemy' }).el,
            new Minion({ name: 'Sable Stalker', art: 'hero-duelist', attack: 5, health: 2, maxHealth: 2, keywords: ['stealth', 'windfury'] }).el,
            new Minion({ name: 'Fresh Recruit', art: 'hero-vanguard', attack: 2, health: 2, maxHealth: 2, asleep: true }).el,
          );
        },
        stage: 'scene',
      },
    ],
  },
  {
    id: 'BoardLane',
    name: 'BoardLane',
    group: 'board',
    collection: 'cardgame',
    blurb: 'A row of minions in play, with the thing every board needs and few have — an insertion point.',
    description:
      'Dragging a card over the lane opens a gap where it would land, because on a board where position matters — adjacency buffs, splash damage, the left-to-right order deathrattles resolve in — dropping into "the end" is not good enough.\n\nThe insertion index is computed from the pointer against the *midpoints* of the minions already there, which makes the gap open on the side the pointer is nearer. Testing element bounds instead flickers between two answers whenever the pointer sits on a border.\n\nA full lane refuses the drop rather than accepting it and failing server-side, and says which limit was hit.',
    tags: ['board', 'lane', 'battlefield', 'minions', 'position', 'drop', 'insertion', 'board limit', 'hearthstone', 'tcg'],
    related: ['Minion', 'CardHand', 'HeroPortrait', 'TargetArrow'],
    demos: [
      {
        title: 'Two boards facing each other',
        note: 'Move the pointer across the friendly lane — a gap opens where a card would land.',
        build: () => {
          const enemy = new BoardLane({
            side: 'enemy', limit: 7, size: 84, label: 'Enemy board',
            minions: [
              { name: 'Ash Hound', art: 'hunt-dire-wolf', attack: 3, health: 2, maxHealth: 2, keywords: ['rush'] },
              { name: 'Frost Wraith', art: 'blood-nightwing', attack: 2, health: 3, maxHealth: 3 },
              { name: 'Bone Ghoul', art: 'blood-skull', attack: 4, health: 1, maxHealth: 4 },
            ],
          });
          const mine = new BoardLane({
            side: 'friendly', limit: 7, size: 84, droppable: true, label: 'Your board',
            minions: [
              { name: 'Bog Sentinel', art: 'hero-stone-golem', attack: 2, health: 6, maxHealth: 6, keywords: ['taunt'] },
              { name: 'Emberwing Drake', art: 'blood-plague-drake', attack: 4, health: 5, maxHealth: 5, elite: true },
            ],
          });
          mine.on<{ index: number }>('lane:drop', ({ index }) => console.log('would play at', index));
          mine.on<string>('lane:refused', (why) => console.log(why));
          return col(enemy.el, mine.el);
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'HeroPortrait',
    name: 'HeroPortrait',
    group: 'board',
    collection: 'cardgame',
    blurb: 'The hero: portrait, health, armour and the attack a weapon gives them.',
    description:
      'Armour is a separate gem rather than added to health, and `damage()` spends it first — which is what makes "you are on 24 but really 29" visible instead of a number the player has to hold in their head. Lethal maths is the most common thing a card-game player gets wrong, and it is wrong because the UI merged two numbers that behave differently.\n\nThe attack gem only appears when the hero actually has attack, because a permanent 0 in the corner trains players to stop reading it.',
    tags: ['hero', 'portrait', 'health', 'armour', 'face', 'target', 'immune', 'frozen', 'hearthstone', 'tcg'],
    related: ['HeroPower', 'WeaponSlot', 'SecretRow', 'Minion'],
    demos: [
      {
        title: 'Both heroes and their furniture',
        note: 'Click a hero — it takes 6 damage, and armour is spent before health.',
        build: () => {
          const mine = new HeroPortrait({
            name: 'Vexhollow', heroClass: 'Necromancer', art: 'blood-necromancer',
            health: 24, maxHealth: 30, armour: 5, attack: 3, side: 'friendly',
            effects: ['glyph-spirit-vortex'],
          });
          mine.on('hero:target', () => mine.damage(6));

          const theirs = new HeroPortrait({
            name: 'Pyre Knight', heroClass: 'Warrior', art: 'hero-emberknight',
            health: 8, maxHealth: 30, side: 'enemy', targeted: true,
          });
          theirs.on('hero:target', () => theirs.damage(6));

          return row(mine.el, theirs.el, new HeroPortrait({
            name: 'Ashborn', heroClass: 'Frozen', art: 'hero-voidguard',
            health: 30, maxHealth: 30, frozen: true, side: 'enemy',
          }).el);
        },
        stage: 'scene',
      },
    ],
  },
  {
    id: 'HeroPower',
    name: 'HeroPower',
    group: 'board',
    collection: 'cardgame',
    blurb: 'One button, once a turn, for two mana — the only thing on the board that is always there.',
    description:
      'The button refuses the press itself when it is used or unaffordable and says which — those are different problems with different fixes, and a single grey circle tells a player neither. `used` is drawn as a chain over the art rather than as a dim: a chained power reads as "not until next turn" where a faded one reads as "broken".',
    tags: ['hero power', 'ability', 'once per turn', 'mana', 'chained', 'upgraded', 'button', 'hexagon', 'hearthstone', 'tcg'],
    related: ['HeroPortrait', 'ManaTray', 'WeaponSlot', 'AbilityButton'],
    demos: [
      {
        title: 'Ready, used and unaffordable',
        note: 'Press the first — it fires. The chained one and the poor one refuse and say why on hover.',
        build: () => {
          const tap = new HeroPower({
            name: 'Lifetap', text: 'Draw a card and take 2 damage.',
            cost: 2, glyph: 'glyph-spell-book', mana: 5,
          });
          tap.on('power:use', () => tap.setUsed(true));
          return row(
            tap.el,
            new HeroPower({ name: 'Armor Up!', text: 'Gain 2 Armour.', cost: 2, glyph: 'glyph-shield-block', used: true, mana: 5, color: '#c9502a' }).el,
            new HeroPower({ name: 'Fireblast', text: 'Deal 1 damage.', cost: 2, glyph: 'glyph-magic-flame', mana: 1, color: '#4a8ede' }).el,
            new HeroPower({ name: 'Steady Shot', text: 'Deal 2 damage to the enemy hero.', cost: 2, glyph: 'glyph-bow-and-arrow', upgraded: true, mana: 8, color: '#7fb069' }).el,
          );
        },
        stage: 'scene',
      },
    ],
  },
  {
    id: 'WeaponSlot',
    name: 'WeaponSlot',
    group: 'board',
    collection: 'cardgame',
    blurb: 'The equipped weapon: attack, durability, and the swing left in it.',
    description:
      '`swing()` spends durability and fires `weapon:break` at zero rather than leaving the caller to check — which is what stops a hero keeping its attack gem after the weapon is gone, the most common desync in a card game HUD.\n\nAn empty slot still renders, as an outline. A weapon appearing and vanishing from the layout shifts the hero every time one breaks; a permanent socket does not, and it also tells a new player that a weapon is a thing they could have.',
    tags: ['weapon', 'durability', 'attack', 'equipped', 'swing', 'break', 'socket', 'hero', 'hearthstone', 'tcg'],
    related: ['HeroPortrait', 'HeroPower', 'PlayingCard', 'Minion'],
    demos: [
      {
        title: 'Equipped, last swing, used and empty',
        note: 'Click the second — it swings, breaks and leaves the socket behind.',
        build: () => {
          const cleaver = new WeaponSlot({
            name: 'Ashfall Cleaver', art: 'weapon-cleaver-axe', attack: 3,
            durability: 1, maxDurability: 2, text: 'After your hero attacks, gain 1 Armour.',
          });
          cleaver.on('weapon:select', () => cleaver.swing());
          cleaver.on('weapon:break', () => console.log('it broke'));
          return row(
            new WeaponSlot({ name: 'Runeblade', art: 'weapon-runeblade', attack: 4, durability: 3, maxDurability: 3, text: 'Deathrattle: draw a card.' }).el,
            cleaver.el,
            new WeaponSlot({ name: 'Frost Axe', art: 'weapon-frost-axe', attack: 2, durability: 2, maxDurability: 2, used: true }).el,
            new WeaponSlot().el,
          );
        },
        stage: 'scene',
      },
    ],
  },
  {
    id: 'SecretRow',
    name: 'SecretRow',
    group: 'board',
    collection: 'cardgame',
    blurb: 'Face-down secrets above a hero — anonymous to the opponent, labelled to their owner.',
    description:
      'That asymmetry is the whole component. A secret is information the opponent must not have and you must: one flag flips the row between the two readings, so a game does not need a second component for its own side. Blurring the opponent\'s glyph rather than replacing it keeps the row\'s shape and count honest — *how many* secrets there are is public, *what* they are is not.\n\n`fire()` reveals the sigil, flashes it, and leaves it revealed for a beat. A secret that vanishes the instant it triggers is one nobody ever learns the name of.',
    tags: ['secret', 'face down', 'hidden', 'trap', 'trigger', 'mage', 'hunter', 'reveal', 'hearthstone', 'tcg'],
    related: ['HeroPortrait', 'PlayHistory', 'QuestTile', 'CardBack'],
    demos: [
      {
        title: 'Yours and theirs',
        note: 'Click anywhere on the page — the first of your secrets fires, flashes and clears.',
        build: () => {
          const mine = new SecretRow({
            own: true, limit: 5, size: 34,
            secrets: [
              { id: 'counter', name: 'Counterspell', trigger: 'When your opponent casts a spell', glyph: 'glyph-arcane-symbol', color: '#4a8ede' },
              { id: 'ice', name: 'Ice Block', trigger: 'When your hero takes fatal damage', glyph: 'glyph-shooting-stars', color: '#6fd0f0' },
              { id: 'mirror', name: 'Mirror Entity', trigger: 'After your opponent plays a minion', glyph: 'glyph-cursed-eye', color: '#9a6fd0' },
            ],
          });
          mine.on<Secret>('secret:fire', (s) => console.log(s.name, 'triggered'));

          const theirs = new SecretRow({
            size: 34,
            secrets: [
              { id: 'a', glyph: 'glyph-bow-and-arrow', color: '#7fb069' },
              { id: 'b', glyph: 'glyph-bow-and-arrow', color: '#7fb069' },
            ],
          });
          return col(theirs.el, mine.el);
        },
        stage: 'scene',
      },
    ],
  },
  {
    id: 'ManaTray',
    name: 'ManaTray',
    group: 'board',
    collection: 'cardgame',
    blurb: 'Filled, spent, temporary and overloaded crystals, plus the count.',
    description:
      '`preview` is the part games skip and players miss: hovering a 4-cost card flashes the four crystals it would take, which answers "can I still play the other thing" without any arithmetic. The preview eats from the *right* of what is available, so the crystals that stay lit are the ones still spendable.\n\nOverloaded crystals are drawn locked in place rather than removed, because a player has to see the cost of last turn\'s decision while making this turn\'s.',
    tags: ['mana', 'crystals', 'resource', 'overload', 'temporary', 'preview', 'cost', 'ramp', 'hearthstone', 'tcg'],
    related: ['CardHand', 'HeroPower', 'PlayingCard', 'EndTurnButton'],
    demos: [
      {
        title: 'Seven crystals, four spendable, two overloaded',
        note: 'The gold crystals are a 3-cost card being hovered — the blue ones are what would be left.',
        build: () => {
          const mana = new ManaTray({
            available: 4, total: 7, max: 10, overloaded: 2, showCount: true, size: 24, preview: 3,
          });
          return col(
            mana.el,
            new ManaTray({ available: 10, total: 10, max: 10, showCount: true, size: 24 }).el,
            new ManaTray({ available: 1, total: 3, max: 10, temporary: 1, showCount: true, size: 24 }).el,
          );
        },
        stage: 'scene',
      },
    ],
  },
  {
    id: 'DeckPile',
    name: 'DeckPile',
    group: 'board',
    collection: 'cardgame',
    blurb: 'The draw pile: a stack whose depth tracks what is left, plus the fatigue counter.',
    description:
      'The stack is three offset layers whose spread shrinks with the count, so a nearly-empty deck *looks* nearly empty before the number is read. That matters more than it sounds: deck-out is a real loss condition and players who only track the number notice it three turns too late.\n\nOnce the pile is empty, `draw()` stops emitting `deck:draw` and starts emitting `deck:fatigue` with an escalating number — the rule, in the component, rather than in every caller that happens to remember it.',
    tags: ['deck', 'draw pile', 'library', 'fatigue', 'deck out', 'count', 'stack', 'discard', 'hearthstone', 'tcg'],
    related: ['CardHand', 'CardBack', 'DeckList', 'PlayHistory'],
    demos: [
      {
        title: 'Full, nearly out, and fatiguing',
        note: 'Click each. The third is empty — drawing from it deals escalating fatigue instead.',
        build: () => {
          const deck = new DeckPile({ count: 17, size: 30, sigil: 'glyph-arcane-symbol', label: 'Deck' });
          deck.on<number>('deck:draw', (left) => console.log(left, 'left'));

          const low = new DeckPile({ count: 3, size: 30, sigil: 'glyph-magic-flame', color: '#8a3a20', label: 'Deck' });

          const out = new DeckPile({ count: 0, size: 30, fatigue: 2, sigil: 'glyph-flaming-skull', label: 'Deck' });
          out.on<number>('deck:fatigue', (dmg) => console.log('fatigue', dmg));

          return row(deck.el, low.el, out.el,
            new DeckPile({ count: 9, kind: 'discard', sigil: 'glyph-skull-wreath', label: 'Graveyard' }).el);
        },
        stage: 'scene',
      },
    ],
  },
  {
    id: 'TurnRope',
    name: 'TurnRope',
    group: 'board',
    collection: 'cardgame',
    blurb: 'The turn timer as a burning rope — invisible until it matters, then impossible to ignore.',
    description:
      'Nothing is drawn for the first minute: the rope *appears* at the ignite point, which is what makes it a warning rather than a clock. Two events come out of it — `rope:ignite` when the burn starts and `rope:out` when it finishes — so a game can play a sound at the first and force the turn at the second without polling anything.\n\nThe burn is driven by rAF against a real timestamp rather than a CSS transition, because the flame\'s position and the forced end of turn have to be the same number. A rope that visibly still has an inch left when the turn ends is the kind of thing players record and post.',
    tags: ['turn timer', 'rope', 'countdown', 'time', 'burning', 'urgency', 'clock', 'turn', 'hearthstone', 'tcg'],
    related: ['EndTurnButton', 'ManaTray', 'CountdownTimer', 'PhaseTracker'],
    demos: [
      {
        title: 'Lit, burning and nearly out',
        note: '`elapsed` seeds the clock, so the rope is already alight on the first frame — the top one runs, the two below are held at a fixed point in the burn.',
        build: () => {
          const rope = new TurnRope({
            turnSeconds: 12, ropeSeconds: 8, elapsed: 4.5,
            length: 300, showSeconds: true, auto: true,
          });
          rope.on('rope:ignite', () => console.log('rope lit'));
          rope.on('rope:out', () => rope.restart());
          return col(
            rope.el,
            new TurnRope({ turnSeconds: 75, ropeSeconds: 15, elapsed: 65, length: 300, showSeconds: true }).el,
            new TurnRope({ turnSeconds: 75, ropeSeconds: 15, elapsed: 73, length: 300, showSeconds: true }).el,
          );
        },
        stage: 'scene',
      },
    ],
  },
  {
    id: 'EndTurnButton',
    name: 'EndTurnButton',
    group: 'board',
    collection: 'cardgame',
    blurb: 'Four states, and the difference between them is the whole component.',
    description:
      '`playable` is what makes it useful rather than decorative. With cards you can still play it stays quiet; at zero it turns gold and breathes, which is the single best hint a card game can give a new player — most wasted mana is a player not noticing they had a two-drop left.\n\nThe opponent\'s turn is not a disabled button. It is a different, unpressable panel with its own text, because a greyed-out "End turn" invites clicking and a player who clicks it learns nothing about whose turn it is.',
    tags: ['end turn', 'pass', 'turn', 'button', 'waiting', 'enemy turn', 'hexagon', 'nudge', 'hearthstone', 'tcg'],
    related: ['TurnRope', 'ManaTray', 'CardHand', 'PhaseTracker'],
    demos: [
      {
        title: 'All four states',
        note: 'The second has nothing left to play, so it goes gold and breathes.',
        build: () => {
          const yours = new EndTurnButton({ state: 'yours', playable: 3 });
          yours.on('turn:end', () => yours.setState('waiting'));
          return row(
            yours.el,
            new EndTurnButton({ state: 'yours', playable: 0 }).el,
            new EndTurnButton({ state: 'waiting' }).el,
            new EndTurnButton({ state: 'theirs' }).el,
          );
        },
        stage: 'scene',
      },
    ],
  },
  {
    id: 'TargetArrow',
    name: 'TargetArrow',
    group: 'board',
    collection: 'cardgame',
    blurb: 'The curved drag-to-target line — the one shape nothing else in a UI looks like.',
    description:
      'The curve is a quadratic Bézier whose control point is pushed *perpendicular* to the line by a fraction of its own length, so a short drag bows gently and a cross-board drag arcs hard without either being hand-tuned. A straight line reads as a UI affordance; a bowed one reads as an intent, which is why every game in the genre bows it.\n\n`aim()` takes the pointer event and the element the arrow is drawn inside and does the coordinate conversion itself — measuring against the container\'s own rect rather than the viewport, so the arrow is correct inside a transformed board, which is where most of them get drawn.',
    tags: ['target', 'arrow', 'drag', 'aim', 'attack', 'curve', 'bezier', 'pointer', 'hearthstone', 'tcg'],
    related: ['Minion', 'BoardLane', 'HeroPortrait', 'Reticle'],
    demos: [
      {
        title: 'Drag anywhere on the board',
        note: 'Move the pointer inside the felt — the arrow follows and bows harder the further it goes.',
        build: () => {
          const arrow = new TargetArrow({ kind: 'attack' });
          const board = felt('260px', arrow.el);
          const origin = { x: 140, y: 200 };
          board.appendChild(h('div', {
            style: {
              position: 'absolute', left: `${origin.x - 6}px`, top: `${origin.y - 6}px`,
              width: '12px', height: '12px', borderRadius: '50%', background: '#e8543f',
            },
          }));
          board.addEventListener('pointermove', (ev) => arrow.aim(origin, board, ev as PointerEvent));
          board.addEventListener('pointerleave', () => arrow.hide());
          arrow.draw(origin, { x: 520, y: 90 });
          return board;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'PlayHistory',
    name: 'PlayHistory',
    group: 'board',
    collection: 'cardgame',
    blurb: 'The strip of what was played, drawn and killed — how a player answers "what just happened".',
    description:
      'Entries are thumbnails rather than text, because a card game\'s log is read at a glance mid-turn and a name is slower to recognise than art you have seen a hundred times. The kind is a coloured edge rather than a word, for the same reason — five states, five colours, no reading.\n\nNew entries arrive at the bottom and the strip scrolls itself, so the newest is always where the eye already is.',
    tags: ['history', 'log', 'played', 'drawn', 'died', 'timeline', 'strip', 'thumbnails', 'hearthstone', 'tcg'],
    related: ['BattleLog', 'SecretRow', 'DeckPile', 'Minion'],
    demos: [
      {
        title: 'A turn and a half',
        note: 'Coloured edges carry who did what: blue you, red them, gold a trigger, dark a death.',
        build: () => {
          const history = new PlayHistory({
            title: 'This game', max: 10, align: 'left',
            entries: [
              { name: 'Ash Hound', art: 'hunt-dire-wolf', cost: 2, side: 'friendly', kind: 'played', turn: 3 },
              { name: 'Cinder Bolt', art: 'fire-flame-lance', cost: 2, side: 'enemy', kind: 'played', turn: 3 },
              { name: 'Ash Hound', art: 'hunt-dire-wolf', side: 'friendly', kind: 'died', turn: 3 },
              { name: 'Counterspell', art: 'earth-rune-arch', side: 'enemy', kind: 'triggered', turn: 4 },
              { name: 'Bog Sentinel', art: 'hero-stone-golem', cost: 4, side: 'friendly', kind: 'played', turn: 4 },
              { name: 'Emberwing Drake', art: 'blood-plague-drake', cost: 5, side: 'enemy', kind: 'played', turn: 5 },
            ],
          });
          return history.el;
        },
        stage: 'scene',
      },
    ],
  },
  {
    id: 'EmoteWheel',
    name: 'EmoteWheel',
    group: 'board',
    collection: 'cardgame',
    blurb: 'Six things you are allowed to say — a voice without a chat box.',
    description:
      'The cooldown is per-emote rather than global, which is exactly the rule that makes spamming one emote impossible while leaving normal play unhampered — a global cooldown punishes a player who says "greetings" then "thanks", and a missing one is how "well played" becomes harassment.\n\nWedges are laid out from their index and counter-rotated, so five emotes and eight both fill the circle evenly with upright labels and no per-count stylesheet.',
    tags: ['emote', 'wheel', 'radial', 'chat', 'bm', 'squelch', 'cooldown', 'social', 'hearthstone', 'tcg'],
    related: ['RadialMenu', 'HeroPortrait', 'SpeechBubble', 'PlayHistory'],
    demos: [
      {
        title: 'Click the portrait',
        note: 'Send one — it closes and that wedge greys out for four seconds while the rest stay live.',
        build: () => {
          const wheel = new EmoteWheel({
            size: 230, art: 'hero-emberknight', cooldown: 4000, open: true,
            emotes: [
              { id: 'greet', label: 'Greetings!', glyph: 'glyph-peace-dove', color: '#7fb069' },
              { id: 'well', label: 'Well played.', glyph: 'glyph-trophy-cup', color: '#e0b04a' },
              { id: 'thanks', label: 'Thanks!', glyph: 'glyph-holy-cross', color: '#6fa8dc' },
              { id: 'wow', label: 'Wow.', glyph: 'glyph-shooting-stars', color: '#b98fe0' },
              { id: 'oops', label: 'Oops.', glyph: 'glyph-exploding-bomb', color: '#d8543f' },
              { id: 'threat', label: 'Unstoppable!', glyph: 'glyph-flaming-skull', color: '#c9502a', muted: true },
            ],
          });
          wheel.on<Emote>('emote:send', (e) => console.log('said:', e.label));
          return wheel.el;
        },
        stage: 'scene',
      },
    ],
  },
  {
    id: 'QuestTile',
    name: 'QuestTile',
    group: 'board',
    collection: 'cardgame',
    blurb: 'A card that stays on the board and counts — what it wants, how far along, what it pays.',
    description:
      '`advance()` fires `quest:complete` exactly once, on the tick that crosses the goal, and further calls do nothing — which is what stops a quest paying out twice when two triggers land in the same game action.\n\nProgress is pips below eight and a bar above. A "4/7" bar is harder to read than four filled pips, and every quest in the genre has a small, countable goal.',
    tags: ['quest', 'sidequest', 'objective', 'progress', 'counter', 'reward', 'board', 'pips', 'hearthstone', 'tcg'],
    related: ['SecretRow', 'HeroPortrait', 'QuestTracker', 'RewardTrack'],
    demos: [
      {
        title: 'One away, and one already done',
        note: 'Click the page — the first quest ticks. At seven it completes, once, and stays complete.',
        build: () => {
          const quest = new QuestTile({
            name: 'Fire Plume\'s Heart', requirement: 'Play 7 Taunt minions',
            glyph: 'glyph-magic-flame', progress: 6, goal: 7,
            reward: 'Sulfuras', rewardArt: 'weapon-magma-sword',
          });
          quest.on<string>('quest:complete', (reward) => console.log('granted', reward));
          return col(
            quest.el,
            new QuestTile({
              name: 'Learn Draconic', requirement: 'Spend 8 mana on spells',
              glyph: 'glyph-spell-book', progress: 8, goal: 8, complete: true,
              reward: 'Dragonqueen Alexstrasza', rewardArt: 'blood-plague-drake',
            }).el,
            new QuestTile({
              name: 'Pack Tactics', requirement: 'Summon 3 Beasts', minor: true,
              glyph: 'glyph-thorny-branch', progress: 1, goal: 3, reward: 'Draw 2 cards',
            }).el,
          );
        },
        stage: 'scene',
      },
    ],
  },
];
