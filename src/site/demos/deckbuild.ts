import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { DiscoverPicker } from '../../lib/components/DiscoverPicker.ts';
import { MulliganTray } from '../../lib/components/MulliganTray.ts';
import { DeckList, type DeckEntry } from '../../lib/components/DeckList.ts';
import { ManaCurve } from '../../lib/components/ManaCurve.ts';
import { CollectionGrid, type CollectionCard } from '../../lib/components/CollectionGrid.ts';
import { CraftPanel } from '../../lib/components/CraftPanel.ts';
import { ArenaDraft } from '../../lib/components/ArenaDraft.ts';

const row = (...kids: Node[]) =>
  h('div', { style: { display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' } }, ...kids);

/** A representative 30-card list, reused across the deckbuilding demos. */
const EMBER_DECK: DeckEntry[] = [
  { id: 'bolt', name: 'Cinder Bolt', cost: 1, count: 2, art: 'fire-flame-drop' },
  { id: 'imp', name: 'Ember Imp', cost: 1, count: 2, art: 'fire-hellhound' },
  { id: 'hound', name: 'Ash Hound', cost: 2, count: 2, art: 'hunt-dire-wolf' },
  { id: 'adept', name: 'Cinder Adept', cost: 2, count: 2, rarity: 'rare', art: 'hero-spellblade' },
  { id: 'lance', name: 'Flame Lance', cost: 3, count: 2, art: 'fire-flame-lance' },
  { id: 'warden', name: 'Bog Warden', cost: 3, count: 2, art: 'blood-cursed-beast' },
  { id: 'cleaver', name: 'Ashfall Cleaver', cost: 4, count: 2, rarity: 'rare', art: 'weapon-cleaver-axe' },
  { id: 'sentinel', name: 'Bog Sentinel', cost: 4, count: 2, art: 'hero-stone-golem' },
  { id: 'drake', name: 'Emberwing Drake', cost: 5, count: 2, rarity: 'epic', art: 'blood-plague-drake' },
  { id: 'phoenix', name: 'Cinderborn Phoenix', cost: 6, count: 2, rarity: 'epic', art: 'fire-phoenix-rise', missing: true, craftCost: 400 },
  { id: 'vex', name: 'Vexhollow the Unmade', cost: 9, count: 1, rarity: 'legendary', unique: true, art: 'blood-necromancer' },
  { id: 'maw', name: 'The Maw', cost: 8, count: 1, rarity: 'legendary', unique: true, art: 'blood-plague-drake', missing: true, craftCost: 1600 },
];

export const DECKBUILD: CatalogEntry[] = [
  {
    id: 'DiscoverPicker',
    name: 'DiscoverPicker',
    group: 'deck',
    collection: 'cardgame',
    blurb: 'Three cards on a lit stage, pick one, the rest burn away.',
    description:
      'The timeout picks *for* the player rather than cancelling, because a Discover that expires into nothing loses a card and there is no rule in any game in the genre that does that. It picks at random, announces which through the same `discover:pick` event, and marks the choice as automatic in the payload so a caller can log it differently.\n\nThe unchosen cards burn away rather than vanishing, which is what makes the choice feel spent — and it is the moment players screenshot, so it is worth the two keyframes.',
    tags: ['discover', 'choose', 'three cards', 'pick', 'random', 'stage', 'timeout', 'draft', 'hearthstone', 'tcg'],
    related: ['PlayingCard', 'ArenaDraft', 'MulliganTray', 'CardHand'],
    demos: [
      {
        title: 'Discover a spell',
        note: 'Pick one — the other two burn. The clock picks for you rather than cancelling.',
        build: () => {
          const pick = new DiscoverPicker({
            title: 'Discover a spell', note: 'From your class', size: 180, seconds: 20,
            choices: [
              { name: 'Cinder Bolt', cost: 2, kind: 'spell', art: 'fire-flame-lance', text: 'Deal *3* damage.' },
              { name: 'Emberstorm', cost: 5, kind: 'spell', art: 'fire-firenado', rarity: 'rare', text: 'Deal *2* damage to all minions.' },
              { name: 'Rite of Ash', cost: 3, kind: 'spell', art: 'blood-hex-circle', rarity: 'epic', text: '**Discover** a Demon. It costs *2* less.' },
            ],
          });
          pick.on<{ automatic: boolean }>('discover:pick', (p) => console.log('picked', p.automatic ? '(auto)' : ''));
          return pick.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'MulliganTray',
    name: 'MulliganTray',
    group: 'deck',
    collection: 'cardgame',
    blurb: 'The opening hand, each card keepable or replaceable, one button to lock it in.',
    description:
      'Toggling is per-card and reversible right up to the confirm, because a mulligan is a *comparison* — you decide about the three-drop by looking at whether you already kept a two-drop — and a UI that commits each card the moment it is clicked makes that impossible.\n\nCards marked for replacement stay visible with a cross over them rather than being removed. Removing them collapses the layout and takes away the very thing being compared against.',
    tags: ['mulligan', 'opening hand', 'keep', 'replace', 'redraw', 'start', 'coin', 'confirm', 'hearthstone', 'tcg'],
    related: ['CardHand', 'DiscoverPicker', 'PlayingCard', 'DeckPile'],
    demos: [
      {
        title: 'Four cards on the draw',
        note: 'Toggle any of them. The confirm button counts what you are replacing.',
        build: () => {
          const mull = new MulliganTray({
            title: 'Choose your opening hand', onThePlay: false, size: 158, seconds: 30,
            replacing: [3],
            cards: [
              { name: 'Ember Imp', cost: 1, kind: 'minion', attack: 2, health: 1, art: 'fire-hellhound' },
              { name: 'Ash Hound', cost: 2, kind: 'minion', attack: 3, health: 2, art: 'hunt-dire-wolf', tribe: 'Beast' },
              { name: 'Flame Lance', cost: 3, kind: 'spell', art: 'fire-flame-lance', text: 'Deal *4* damage.' },
              { name: 'Vexhollow the Unmade', cost: 9, kind: 'minion', attack: 8, health: 8, art: 'blood-necromancer', rarity: 'legendary', elite: true },
            ],
          });
          mull.on<number[]>('mulligan:confirm', (list) => console.log('replacing', list));
          return mull.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'DeckList',
    name: 'DeckList',
    group: 'deck',
    collection: 'cardgame',
    blurb: 'Every card in curve order, with copy counts and the dust owed on what you do not own.',
    description:
      'The list sorts itself by cost then name rather than trusting the caller\'s order, because a deck list not in curve order is unreadable and every caller would otherwise have to remember to sort. Counting is derived the same way: `have` is the sum of copies, not a separate field, so the header can never disagree with the rows.\n\nMissing cards stay in the list with their dust cost, which is what turns a deck list from a record into a shopping list — the single most useful thing a deckbuilder does for a new player.',
    tags: ['deck list', 'deckbuilder', 'curve order', 'copies', 'dust', 'craft', 'thirty cards', 'legendary', 'hearthstone', 'tcg'],
    related: ['ManaCurve', 'CollectionGrid', 'CraftPanel', 'DeckPile'],
    demos: [
      {
        title: 'A 30-card list with two cards missing',
        note: 'Hover a row for the remove button. The two greyed rows print their craft cost instead of a count.',
        build: () => {
          const list = new DeckList({
            name: 'Emberfall Aggro', heroClass: 'Warrior', cards: EMBER_DECK,
            size: 30, copyLimit: 2, editable: true, height: 420,
          });
          list.on<DeckEntry>('deck:remove', (card) => console.log('removed', card.name));
          list.on<{ have: number }>('deck:count', (c) => console.log(c.have, 'cards'));
          return list.el;
        },
      },
    ],
  },
  {
    id: 'ManaCurve',
    name: 'ManaCurve',
    group: 'deck',
    collection: 'cardgame',
    blurb: 'How many cards at each cost — the one chart a deckbuilder cannot do without.',
    description:
      'Bars are scaled to the tallest bucket rather than to a fixed maximum, so the *shape* is always readable: a 30-card deck and a 5-card work-in-progress both show a curve rather than a flat line near the floor.\n\nThe average is computed from the buckets when it is not passed, since a caller that has the counts already has everything needed to derive it — and two sources of one number eventually disagree.\n\n`compare` ghosts a second curve behind the first, which turns "here is my deck" into "here is my deck against what this archetype usually runs".',
    tags: ['mana curve', 'chart', 'histogram', 'deckbuilder', 'cost', 'average', 'archetype', 'aggro', 'hearthstone', 'tcg'],
    related: ['DeckList', 'ArenaDraft', 'CollectionGrid', 'Sparkline'],
    demos: [
      {
        title: 'An aggro curve against a control archetype',
        note: 'The dashed outline behind is what a control list of the same class usually runs.',
        build: () => {
          const curve = new ManaCurve({
            counts: [0, 4, 8, 6, 4, 3, 2, 3], cap: 7, showCounts: true, height: 96,
            compare: [0, 1, 3, 4, 5, 5, 6, 6],
          });
          return h('div', { style: { width: '340px' } }, curve.el);
        },
      },
    ],
  },
  {
    id: 'CollectionGrid',
    name: 'CollectionGrid',
    group: 'deck',
    collection: 'cardgame',
    blurb: 'A page of cards with copies owned, copies already in the deck, and the dust price of the rest.',
    description:
      'A card already maxed in the deck is greyed *in place* rather than filtered out, because the collection is browsed by looking, and a card vanishing as you add its second copy reflows the page under the cursor. The copy pip carries the whole state — `1/2`, `2/2`, or a dust price — so one glance per card answers "can I add this".\n\nUnowned cards keep their art at full detail behind the grey, since the collection is also the shop window. The pip stays out of the greyscale filter, because it is the only part that still has to be readable.',
    tags: ['collection', 'browse', 'grid', 'owned', 'copies', 'dust', 'craft', 'deckbuilder', 'hearthstone', 'tcg'],
    related: ['PlayingCard', 'DeckList', 'CraftPanel', 'FilterBar'],
    demos: [
      {
        title: 'Owned, maxed and uncrafted',
        note: 'The third is already at two copies in the deck; the last two are not owned and print dust.',
        build: () => {
          const cards: CollectionCard[] = [
            { id: 'bolt', name: 'Cinder Bolt', cost: 2, kind: 'spell', art: 'fire-flame-lance', text: 'Deal *3* damage.', owned: 2, limit: 2, inDeck: 1 },
            { id: 'hound', name: 'Ash Hound', cost: 2, kind: 'minion', attack: 3, health: 2, art: 'hunt-dire-wolf', tribe: 'Beast', owned: 2, limit: 2 },
            { id: 'sentinel', name: 'Bog Sentinel', cost: 4, kind: 'minion', attack: 2, health: 6, art: 'hero-stone-golem', text: '**Taunt**', owned: 2, limit: 2, inDeck: 2 },
            { id: 'drake', name: 'Emberwing Drake', cost: 5, kind: 'minion', attack: 4, health: 5, art: 'blood-plague-drake', rarity: 'epic', tribe: 'Dragon', owned: 0, limit: 2, craftCost: 400 },
            { id: 'vex', name: 'Vexhollow', cost: 9, kind: 'minion', attack: 8, health: 8, art: 'blood-necromancer', rarity: 'legendary', elite: true, owned: 0, limit: 1, craftCost: 1600 },
          ];
          const grid = new CollectionGrid({ cards, size: 148, dust: 900, showUnowned: true });
          grid.on<CollectionCard>('collection:add', (c) => console.log('add', c.name));
          grid.on<CollectionCard>('collection:craft', (c) => console.log('craft', c.name));
          return grid.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'CraftPanel',
    name: 'CraftPanel',
    group: 'deck',
    collection: 'cardgame',
    blurb: 'Craft and disenchant, with the arithmetic spelled out on both buttons.',
    description:
      'Disenchanting is the destructive half and the one games make too easy, so it prints how much dust it returns — which is always less than it cost, and worth saying out loud. Crafting refuses at the copy limit rather than letting a player buy a third copy they can never run, and refuses when the dust is short with the shortfall named.\n\nThe two prices sit on their own buttons rather than in a shared readout, because they are different numbers pointing in opposite directions and a single "value" line is how players end up dusting a card they meant to make.',
    tags: ['craft', 'disenchant', 'dust', 'collection', 'legendary', 'copies', 'economy', 'shortfall', 'hearthstone', 'tcg'],
    related: ['CollectionGrid', 'DeckList', 'CostButton', 'Ledger'],
    demos: [
      {
        title: 'One affordable, one short, one already owned',
        note: 'Press Craft on the middle panel — it refuses and names the exact shortfall.',
        build: () => {
          const craft = new CraftPanel({
            name: 'Emberwing Drake', rarity: 'epic', art: 'blood-plague-drake',
            owned: 1, limit: 2, craftCost: 400, dustValue: 100, dust: 2400,
          });
          craft.on<number>('craft:make', (cost) => console.log('crafted for', cost));
          return row(
            craft.el,
            new CraftPanel({
              name: 'Vexhollow the Unmade', rarity: 'legendary', art: 'blood-necromancer',
              owned: 0, limit: 1, craftCost: 1600, dustValue: 400, dust: 900,
            }).el,
            new CraftPanel({
              name: 'Cinder Bolt', rarity: 'common', art: 'fire-flame-lance',
              owned: 2, limit: 2, craftCost: 40, dustValue: 5, dust: 2400,
            }).el,
          );
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'ArenaDraft',
    name: 'ArenaDraft',
    group: 'deck',
    collection: 'cardgame',
    blurb: 'Three cards, pick one, thirty times — with the run record and the curve so far.',
    description:
      'The curve of what you have taken sits beside the choices rather than on another screen. Pick 12 with six two-drops already is a different decision from pick 12 with none, and a drafter who has to remember that makes worse decks — exactly the mistake the format is built to punish.\n\nThe run record counts losses *against the cap*, so "1 loss" and "1 of 3 losses" are the same glance, and it turns red one loss from the end of the run.',
    tags: ['arena', 'draft', 'pick', 'run', 'wins', 'losses', 'curve', 'limited', 'hearthstone', 'tcg'],
    related: ['DiscoverPicker', 'ManaCurve', 'DeckList', 'PlayingCard'],
    demos: [
      {
        title: 'Pick 12 of 30, one loss from the end',
        note: 'Take a card — the curve beside the choices updates and the pick counter moves on.',
        build: () => {
          const draft = new ArenaDraft({
            title: 'Choose a card', pick: 12, picks: 30, wins: 4, losses: 2, maxLosses: 3, size: 168,
            taken: [
              { name: 'Ember Imp', cost: 1 }, { name: 'Cinder Bolt', cost: 1 },
              { name: 'Ash Hound', cost: 2 }, { name: 'Cinder Adept', cost: 2 }, { name: 'Scout', cost: 2 },
              { name: 'Flame Lance', cost: 3 }, { name: 'Bog Warden', cost: 3 },
              { name: 'Ashfall Cleaver', cost: 4 }, { name: 'Bog Sentinel', cost: 4 },
              { name: 'Emberwing Drake', cost: 5 }, { name: 'The Maw', cost: 8 },
            ],
            choices: [
              { name: 'Cinderborn Phoenix', cost: 6, kind: 'minion', attack: 5, health: 4, art: 'fire-phoenix-rise', rarity: 'epic', text: '**Deathrattle:** Return this to your hand.' },
              { name: 'Flame Lance', cost: 3, kind: 'spell', art: 'fire-flame-lance', text: 'Deal *4* damage.' },
              { name: 'Bog Sentinel', cost: 4, kind: 'minion', attack: 2, health: 6, art: 'hero-stone-golem', text: '**Taunt**' },
            ],
          });
          draft.on<{ pick: number }>('draft:pick', (p) => console.log('took pick', p.pick));
          return draft.el;
        },
        stage: 'wide',
      },
    ],
  },
];
