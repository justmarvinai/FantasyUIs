import type { CatalogEntry } from './types.ts';
import { PRIMITIVES } from './demos/primitives.ts';
import { WIDGETS } from './demos/widgets.ts';
import { SCREENS, FEEDBACK } from './demos/screens.ts';
import { GACHA } from './demos/gacha.ts';
import { KIT } from './demos/kit.ts';
import { ROSTER } from './demos/roster.ts';
import { COMBAT } from './demos/combat.ts';
import { WORLD } from './demos/world.ts';
import { CHROME } from './demos/chrome.ts';
import { SYSTEMS } from './demos/systems.ts';
import { STATION } from './demos/station.ts';
import { ECONOMY } from './demos/economy.ts';
import { ATLAS } from './demos/atlas.ts';

/** Every documented component, in the order the gallery lists them. */
export const CATALOG: CatalogEntry[] = [
  ...PRIMITIVES,
  ...KIT,
  ...CHROME,
  ...WIDGETS,
  ...COMBAT,
  ...GACHA,
  ...ROSTER,
  ...WORLD,
  ...SYSTEMS,
  ...STATION,
  ...ECONOMY,
  ...ATLAS,
  ...FEEDBACK,
  ...SCREENS,
];

export const CATALOG_BY_ID = new Map(CATALOG.map((c) => [c.id, c]));

export { GROUP_LABELS, GROUP_ORDER } from './types.ts';
export type { CatalogEntry, CatalogGroup, Demo } from './types.ts';
