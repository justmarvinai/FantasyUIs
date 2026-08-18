# FantasyUIs — working notes

A component library and asset database for Fantasy/RPG web games, published as a
crawlable static site on Vercel. Vanilla TypeScript + CSS, zero runtime
dependencies.

## The recurring job

The owner drops new art packs into `new_assets/` and says *"I added more assets,
build me more components."* That workflow is:

1. **Look at the art first.** Never guess from filenames. Build a contact sheet
   and actually view it:
   ```bash
   pip install Pillow   # if needed
   python3 -c "
   from PIL import Image, ImageDraw
   import glob, math, os
   files = sorted(glob.glob('new_assets/<NewPack>/**/*.png', recursive=True))
   cols, cell = 5, 280
   rows = math.ceil(len(files)/cols)
   c = Image.new('RGBA', (cols*cell, rows*(cell+18)), (40,40,48,255))
   d = ImageDraw.Draw(c)
   for i,f in enumerate(files):
       im = Image.open(f).convert('RGBA'); im.thumbnail((cell-10, cell-10))
       c.alpha_composite(im, ((i%cols)*cell+(cell-im.width)//2, (i//cols)*(cell+18)+(cell-im.height)//2))
       d.text(((i%cols)*cell+4, (i//cols)*(cell+18)+cell+2), os.path.basename(f)[:34], fill=(255,255,120,255))
   c.convert('RGB').save('/tmp/sheet.jpg', quality=88)"
   ```
   Then read `/tmp/sheet.jpg` with the Read tool.

2. **Add the pack to `catalog/packs.mjs`.** This file is the source of truth: it
   maps every raw file to a canonical id, human name, category, tag list, output
   width cap and 9-slice inset. Slices are in *source* pixels — `ingest` rescales
   them when it downsizes an image. Large icon collections live in their own
   files (`catalog/icons-spell.mjs`, `catalog/icons-line.mjs`) and are spread
   into `packs.mjs`.

   Each pack declares `kind`: `theme` packs bind the semantic slots and get a
   theme CSS file; `icons` and `frames` packs are art collections with no theme
   of their own. The `kind` union in `src/data/assets.generated.ts` is derived
   from the packs themselves, so a new kind needs no edit to `ingest.mjs`.

   **Naming rule — icons are named for what they depict.** Source packs often
   ship art keyed to a character class (`Barbarian_12.png`, `FireMage_3.png`) or
   to nothing at all (`Icon_27.png`). Those names are meaningless to a consumer,
   so never carry them through. Look at the art and name it: `weapon-warhammer`,
   `fire-phoenix-rise`, `blood-necromancer`. Ids must be unique across the whole
   library, not just the pack.

   Per-asset `format` picks the encoding: `png` (default, keeps alpha), `webp`
   (opaque painted tiles — 235 icons went 175 MB → 7.9 MB this way), or `svg`
   (vector passthrough; ingest rewrites the fill to `currentColor` so the file
   works as a CSS mask).

3. `npm run ingest` — optimises art into `public/fui/<pack>/`, writes thumbnails,
   regenerates `src/data/assets.generated.ts` and the CSS variable layer.

4. **Write a theme file** if the pack is a new visual style: copy
   `src/lib/styles/theme-stone-vine.css` and rebind every semantic slot. A theme
   that fills in all the slots gets all 106 existing components for free.

5. **Build new components** for what the art newly makes possible, plus demos in
   `src/site/demos/`.

6. `npm run gen && npm run typecheck`, then screenshot and *look* at the result
   before claiming it works.

## Architecture

```
catalog/packs.mjs            asset catalog — ids, categories, tags, 9-slice insets
new_assets/                  raw drop zone (owner adds packs here)
public/fui/<pack>/           web-optimised art, committed
src/data/assets.generated.ts generated manifest (ids, sizes, slices)
src/lib/core/                dom helpers, base class, asset resolution
src/lib/styles/
  assets.css                 generated: --fui-img-* / --fui-slice-* / --fui-bw-*
  base.css                   design tokens, scoped reset, keyframes
  theme-*.css                semantic slot bindings, one per art pack
src/lib/components/          one <Name>.ts + <Name>.css per component
src/site/                    the documentation site (catalog, demos, chrome)
  demos/primitives.ts        Panel, Button, Icon, Slot, bars, inputs
  demos/kit.ts               TintFrame and the shared UI kit
  demos/widgets.ts           inventory, quests, shops, crafting
  demos/combat.ts            battle, live-ops and social
  demos/gacha.ts, roster.ts  collection, champions, gear, ascension
  demos/screens.ts           full-screen templates and feedback
scripts/ingest.mjs           new_assets/ → public/fui/ + manifests
scripts/generate.mjs         → static site, registry.json, llms.txt, /r/*.json
scripts/gen-lib.mjs          → src/lib/index.ts and styles/index.css
```

### The three-layer art indirection

This is the load-bearing idea. Do not shortcut it.

1. **Assets** — every image emits `--fui-img-<id>`, `--fui-slice-<id>`,
   `--fui-bw-<id>` (generated, never hand-edited).
2. **Themes** — bind those to *semantic* slots: `--fui-panel-fill-src`,
   `--fui-btn-bw`, `--fui-slot-frame-sl`, and so on.
3. **Components** — reference only the semantic slots.

A component written once therefore works in every theme, and a new theme costs
zero component changes.

## Conventions

- One component per file, `<Name>.ts` + `<Name>.css`, both dependency-free.
- Extend `FuiComponent`; expose `.el`; emit events with `this.emit('ns:verb', d)`.
- Register teardown with `this.onDestroy(fn)` — timers and rAF loops must stop.
- Never touch the global `document`; call `doc()` from `core/dom.ts`. The site
  pre-renders every demo in Node via linkedom, and that only works because of it.
- **Doc comments are load-bearing.** `scripts/generate.mjs` parses
  `export interface <Name>Options extends BaseOptions { … }` and turns the JSDoc
  above each field into the site's props table. Write them for the reader.
- CSS is namespaced `fui-<component>__<part>` and lives under `.fui`.
- After adding a component: `node scripts/gen-lib.mjs` (barrel + stylesheet),
  add a catalog entry with demos in `src/site/demos/`, then `npm run gen`.

## Traps worth remembering

- **`inset: 0` resolves against the padding box.** Put a `border-image` on an
  element and every absolutely-positioned child silently shifts inward by the
  border width. Every component therefore keeps its art on dedicated
  `__fill` / `__frame` layers and leaves the root border-less.
- **Themes must not bind to `.fui`.** Component roots carry that class, so a
  `.fui { --fui-accent: … }` rule re-declares the theme on every component and
  blocks inheritance from a `[data-fui-theme]` ancestor. Themes bind to
  `:root, [data-fui-theme='<id>']` only.
- **Custom properties substitute at the declaration site.** A `--fui-bw-*`
  computed on `:root` bakes in the root's `--fui-ui-scale`; overriding that scale
  on a descendant will *not* change it. Where a family of art needs its own
  scale (bars, slots, square buttons), the theme writes the calc out explicitly
  — `calc(30px * var(--fui-bar-scale))` — inside its own rule, which does
  re-resolve per subtree.
- **9-slice insets must fit.** If top + bottom slices exceed the element's
  height, `border-image` renders nothing at all. Bars and small buttons carry
  explicit `min-height` guards for this reason.
- **Monochrome art should be a mask, not an image.** `Glyph` sets
  `mask-image: var(--fui-img-<id>)` with `background-color: currentColor`, so
  one SVG serves every colour and state. Prefer that to shipping recoloured
  copies. The mask has no drop shadow of its own — use `filter: drop-shadow()`
  on the element for a halo.

- **Flat silhouettes 9-slice as a mask, not a border-image.** The Kenney frames
  are pure white with binary alpha, so `TintFrame` draws them with
  `-webkit-mask-box-image` over an arbitrary paint — 32 shapes × 4 centres × any
  colour from one file each. Chromium and Safari ship only the prefixed
  property (`CSS.supports('mask-border', …)` is still false), so the rule lives
  behind `@supports (-webkit-mask-box-image: url('a') 32 stretch)` with a plain
  white `border-image` as the fallback. Match the element's aspect ratio to the
  art's when masking a `contain` background, or the mask lands on the letterbox
  instead of the picture.

- **`mask-image: none` means *no mask*, i.e. a solid block.** Never write
  `mask: var(--fui-glyph-src, none)` for an optional glyph slot — with the
  variable unset the pseudo-element paints as a filled rectangle. Use
  `var(--fui-mask-none)` (a transparent gradient, declared in `base.css`).

- **The scoped reset is wrapped in `:where()` for a reason.** A plain
  `.fui button { margin: 0 }` scores (0,1,1) and silently beats a component's
  own `.fui-x__btn { margin-left: auto }` at (0,1,0). At zero specificity the
  reset can only fill in defaults nobody has set. Keep new reset rules inside
  `:where()`.

- **A keyframe must declare every property it fill-modes into.** `fui-pop` sets
  `opacity` at 0%, 60% *and* 100%; without the last one an element whose own
  rule sets `opacity: 0` interpolates back down to 0 after 60% and finishes
  invisible under `animation-fill-mode: forwards`.

- **Widths that depend on siblings must be measured, not divided.**
  `SegmentedControl`'s thumb and `TutorialTip`'s anchor both start from a CSS
  approximation (which is what the pre-rendered markup ships) and then correct
  themselves from a `ResizeObserver` on the root, which fires on mount, on
  resize and after late fonts land. `TutorialTip` also subtracts its own
  `getBoundingClientRect()`, because a `position: fixed` element is laid out
  against the nearest *transformed* ancestor when there is one — as there is
  inside every demo stage.
- **Demos are the code samples.** `scripts/generate.mjs` extracts each demo's own
  source with `Function.prototype.toString()`, so the snippet on the page can
  never drift from the code that ran. Write demos as idiomatic usage. Vite's SSR
  transform rewrites imports to `__vite_ssr_import_N__.X`; the extractor strips
  that, so keep an eye on it if the transform ever changes.

## Commands

```bash
npm run dev        # gen + Vite on :5173
npm run build      # ingest → gen → static build into dist/
npm run typecheck  # tsc --noEmit — must stay clean
npm run ingest     # reprocess new_assets/
npm run gen        # regenerate site + registry.json + llms.txt + /r/*.json
npm run shots      # reference screenshots (dev server must be running)
```

Chromium for screenshots lives at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; pass it as
`executablePath` and add `--no-sandbox`.

## Deployment

Vercel, static output in `dist/`. `vercel.json` sets CORS on `/registry.json`,
`/llms.txt`, `/r/*`, `/fui/*` and `/dist/*` so games and agents on other origins
can fetch them. The build runs `ingest` too, so a deploy is reproducible from
`new_assets/` + `catalog/packs.mjs` alone.

## Git

Develop on `claude/fantasyuis-asset-library-19h9eq`. Generated site files
(`/components/`, `/index.html`, `/start.html`, `/assets.html`, `public/r/`,
`public/registry.json`, `public/llms.txt`) are gitignored — they are rebuilt on
every deploy. Ingest output (`public/fui/`, `src/data/assets.generated.ts`) *is*
committed so a fresh clone runs without reprocessing every PNG.
