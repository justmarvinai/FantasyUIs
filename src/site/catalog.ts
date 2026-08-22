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
import { HALL } from './demos/hall.ts';
import { DIALS } from './demos/dials.ts';
import { RECORDS } from './demos/records.ts';
import { ESTATE } from './demos/estate.ts';
import { SKIRMISH } from './demos/skirmish.ts';
import { VAULT } from './demos/vault.ts';
import { GUILD } from './demos/guild.ts';
import { SIGNALS } from './demos/signals.ts';
import { CHAPTERS } from './demos/chapters.ts';
import { BUTTONS } from './demos/buttons.ts';

/** Every documented component, in the order the gallery lists them. */
export const CATALOG: CatalogEntry[] = [
  ...PRIMITIVES,
  ...BUTTONS,
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
  ...HALL,
  ...DIALS,
  ...RECORDS,
  ...ESTATE,
  ...SKIRMISH,
  ...VAULT,
  ...GUILD,
  ...FEEDBACK,
  ...SIGNALS,
  ...SCREENS,
  ...CHAPTERS,
];

export const CATALOG_BY_ID = new Map(CATALOG.map((c) => [c.id, c]));

export { GROUP_LABELS, GROUP_ORDER } from './types.ts';
export type { CatalogEntry, CatalogGroup, Demo } from './types.ts';
