/** Shared types for the documentation site's component catalog. */

/**
 * The library ships two collections, each with its own tab. They are separate
 * because the vocabularies barely overlap: an RPG screen is built from panels,
 * inventories and HUDs, a card game from cards, a board and a mana tray. Mixing
 * them into one 250-entry list makes both harder to search.
 */
export type Collection = 'rpg' | 'cardgame';

export type CatalogGroup =
  | 'surfaces'
  | 'controls'
  | 'data'
  | 'widgets'
  | 'combat'
  | 'gacha'
  | 'social'
  | 'screens'
  | 'feedback'
  // ── Card games ──
  | 'cards'
  | 'board'
  | 'deck';

export interface Demo {
  /** Heading shown above this example. */
  title: string;
  /** One line explaining what the example demonstrates. */
  note?: string;
  /**
   * Builds the example. Written as idiomatic usage, because the site extracts
   * this function's own source to display as the copy-paste snippet — so the
   * code on the page can never drift from the code that actually ran.
   */
  build: () => HTMLElement;
  /** Render this demo against a dark backdrop (for HUD / screen templates). */
  stage?: 'plain' | 'scene' | 'wide';
  /** Skip the automatic source extraction and show this instead. */
  code?: string;
}

export interface CatalogEntry {
  /** Matches the component's file name, e.g. `'Button'`. */
  id: string;
  name: string;
  group: CatalogGroup;
  /** Which tab it lives under. Defaults to `'rpg'`. */
  collection?: Collection;
  /** One-sentence summary used on cards, in search and in the JSON registry. */
  blurb: string;
  /** Longer prose shown at the top of the component's page. */
  description?: string;
  /** Search keywords — include the words a game dev would actually type. */
  tags: string[];
  demos: Demo[];
  /** Other component ids this one composes or pairs with. */
  related?: string[];
}

export const GROUP_LABELS: Record<CatalogGroup, string> = {
  surfaces: 'Surfaces & Framing',
  controls: 'Controls',
  data: 'Data Display',
  widgets: 'Game Widgets',
  combat: 'Combat & Battle',
  gacha: 'Collection & Live-Ops',
  social: 'Social & Clan',
  screens: 'Screens & Overlays',
  feedback: 'Feedback & Notifications',
  cards: 'Cards',
  board: 'Board & Match',
  deck: 'Deckbuilding & Collection',
};

export const COLLECTION_LABELS: Record<Collection, string> = {
  rpg: 'RPGs',
  cardgame: 'Card Games',
};

export const COLLECTION_ORDER: Collection[] = ['rpg', 'cardgame'];

/** Which groups belong to which tab, in the order each tab lists them. */
export const COLLECTION_GROUPS: Record<Collection, CatalogGroup[]> = {
  rpg: [
    'surfaces',
    'controls',
    'data',
    'widgets',
    'combat',
    'gacha',
    'social',
    'feedback',
    'screens',
  ],
  cardgame: ['cards', 'board', 'deck'],
};

/** Every group, in reading order, across both collections. */
export const GROUP_ORDER: CatalogGroup[] = [
  ...COLLECTION_GROUPS.rpg,
  ...COLLECTION_GROUPS.cardgame,
];
