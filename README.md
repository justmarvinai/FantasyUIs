# FantasyUIs

**A growing database of ready-to-use UI components for Fantasy & RPG web games.**

49 components built from 79 hand-painted art assets across 2 swappable themes.
Vanilla TypeScript and CSS — zero runtime dependencies, no framework, no build
plugin. Drops into any Vite project, React or not, or straight over a Phaser
canvas as a DOM layer.

🔗 **[fantasyuis.vercel.app](https://fantasyuis.vercel.app)**

---

## What's in it

| Group | Components |
| --- | --- |
| **Surfaces & Framing** | Panel, Frame, Divider, Banner |
| **Controls** | Button, Tabs, Toggle, Slider, Select, TextInput, ContextMenu, RadialMenu |
| **Data display** | Icon, StatBar, Slot, Portrait, Tooltip, Badge, ItemCard |
| **Game widgets** | InventoryGrid, ActionBar, UnitFrame, PartyFrame, BuffBar, CastBar, DialogueBox, QuestLog, QuestTracker, ShopPanel, LootWindow, CraftingPanel, SkillTree, StatsPanel, Paperdoll, Minimap, CurrencyBar, Leaderboard |
| **Feedback** | ToastStack, FloatingText, AchievementPopup |
| **Screens & overlays** | MainMenu, PauseMenu, SettingsScreen, CharacterSelect, LoadingScreen, ResultScreen, LevelUpModal, Modal, HUD |

These are not static skins. The inventory grid does real drag-and-drop and
stacking, the action bar runs cooldown sweeps and greys out what you cannot
afford, the dialogue box types text out and branches, the skill tree gates nodes
behind prerequisites and draws its own dependency lines.

## Themes

| Theme | Reads as |
| --- | --- |
| **Stone & Vine** (`stone-vine`) | Carved grey stone, celtic vine ornament, teal button faces — overworld, town, inventory, shop |
| **Dark Ember** (`dark-ember`) | Bronze art-deco line work on black leather, glossy blood-red buttons — combat, dungeon, endgame |

Both packs implement the same semantic slots, so one attribute re-skins an
entire subtree with no code change:

```html
<div data-fui-theme="dark-ember">
  <!-- every component in here uses the Dark Ember art -->
</div>
```

## Using it in a game

```html
<!-- 1. One stylesheet: tokens, both themes, every component, artwork included -->
<link rel="stylesheet" href="https://fantasyuis.vercel.app/dist/fantasyuis.css" />
```

```ts
// 2. Copy the component files you want from the site into src/ui/
import { Panel, InventoryGrid, StatBar } from './ui';

const panel = new Panel({ title: 'Inventory', width: 460, mount: document.body });

const bag = new InventoryGrid({ cols: 6, size: 24 });
bag.add({ icon: 'icon-potion', name: 'Healing Draught', qty: 5, rarity: 'uncommon' });
panel.add(bag.el);

const hp = new StatBar({ kind: 'health', value: 72, max: 100, label: 'Health' });
hp.set(48); // animates, and leaves a damage trail behind
```

Shipping for real? Copy `public/fui/` into your own project and repoint the art
with one call, so your game has no external dependency:

```ts
import { setAssetBase } from './ui/core/assets';
setAssetBase('/fui');
```

Scale the whole interface from a single custom property:

```css
:root { --fui-ui-scale: 0.5; } /* raise for chunkier framing, lower for a denser HUD */
```

## For AI coding agents

The site is built to be read by machines. Every page is static HTML with the
demo markup already rendered, so nothing needs JavaScript to be understood.

| Endpoint | What it gives you |
| --- | --- |
| [`/llms.txt`](https://fantasyuis.vercel.app/llms.txt) | The whole library summarised for an LLM — every component, its purpose, its options, every asset id |
| [`/registry.json`](https://fantasyuis.vercel.app/registry.json) | Machine-readable index of all components and assets |
| `/r/<Component>.json` | One component's full record, **including its complete TypeScript and CSS source** |
| `/components/<Component>.html` | The human-readable page, pre-rendered |
| `/fui/<pack>/<assetId>.png` | The raw artwork |

Point an agent at the site root and it can discover and copy anything:

```
Use the UI library at https://fantasyuis.vercel.app.
Read https://fantasyuis.vercel.app/llms.txt first, then fetch
https://fantasyuis.vercel.app/r/<Component>.json for the source of anything you need.
```

## Adding new art

Drop a pack into `new_assets/`, describe it in `catalog/packs.mjs`, then:

```bash
npm run ingest   # optimise the art, compute 9-slice data, regenerate the manifest
npm run dev      # build the site and browse it at localhost:5173
```

`catalog/packs.mjs` is the source of truth: it maps each raw file to a canonical
id, category, tag list and 9-slice inset. See [CLAUDE.md](./CLAUDE.md) for the
full workflow and the architecture notes.

## Commands

```bash
npm install
npm run dev        # generate the site + start Vite on :5173
npm run build      # ingest → generate → static build into dist/
npm run typecheck  # tsc --noEmit
npm run ingest     # reprocess new_assets/ into public/fui/
npm run gen        # regenerate the site pages and machine-readable endpoints
npm run shots      # capture reference screenshots (needs the dev server running)
```

## How it works

Artwork is 9-sliced with CSS `border-image`, so a stone window frame painted at
747×642 stays crisp whether it wraps a 200px tooltip or a full-screen journal.
Every asset becomes three CSS custom properties at build time
(`--fui-img-*`, `--fui-slice-*`, `--fui-bw-*`); themes bind those to *semantic*
slots (`--fui-panel-*`, `--fui-btn-*`, `--fui-slot-*`); components only ever
reference the semantic slots. That indirection is why a component written once
works in every theme, and why adding a theme requires no component changes.

## Licence

The component code is yours to use however you like. The artwork in
`new_assets/` comes from third-party asset packs — check each pack's own licence
before shipping commercially.
