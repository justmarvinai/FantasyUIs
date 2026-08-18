/**
 * FantasyUIs — ornamental frame collection (140 assets, CC0).
 *
 * Kenney's Fantasy UI Borders: 32 border designs, each shipped in four fills,
 * plus 12 dividers. Everything is pure white on transparent at 96x96, which is
 * exactly what a CSS mask wants — `TintFrame` draws them through `mask-border`
 * so one file renders in any colour the UI needs.
 *
 * The art is pixel work on a 32px grid, so it is never resized: at
 * `border-width: 32px` the corners land 1:1 and stay crisp.
 *
 * Only the `Double` (96x96) set is ingested; `Default` is the same art at half
 * resolution and would only blur when scaled back up.
 */

const DIR = 'PNG/Double';

/** Shape descriptors, indexed by the pack's own border number (000-031). */
const SHAPES = [
  'corner-blocks', 'rounded-notch', 'interlock', 'lattice',
  'rails', 'stepped', 'octagon', 'corner-dots',
  'speckled', 'pin-corners', 'bracket', 'tab-corners',
  'keyed', 'hook-corners', 'inset-double', 'plain',
  'clipped', 'stud-corners', 'flared', 'chamfer',
  'blocky', 'cross', 'beveled', 'notch-wide',
  'woven', 'knotwork', 'crosshead', 'stepped-wide',
  'toothed', 'castellated', 'banded', 'shouldered',
];

/** The four fills each border ships in, and what each is good for. */
const FILLS = [
  {
    dir: 'Border',
    file: (n) => `panel-border-${n}.png`,
    suffix: '',
    label: '',
    tags: ['hollow', 'outline', 'overlay'],
    note: 'hollow',
  },
  {
    dir: 'Transparent center',
    file: (n) => `panel-transparent-center-${n}.png`,
    suffix: '-scrim',
    label: ' (Scrim)',
    tags: ['scrim', 'panel', 'translucent'],
    note: 'solid edge, half-opacity centre — reads over game art',
  },
  {
    dir: 'Panel',
    file: (n) => `panel-${n}.png`,
    suffix: '-solid',
    label: ' (Solid)',
    tags: ['solid', 'panel', 'filled'],
    note: 'fully opaque — a filled shape when tinted',
  },
  {
    dir: 'Transparent border',
    file: (n) => `panel-transparent-border-${n}.png`,
    suffix: '-soft',
    label: ' (Soft Edge)',
    tags: ['soft', 'panel', 'faded-edge'],
    note: 'half-opacity edge, solid centre',
  },
];

const frames = SHAPES.flatMap((shape, i) => {
  const n = String(i).padStart(3, '0');
  const num = String(i + 1).padStart(2, '0');
  return FILLS.map((fill) => ({
    src: `${DIR}/${fill.dir}/${fill.file(n)}`,
    id: `deco-frame-${num}${fill.suffix}`,
    name: `Ornate Frame ${num}${fill.label}`,
    category: 'frame',
    // Pixel art on a 32px grid: never resize, and slice on the grid.
    maxW: 96,
    slice: [32, 32, 32, 32],
    tags: [
      'frame', 'border', 'ornament', 'panel', 'tintable', 'mask', 'pixel',
      shape, ...fill.tags,
    ],
  }));
});

const dividers = [
  ...Array.from({ length: 6 }, (_, i) => ({
    src: `${DIR}/Divider/divider-${String(i).padStart(3, '0')}.png`,
    id: `deco-divider-${String(i + 1).padStart(2, '0')}`,
    name: `Ornate Divider ${i + 1}`,
    category: 'decor',
    maxW: 192,
    // Horizontal rule: only the ends carry ornament.
    slice: [0, 64, 0, 64],
    tags: ['divider', 'separator', 'rule', 'ornament', 'tintable', 'mask', 'pixel'],
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    src: `${DIR}/Divider Fade/divider-fade-${String(i).padStart(3, '0')}.png`,
    id: `deco-divider-fade-${String(i + 1).padStart(2, '0')}`,
    name: `Ornate Divider ${i + 1} (Fade)`,
    category: 'decor',
    maxW: 192,
    slice: [0, 64, 0, 64],
    tags: ['divider', 'separator', 'rule', 'ornament', 'fade', 'tintable', 'mask', 'pixel'],
  })),
];

export const KENNEY_FRAMES = [...frames, ...dividers];
