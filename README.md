# FantasyUIs

**A growing database of ready-to-use UI components for Fantasy & RPG web games.**

142 components built from 494 art assets across 2 swappable themes, 2 icon
collections and a tintable ornament set. Vanilla TypeScript and CSS — zero
runtime dependencies, no framework, no build plugin. Drops into any Vite
project, React or not, or straight over a Phaser canvas as a DOM layer.

🔗 **[fantasy-u-is.vercel.app](https://fantasy-u-is.vercel.app)**

---

## What's in it

| Group | Components |
| --- | --- |
| **Surfaces & Framing** | Panel, Frame, Divider, Banner, TintFrame, Carousel, **Scroll**, **OrnateHeader**, **SceneBackdrop** |
| **Controls** | Button, Tabs, Toggle, Slider, Select, TextInput, ContextMenu, SegmentedControl, NumberStepper, Accordion, ConfirmSlider, **CheckList**, **RangeSlider**, **KeybindInput**, RadialMenu, FilterBar, SortBar, SideNav |
| **Data display** | Icon, StatBar, Slot, Portrait, Tooltip, Badge, ProgressRing, StatChip, **Sparkline**, **Gauge**, **Timeline**, ItemCard, Glyph, CompareStats, StatRadar, HealthPips |
| **Game widgets** | InventoryGrid, ActionBar, UnitFrame, PartyFrame, BuffBar, CastBar, DialogueBox, QuestLog, QuestTracker, ShopPanel, LootWindow, CraftingPanel, SkillTree, StatsPanel, Paperdoll, Minimap, CurrencyBar, Leaderboard, WorldMap, CodexEntry, AchievementList, PatchNotes, **TradePanel**, **QuestBoard**, **Compass** |
| **Combat & battle** | BossHealthBar, ShieldBar, WaveTracker, DamageMeter, BattleLog, ComboCounter, ArenaMatchup, MatchHistory, LootRoll, **TargetSelector**, **ThreatMeter** |
| **Collection & live-ops** | PityCounter, BannerCarousel, TopBar, VipProgress, EventBanner, StreakMeter, StarRating, AffinityBadge, ChampionCard, SummonResult, TeamSlots, TurnMeter, EnergyBar, RewardTrack, DailyRewards, UpgradePanel, StageSelect, OfferCard, CountdownTimer, BottomNav, BattleControls, TierBadge, ChampionList, SkillCard, MasteryGrid, ArtifactCard, ArtifactSet, RankUpPanel, ShardCounter, PowerRating, FormationGrid, SocketPanel, CollectionProgress, **FusionPanel**, **BondMeter** |
| **Social & clan** | ClanCard, MailInbox, ChatPanel, FriendList, LeaderboardPodium, **ClanRoster**, **PlayerProfile** |
| **Feedback** | LoadingDots, EmptyState, TutorialTip, RewardPopup, Ticker, **ConnectionStatus**, **SpeechBubble**, ToastStack, FloatingText, AchievementPopup |
| **Screens & overlays** | Modal, **TitleGate**, **StorySlide**, MainMenu, PauseMenu, SettingsScreen, CharacterSelect, LoadingScreen, ResultScreen, LevelUpModal, HUD |

Bold marks the newest additions.

These are not static skins. The inventory grid does real drag-and-drop and
stacking, the action bar runs cooldown sweeps and greys out what you cannot
afford, the dialogue box types text out and branches, the skill tree gates nodes
behind prerequisites and draws its own dependency lines, and the turn meter
reorders itself live as each unit's speed fills its bar.

Where a rule protects the player it lives in the component, not in the code
that calls it. `TradePanel` clears both accepts on any change to the offer,
`TargetSelector` says out loud that a taunt will eat your click, `QuestBoard`
labels a full board instead of failing the accept on the server, `FusionPanel`
counts the slots you are still missing rather than going quietly grey, and
`TitleGate` refuses a full realm with a reason attached.

The **Collection & live-ops**, **Combat** and **Social** sets target browser and
mobile squad-RPGs of the Raid: Shadow Legends shape — gacha banners with visible
mercy counters, champion rosters that filter and sort, gear with substat roll
pips, mastery boards, ascension with fodder slots, multi-phase clan bosses with
damage meters, arena matchups, VIP ladders, login streaks, clan browsers, mail
and chat.

## Art

| Collection | What's in it |
| --- | --- |
| **Spell & Skill Icons** (`spell-icons`) | 235 painted square ability icons — runes and sigils, melee arts, earth and crystal, fire and inferno, beasts and ranged weapons, gadgets, blood magic |
| **Line Glyphs** (`line-glyphs`) | 40 single-colour vector glyphs for interface chrome, drawn through a CSS mask so one file tints to any colour |
| **Ornate Frames** (`deco-frames`) | 128 pixel-art frames (32 shapes × 4 centre treatments) plus 12 dividers, drawn as 9-sliced *masks* so one file renders in any colour |

Icons are a general collection addressed by id — `fire-phoenix-rise`,
`glyph-crossed-swords`, `blood-necromancer` — and work from any theme. They are
named for what they depict, never for a character class.

The frames are the same idea taken further. Their art is a pure white
silhouette, so `TintFrame` 9-slices it as a `mask-border` and paints the colour
underneath. One 400-byte PNG is therefore a grey common frame, a purple epic
frame and a gold legendary frame at once:

```ts
new TintFrame({ shape: 7, rarity: 'legendary', content: card });
new TintFrame({ shape: 7, fill: 'scrim', tint: 'linear-gradient(160deg,#ffd98a,#7a3d05)' });
```

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
<link rel="stylesheet" href="https://fantasy-u-is.vercel.app/dist/fantasyuis.css" />
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
| [`/llms.txt`](https://fantasy-u-is.vercel.app/llms.txt) | The whole library summarised for an LLM — every component, its purpose, its options, every asset id |
| [`/registry.json`](https://fantasy-u-is.vercel.app/registry.json) | Machine-readable index of all components and assets |
| `/r/<Component>.json` | One component's full record, **including its complete TypeScript and CSS source** |
| `/components/<Component>.html` | The human-readable page, pre-rendered |
| `/fui/<pack>/<assetId>.<ext>` | The raw artwork — `.png`, `.webp` or `.svg` depending on the asset |

Point an agent at the site root and it can discover and copy anything:

```
Use the UI library at https://fantasy-u-is.vercel.app.
Read https://fantasy-u-is.vercel.app/llms.txt first, then fetch
https://fantasy-u-is.vercel.app/r/<Component>.json for the source of anything you need.
Copy every path listed in that record's "copy" field — components compose each
other, so a component's dependencies have to come along with it.
```

### Copying a component correctly

Most components are self-contained, but not all: `ChampionCard` composes
`StarRating` and `AffinityBadge`, and `TeamSlots` composes all three. Every
`/r/<Component>.json` record therefore carries the answer rather than leaving it
to be discovered by a failing build:

```jsonc
// GET /r/ChampionCard.json
{
  "dependencies": ["AffinityBadge", "StarRating"],
  "copy": [
    "src/lib/core/component.ts",
    "src/lib/core/dom.ts",
    "src/lib/components/AffinityBadge.ts",  "src/lib/components/AffinityBadge.css",
    "src/lib/components/StarRating.ts",     "src/lib/components/StarRating.css",
    "src/lib/components/ChampionCard.ts",   "src/lib/components/ChampionCard.css"
  ]
}
```

Imports between components are plain relative paths, so dropping that list into a
flat `src/ui/` folder compiles with no rewriting.

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
npm run audit      # library-wide invariants tsc cannot see
npm run smoke      # load every generated page in Chromium (needs the dev server)
```

`audit` is part of `build`, so a deploy cannot ship a component that is missing
from the barrel, reaches for the global `document`, leaks a timer, emits an
un-namespaced event, or references art that is not in the manifest.

## How it works

Artwork is 9-sliced with CSS `border-image`, so a stone window frame painted at
747×642 stays crisp whether it wraps a 200px tooltip or a full-screen journal.
Where the art is a flat silhouette it is 9-sliced as a `mask-border` instead,
which is what lets one ornament render in any colour.
Every asset becomes three CSS custom properties at build time
(`--fui-img-*`, `--fui-slice-*`, `--fui-bw-*`); themes bind those to *semantic*
slots (`--fui-panel-*`, `--fui-btn-*`, `--fui-slot-*`); components only ever
reference the semantic slots. That indirection is why a component written once
works in every theme, and why adding a theme requires no component changes.

## Licence

The component code is yours to use however you like. The artwork in
`new_assets/` comes from third-party asset packs — check each pack's own licence
before shipping commercially.
