/** Shared types for the documentation site's component catalog. */

export type CatalogGroup = 'surfaces' | 'controls' | 'data' | 'widgets' | 'screens' | 'feedback';

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
  screens: 'Screens & Overlays',
  feedback: 'Feedback & Notifications',
};

export const GROUP_ORDER: CatalogGroup[] = [
  'surfaces',
  'controls',
  'data',
  'widgets',
  'feedback',
  'screens',
];
