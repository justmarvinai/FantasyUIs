import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { PlayingCard } from '../../lib/components/PlayingCard.ts';
import { CardBack } from '../../lib/components/CardBack.ts';
import { CardHand } from '../../lib/components/CardHand.ts';

const row = (...kids: Node[]) =>
  h('div', { style: { display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'flex-start' } }, ...kids);

export const CARDS: CatalogEntry[] = [
  {
    id: 'PlayingCard',
    name: 'PlayingCard',
    group: 'cards',
    collection: 'cardgame',
    blurb: 'The card itself — mana gem, portrait, name plate, rules text and stat gems, in five frames.',
    description:
      'Every dimension is an `em` off a font size derived from `width`, so one number scales the whole card: a 90px hand card and a 300px collection card are the same component rather than two stylesheets. That is what lets `CardHand`, `DiscoverPicker`, `MulliganTray` and `CollectionGrid` all share it.\n\n`kind` is not decoration. A spell has no stat gems and a wider text box; a weapon prints durability in the right gem instead of health; a minion gets an oval portrait window and a spell a rectangular one, because the silhouette is how a player tells them apart across the table before reading a word.',
    tags: ['card', 'minion', 'spell', 'weapon', 'mana cost', 'rules text', 'rarity', 'legendary', 'hearthstone', 'tcg'],
    related: ['CardHand', 'Minion', 'CardBack', 'CollectionGrid'],
    demos: [
      {
        title: 'Five frames, one component',
        note: 'Minion, spell, weapon, a golden legendary and a face-down card.',
        build: () =>
          row(
            new PlayingCard({
              name: 'Emberwing Drake', cost: 5, kind: 'minion', attack: 4, health: 5,
              art: 'blood-plague-drake', tribe: 'Dragon', rarity: 'epic', elite: true,
              text: '**Battlecry:** Deal *2* damage to all enemy minions.',
              playable: true, width: 190,
            }).el,
            new PlayingCard({
              name: 'Cinder Bolt', cost: 2, kind: 'spell', art: 'fire-flame-lance', rarity: 'common',
              text: 'Deal *3* damage. If your hero took damage this turn, deal *5* instead.',
              flavour: 'It goes where you point. Mostly.', width: 190,
            }).el,
            new PlayingCard({
              name: 'Ashfall Cleaver', cost: 4, kind: 'weapon', attack: 3, durability: 2,
              art: 'weapon-cleaver-axe', rarity: 'rare',
              text: 'After your hero attacks, gain *1* Armour.', width: 190,
            }).el,
            new PlayingCard({
              name: 'Vexhollow the Unmade', cost: 9, kind: 'minion', attack: 8, health: 8,
              art: 'blood-necromancer', tribe: 'Undead', rarity: 'legendary', elite: true, golden: true,
              text: '**Deathrattle:** Summon every minion that died this game.',
              width: 190,
            }).el,
            new PlayingCard({ name: 'Hidden', faceDown: true, width: 190 }).el,
          ),
        stage: 'scene',
      },
    ],
  },

  {
    id: 'CardBack',
    name: 'CardBack',
    group: 'cards',
    collection: 'cardgame',
    blurb: 'The reverse of a card — the deck skin, drawn in CSS so a new one is a colour and a sigil.',
    description:
      'The patterns are drawn rather than shipped as art, which is what makes a back a two-line data record instead of a new PNG per skin. A game that sells card backs needs dozens; thirty gradients cost nothing where thirty images cost a download.\n\n`PlayingCard({ faceDown: true })` draws a plain back inline for a card that happens to be hidden. This is the back as a *thing* — named, owned, equippable, browsable — which is what a collection screen needs.',
    tags: ['card back', 'deck skin', 'cosmetic', 'reverse', 'face down', 'collection', 'pattern', 'sigil', 'hearthstone', 'tcg'],
    related: ['PlayingCard', 'DeckPile', 'CollectionGrid', 'SkinSelector'],
    demos: [
      {
        title: 'Four skins and one locked',
        note: 'Every pattern is CSS. The equipped one takes the green rim.',
        build: () =>
          row(
            new CardBack({ name: 'Ashfall Weave', sigil: 'glyph-magic-flame', color: '#8a3a20', pattern: 'scales', equipped: true }).el,
            new CardBack({ name: 'Void Compact', sigil: 'glyph-spirit-vortex', color: '#6a3fa0', pattern: 'runes' }).el,
            new CardBack({ name: 'Thornwarden', sigil: 'glyph-nature-shield', color: '#2f6b53', pattern: 'diagonal' }).el,
            new CardBack({ name: 'Gilded Compact', sigil: 'glyph-trophy-cup', color: '#c9a248', pattern: 'plain' }).el,
            new CardBack({ name: 'Crimson Moon', sigil: 'glyph-celestial-body', color: '#a01f38', pattern: 'scales', owned: false, source: 'Rank 5 this season' }).el,
          ),
        stage: 'scene',
      },
    ],
  },
  {
    id: 'CardHand',
    name: 'CardHand',
    group: 'cards',
    collection: 'cardgame',
    blurb: 'The fan of cards in hand — arcing, lifting on hover, dimming what you cannot afford.',
    description:
      'The fan is computed rather than authored: each card\'s rotation and vertical offset come from its position across the spread, so a three-card hand and a ten-card hand both look deliberate and neither needs a magic number. Cards overlap by a fraction of their width that *shrinks as the hand grows*, which keeps ten cards in the same box as five without ever hiding a mana gem — the one corner a player has to read on every card.\n\nAffordability lives here, not on the card: a hand knows the mana, a card does not, and pushing `playable` down from one place means two cards can never disagree.',
    tags: ['hand', 'fan', 'cards', 'draw', 'play', 'mana', 'hand limit', 'arc', 'hearthstone', 'tcg'],
    related: ['PlayingCard', 'ManaTray', 'DeckPile', 'BoardLane'],
    demos: [
      {
        title: 'Six cards with four mana',
        note: 'The two you cannot afford desaturate. Hover one — it straightens and comes forward.',
        build: () => {
          const hand = new CardHand({
            size: 132, mana: 4, limit: 10, showCount: true,
            cards: [
              { name: 'Cinder Bolt', cost: 2, kind: 'spell', art: 'fire-flame-lance', text: 'Deal *3* damage.' },
              { name: 'Ash Hound', cost: 2, kind: 'minion', attack: 3, health: 2, art: 'hunt-dire-wolf', tribe: 'Beast' },
              { name: 'Bog Sentinel', cost: 4, kind: 'minion', attack: 2, health: 6, art: 'hero-stone-golem', text: '**Taunt**' },
              { name: 'Ashfall Cleaver', cost: 4, kind: 'weapon', attack: 3, durability: 2, art: 'weapon-cleaver-axe' },
              { name: 'Emberwing Drake', cost: 5, kind: 'minion', attack: 4, health: 5, art: 'blood-plague-drake', rarity: 'epic', tribe: 'Dragon' },
              { name: 'Vexhollow', cost: 9, kind: 'minion', attack: 8, health: 8, art: 'blood-necromancer', rarity: 'legendary', elite: true },
            ],
          });
          hand.on<number>('hand:play', (i) => console.log('play card', i));
          return hand.el;
        },
        stage: 'wide',
      },
    ],
  },
];
