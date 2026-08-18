/**
 * FantasyUIs — Asset Catalog (source of truth)
 * ---------------------------------------------------------------------------
 * Maps raw files dropped into `new_assets/` onto canonical, web-ready assets.
 *
 * `slice` is the 9-slice inset in SOURCE pixels, ordered [top, right, bottom, left]
 * (same order as CSS). `scripts/ingest.mjs` rescales it automatically when an
 * image is downsized, and writes the final numbers into the generated manifest.
 *
 * `slice: null` means the asset is not 9-sliceable (round shapes, icons,
 * silhouettes, scene art) and should be drawn at its natural aspect ratio.
 *
 * To add a pack: drop it in `new_assets/`, add an entry below, run `npm run ingest`.
 */

/** @typedef {'panel'|'frame'|'button'|'slot'|'bar'|'icon'|'glyph'|'banner'|'background'|'decor'|'silhouette'} AssetCategory */

import { SPELL_ICONS } from './icons-spell.mjs';
import { LINE_GLYPHS } from './icons-line.mjs';

export const packs = [
  {
    id: 'stone-vine',
    name: 'Stone & Vine',
    kind: 'theme',
    dir: 'GUI_Fantasy_RPG_Kit',
    blurb:
      'Carved grey stone framing with celtic vine ornaments, teal button faces and painted RPG item icons. Reads as adventure, exploration and town UI.',
    accent: '#6fb3a8',
    assets: [
      // ── Panels & windows ────────────────────────────────────────────────
      { src: 'pop-up-window-01-frame.png', id: 'panel-stone',        name: 'Stone Window Frame',        category: 'panel',      slice: [96, 96, 96, 96],    maxW: 900, tags: ['window', 'dialog', 'modal', 'stone', 'frame'] },
      { src: 'pop-up-window-01.png',       id: 'panel-stone-fill',   name: 'Stone Window Fill',         category: 'panel',      slice: [60, 60, 60, 60],    maxW: 900, tags: ['window', 'fill', 'slate', 'background'] },
      { src: 'pop-up-window-02-frame.png', id: 'panel-arch',         name: 'Arched Window Frame',       category: 'panel',      slice: [150, 80, 110, 80],  maxW: 900, tags: ['window', 'arch', 'ornate', 'dialog', 'frame'] },
      { src: 'pop-up-window-02.png',       id: 'panel-arch-fill',    name: 'Arched Window Fill',        category: 'panel',      slice: [60, 60, 60, 60],    maxW: 900, tags: ['window', 'fill', 'slate', 'background'] },

      // ── Buttons ─────────────────────────────────────────────────────────
      { src: 'button-1.png',   id: 'btn-stone-wide', name: 'Stone Button (Wide)',   category: 'button', slice: [42, 58, 46, 58], maxW: 512, tags: ['button', 'teal', 'primary'] },
      { src: 'button-2.png',   id: 'btn-stone-med',  name: 'Stone Button (Medium)', category: 'button', slice: [42, 56, 46, 56], maxW: 320, tags: ['button', 'teal', 'compact'] },
      { src: 'button-3.png',   id: 'btn-stone-long', name: 'Stone Button (Long)',   category: 'button', slice: [48, 64, 52, 64], maxW: 720, tags: ['button', 'teal', 'menu', 'wide'] },
      { src: 'back-btn.png',     id: 'btn-icon-back',     name: 'Back Button',     category: 'button', slice: null, maxW: 186, tags: ['icon-button', 'back', 'navigation', 'arrow'] },
      { src: 'close-btn.png',    id: 'btn-icon-close',    name: 'Close Button',    category: 'button', slice: null, maxW: 186, tags: ['icon-button', 'close', 'dismiss', 'x'] },
      { src: 'settings-btn.png', id: 'btn-icon-settings', name: 'Settings Button', category: 'button', slice: null, maxW: 186, tags: ['icon-button', 'settings', 'options', 'gear', 'cog'] },

      // ── Slots ───────────────────────────────────────────────────────────
      { src: 'inventory-slot-big-frame.png',    id: 'slot-stone-lg',      name: 'Inventory Slot L (Frame)', category: 'slot', slice: [46, 46, 46, 46], maxW: 274, tags: ['inventory', 'slot', 'large', 'vine'] },
      { src: 'inventory-slot-big.png',          id: 'slot-stone-lg-fill', name: 'Inventory Slot L (Fill)',  category: 'slot', slice: [40, 40, 40, 40], maxW: 271, tags: ['inventory', 'slot', 'fill'] },
      { src: 'inventory-slot-medium-frame.png', id: 'slot-stone-md',      name: 'Inventory Slot M (Frame)', category: 'slot', slice: [40, 40, 40, 40], maxW: 229, tags: ['inventory', 'slot', 'medium', 'vine'] },
      { src: 'inventory-slot-medium.png',       id: 'slot-stone-md-fill', name: 'Inventory Slot M (Fill)',  category: 'slot', slice: [30, 30, 30, 30], maxW: 188, tags: ['inventory', 'slot', 'fill'] },
      { src: 'inventory-slot-small-frame.png',  id: 'slot-stone-sm',      name: 'Inventory Slot S (Frame)', category: 'slot', slice: [34, 34, 34, 34], maxW: 188, tags: ['inventory', 'slot', 'small'] },
      { src: 'inventory-slot-small.png',        id: 'slot-stone-sm-fill', name: 'Inventory Slot S (Fill)',  category: 'slot', slice: [26, 26, 26, 26], maxW: 153, tags: ['inventory', 'slot', 'fill'] },
      { src: 'slot-long.png',                   id: 'slot-stone-long',    name: 'Long Slot / Input Track',  category: 'slot', slice: [40, 54, 42, 54], maxW: 733, tags: ['slot', 'input', 'field', 'row', 'track'] },

      // ── Bars ────────────────────────────────────────────────────────────
      { src: 'hp-bar.png',           id: 'bar-track-stone',   name: 'Stone Bar Track',      category: 'bar', slice: [30, 62, 32, 62], maxW: 627, tags: ['bar', 'track', 'progress', 'health'] },
      { src: 'hp-bar-1.png',         id: 'bar-track-stone-1', name: 'Stone Bar Track II',   category: 'bar', slice: [30, 62, 32, 62], maxW: 627, tags: ['bar', 'track', 'progress'] },
      { src: 'hp-bar-2.png',         id: 'bar-track-stone-2', name: 'Stone Bar Track III',  category: 'bar', slice: [30, 58, 32, 58], maxW: 598, tags: ['bar', 'track', 'progress'] },
      { src: 'hp-bar-3.png',         id: 'bar-track-stone-3', name: 'Stone Bar Track IV',   category: 'bar', slice: [30, 62, 32, 62], maxW: 627, tags: ['bar', 'track', 'progress'] },
      { src: 'hp-bar-fill.png',      id: 'bar-fill-health',   name: 'Health Fill (Green)',  category: 'bar', slice: [0, 28, 0, 28],   maxW: 532, tags: ['bar', 'fill', 'health', 'hp', 'green'] },
      { src: 'mana-bar-fill.png',    id: 'bar-fill-mana',     name: 'Mana Fill (Arcane)',   category: 'bar', slice: [0, 28, 0, 28],   maxW: 536, tags: ['bar', 'fill', 'mana', 'mp', 'blue', 'purple'] },
      { src: 'stamina-bar-fill.png', id: 'bar-fill-stamina',  name: 'Stamina Fill (Gold)',  category: 'bar', slice: [0, 28, 0, 28],   maxW: 533, tags: ['bar', 'fill', 'stamina', 'xp', 'gold', 'yellow'] },

      // ── Decor & backdrop ────────────────────────────────────────────────
      { src: 'devider.png',    id: 'divider-vine',   name: 'Vine Divider',      category: 'decor',      slice: [0, 200, 0, 200], maxW: 904,  tags: ['divider', 'separator', 'rule', 'vine', 'ornament'] },
      { src: 'bar-bottle.png', id: 'orb-arcane',     name: 'Arcane Orb Vial',   category: 'decor',      slice: null,             maxW: 244,  tags: ['orb', 'vial', 'bottle', 'decor', 'endcap'] },
      { src: 'background.png', id: 'bg-scene-dark',  name: 'Dark Scene Backdrop', category: 'background', slice: null,           maxW: 1920, tags: ['background', 'backdrop', 'scene', 'vignette', 'menu'] },

      // ── Item icons ──────────────────────────────────────────────────────
      { src: 'heart-icon.png',   id: 'icon-heart',  name: 'Heart',        category: 'icon', slice: null, maxW: 168, tags: ['icon', 'heart', 'health', 'life', 'hp'] },
      { src: 'coins-icon.png',   id: 'icon-coins',  name: 'Gold Coins',   category: 'icon', slice: null, maxW: 168, tags: ['icon', 'coins', 'gold', 'currency', 'money'] },
      { src: 'sack-icon.png',    id: 'icon-sack',   name: 'Coin Sack',    category: 'icon', slice: null, maxW: 168, tags: ['icon', 'sack', 'bag', 'loot', 'currency'] },
      { src: 'chest-icon.png',   id: 'icon-chest',  name: 'Treasure Chest', category: 'icon', slice: null, maxW: 168, tags: ['icon', 'chest', 'loot', 'reward', 'treasure'] },
      { src: 'key-icon.png',     id: 'icon-key',    name: 'Brass Key',    category: 'icon', slice: null, maxW: 168, tags: ['icon', 'key', 'unlock', 'quest'] },
      { src: 'potion-icon.png',  id: 'icon-potion', name: 'Potion Flask', category: 'icon', slice: null, maxW: 168, tags: ['icon', 'potion', 'flask', 'consumable', 'elixir'] },
      { src: 'sword-icon.png',   id: 'icon-sword',  name: 'Iron Sword',   category: 'icon', slice: null, maxW: 168, tags: ['icon', 'sword', 'weapon', 'attack', 'melee'] },
      { src: 'shield-icon.png',  id: 'icon-shield', name: 'Wooden Shield', category: 'icon', slice: null, maxW: 168, tags: ['icon', 'shield', 'defense', 'armor', 'block'] },
      { src: 'star-icon.png',    id: 'icon-star',   name: 'Gold Star',    category: 'icon', slice: null, maxW: 168, tags: ['icon', 'star', 'rating', 'favourite', 'reward'] },
      { src: 'papyrus-icon.png', id: 'icon-scroll', name: 'Map Scroll',   category: 'icon', slice: null, maxW: 200, tags: ['icon', 'scroll', 'map', 'quest', 'papyrus', 'lore'] },
    ],
  },

  {
    id: 'dark-ember',
    name: 'Dark Ember',
    kind: 'theme',
    dir: 'Dark_GUI_Parts',
    blurb:
      'Thin bronze art-deco framing over black leather, with glossy blood-red buttons and glowing spell icons. Reads as combat, dark fantasy and endgame UI.',
    accent: '#c2764a',
    assets: [
      // ── Panels & backdrops ──────────────────────────────────────────────
      { src: 'Gui_parts/bar_ready.png',       id: 'panel-tall-ornate', name: 'Ornate Panel (Tall)',   category: 'panel',      slice: [170, 170, 170, 170], maxW: 1024, tags: ['panel', 'window', 'ornate', 'tall', 'sidebar'] },
      { src: 'Gui_parts/barmid_ready.png',    id: 'panel-wide-ornate', name: 'Ornate Panel (Wide)',   category: 'panel',      slice: [140, 140, 140, 140], maxW: 1024, tags: ['panel', 'window', 'ornate', 'wide', 'dialog'] },
      { src: 'Gui_parts/big_background.png',  id: 'bg-tall',           name: 'Leather Backdrop (Tall)', category: 'background', slice: [60, 60, 60, 60],  maxW: 800,  tags: ['background', 'leather', 'texture', 'fill'] },
      { src: 'Gui_parts/mid_background.png',  id: 'bg-wide',           name: 'Leather Backdrop (Wide)', category: 'background', slice: [60, 60, 60, 60],  maxW: 1024, tags: ['background', 'leather', 'texture', 'fill'] },
      { src: 'Gui_parts/Mini_background.png', id: 'bg-tile-sm',        name: 'Leather Tile (Small)',    category: 'background', slice: [24, 24, 24, 24],  maxW: 256,  tags: ['background', 'tile', 'texture', 'fill', 'slot'] },

      // ── Frames (overlay only, hollow centre) ────────────────────────────
      { src: 'Gui_parts/Frame_big.png',    id: 'frame-tall',      name: 'Bronze Frame (Tall)',   category: 'frame', slice: [130, 130, 130, 130], maxW: 800,  tags: ['frame', 'border', 'bronze', 'tall', 'deco'] },
      { src: 'Gui_parts/Frame_mid.png',    id: 'frame-wide',      name: 'Bronze Frame (Wide)',   category: 'frame', slice: [100, 100, 100, 100], maxW: 1024, tags: ['frame', 'border', 'bronze', 'wide', 'deco'] },
      { src: 'Gui_parts/Frame_mid_2.png',  id: 'frame-wide-alt',  name: 'Bronze Frame (Wide II)', category: 'frame', slice: [100, 100, 100, 100], maxW: 1024, tags: ['frame', 'border', 'bronze', 'wide', 'deco'] },
      { src: 'Gui_parts/Mini_frame0.png',  id: 'frame-sm-thin',   name: 'Small Frame (Thin)',    category: 'frame', slice: [26, 26, 26, 26], maxW: 256, tags: ['frame', 'border', 'small', 'thin', 'slot'] },
      { src: 'Gui_parts/Mini_frame1.png',  id: 'frame-sm-double', name: 'Small Frame (Double)',  category: 'frame', slice: [36, 36, 36, 36], maxW: 256, tags: ['frame', 'border', 'small', 'double', 'slot'] },
      { src: 'Gui_parts/Mini_frame2.png',  id: 'frame-sm-bevel',  name: 'Small Frame (Bevel)',   category: 'frame', slice: [36, 36, 36, 36], maxW: 256, tags: ['frame', 'border', 'small', 'bevel', 'slot'] },
      { src: 'Gui_parts/big_roundframe.png',        id: 'frame-round-lg',      name: 'Round Frame (Large)',  category: 'frame', slice: null, maxW: 512, tags: ['frame', 'round', 'circle', 'portrait', 'avatar'] },
      { src: 'Gui_parts/lil_roundframe.png',        id: 'frame-round-sm',      name: 'Round Frame (Small)',  category: 'frame', slice: null, maxW: 128, tags: ['frame', 'round', 'circle', 'skill', 'ability'] },
      { src: 'Gui_parts/lil_roundframe_ready.png',  id: 'frame-round-sm-lit',  name: 'Round Frame (Lit)',    category: 'frame', slice: null, maxW: 128, tags: ['frame', 'round', 'ready', 'active', 'skill'] },
      { src: 'Gui_parts/lil_roundframe_ready2.png', id: 'frame-round-sm-icon', name: 'Round Frame (Sword)',  category: 'frame', slice: null, maxW: 128, tags: ['frame', 'round', 'skill', 'attack', 'sword'] },
      { src: 'Gui_parts/lil_roundbackground.png',   id: 'bg-round-sm',         name: 'Round Backdrop',       category: 'background', slice: null, maxW: 128, tags: ['background', 'round', 'circle', 'skill', 'fill'] },

      // ── Buttons ─────────────────────────────────────────────────────────
      { src: 'Gui_parts/button.png',            id: 'btn-ember-wide',      name: 'Ember Button (Wide)',     category: 'button', slice: [46, 56, 46, 56], maxW: 512, tags: ['button', 'red', 'primary', 'wide'] },
      { src: 'Gui_parts/button_ready_on.png',   id: 'btn-ember-wide-on',   name: 'Ember Button (Active)',   category: 'button', slice: [48, 58, 48, 58], maxW: 512, tags: ['button', 'red', 'active', 'hover', 'state'] },
      { src: 'Gui_parts/button_ready_off.png',  id: 'btn-ember-wide-off',  name: 'Ember Button (Idle)',     category: 'button', slice: [48, 58, 48, 58], maxW: 512, tags: ['button', 'red', 'idle', 'state'] },
      { src: 'Gui_parts/button_frame.png',      id: 'btn-ember-frame',     name: 'Ember Button (Empty)',    category: 'button', slice: [44, 50, 44, 50], maxW: 512, tags: ['button', 'frame', 'outline', 'ghost', 'secondary'] },
      { src: 'Gui_parts/button2.png',           id: 'btn-ember-square',    name: 'Ember Square Button',     category: 'button', slice: [44, 44, 44, 44], maxW: 256, tags: ['button', 'square', 'red', 'icon-button'] },
      { src: 'Gui_parts/button2_ready_on.png',  id: 'btn-ember-square-on', name: 'Ember Square (Active)',   category: 'button', slice: [48, 48, 48, 48], maxW: 256, tags: ['button', 'square', 'active', 'state'] },
      { src: 'Gui_parts/button2_ready_off.png', id: 'btn-ember-square-off', name: 'Ember Square (Idle)',    category: 'button', slice: [48, 48, 48, 48], maxW: 256, tags: ['button', 'square', 'idle', 'state'] },
      { src: 'Gui_parts/button3_ready.png',     id: 'btn-ember-round',     name: 'Ember Round Button',      category: 'button', slice: null, maxW: 128, tags: ['button', 'round', 'circle', 'icon-button'] },

      // ── Bars & banners ──────────────────────────────────────────────────
      { src: 'Gui_parts/Hp_frame.png', id: 'bar-track-ember', name: 'Ember Bar Track', category: 'bar', slice: [16, 26, 16, 26], maxW: 1024, tags: ['bar', 'track', 'thin', 'health', 'progress'] },
      { src: 'Gui_parts/Hp_line.png',  id: 'bar-fill-ember',  name: 'Ember Fill (Red)', category: 'bar', slice: [14, 22, 14, 22], maxW: 1024, tags: ['bar', 'fill', 'red', 'health', 'hp', 'blood'] },
      { src: 'Gui_parts/name_bar.png',  id: 'banner-arrow', name: 'Name Banner (Arrow)', category: 'banner', slice: [40, 150, 40, 40], maxW: 1024, tags: ['banner', 'nameplate', 'label', 'arrow', 'ribbon'] },
      { src: 'Gui_parts/name_bar2.png', id: 'banner-plain', name: 'Name Banner (Plain)', category: 'banner', slice: [40, 40, 40, 40],  maxW: 1024, tags: ['banner', 'nameplate', 'label', 'header'] },
      { src: 'Gui_parts/name_bar3.png', id: 'banner-dark',  name: 'Name Banner (Dark)',  category: 'banner', slice: [40, 40, 40, 40],  maxW: 1024, tags: ['banner', 'nameplate', 'label', 'header', 'subtle'] },

      // ── Silhouettes ─────────────────────────────────────────────────────
      { src: 'Gui_parts/warrior_silhouette_man.png',   id: 'silhouette-warrior-m', name: 'Warrior Silhouette (M)', category: 'silhouette', slice: null, maxW: 700, tags: ['silhouette', 'character', 'warrior', 'class', 'select', 'paperdoll'] },
      { src: 'Gui_parts/warrior_silhouette_woman.png', id: 'silhouette-warrior-f', name: 'Warrior Silhouette (F)', category: 'silhouette', slice: null, maxW: 700, tags: ['silhouette', 'character', 'warrior', 'class', 'select', 'paperdoll'] },

      // ── Icons ───────────────────────────────────────────────────────────
      { src: 'RPG_icons/armor_icon.png',  id: 'icon-armor',      name: 'Plate Armor',  category: 'icon', slice: null, maxW: 256, tags: ['icon', 'armor', 'chest', 'equipment', 'defense'] },
      { src: 'RPG_icons/weapon_icon.png', id: 'icon-axe',        name: 'Battle Axe',   category: 'icon', slice: null, maxW: 256, tags: ['icon', 'axe', 'weapon', 'equipment', 'attack'] },
      { src: 'RPG_icons/stoune_icon.png', id: 'icon-rune-stone', name: 'Rune Stone',   category: 'icon', slice: null, maxW: 256, tags: ['icon', 'rune', 'stone', 'gem', 'craft', 'material'] },

      { src: 'RPG_icons/skill_icon_01.png',      id: 'skill-firehand-sq',    name: 'Firehand (Framed)',    category: 'icon', slice: null, maxW: 256, tags: ['skill', 'spell', 'fire', 'ability', 'framed'] },
      { src: 'RPG_icons/skill_icon_01_nobg.png', id: 'skill-firehand',       name: 'Firehand',             category: 'icon', slice: null, maxW: 256, tags: ['skill', 'spell', 'fire', 'ability', 'cutout'] },
      { src: 'RPG_icons/skill_icon_02.png',      id: 'skill-comet-sq',       name: 'Comet Slash (Framed)', category: 'icon', slice: null, maxW: 256, tags: ['skill', 'spell', 'comet', 'slash', 'ability', 'framed'] },
      { src: 'RPG_icons/skill_icon_02_nobg.png', id: 'skill-comet',          name: 'Comet Slash',          category: 'icon', slice: null, maxW: 256, tags: ['skill', 'spell', 'comet', 'slash', 'ability', 'cutout'] },
      { src: 'RPG_icons/skill_icon_03.png',      id: 'skill-soulskull-sq',   name: 'Soul Skull (Framed)',  category: 'icon', slice: null, maxW: 256, tags: ['skill', 'spell', 'shadow', 'skull', 'curse', 'framed'] },
      { src: 'RPG_icons/skill_icon_03_nobg.png', id: 'skill-soulskull',      name: 'Soul Skull',           category: 'icon', slice: null, maxW: 256, tags: ['skill', 'spell', 'shadow', 'skull', 'curse', 'cutout'] },
      { src: 'RPG_icons/skill_icon_04.png',      id: 'skill-thunderhammer-sq', name: 'Thunder Hammer (Framed)', category: 'icon', slice: null, maxW: 256, tags: ['skill', 'spell', 'lightning', 'hammer', 'holy', 'framed'] },
      { src: 'RPG_icons/skill_icon_04_nobg.png', id: 'skill-thunderhammer',  name: 'Thunder Hammer',       category: 'icon', slice: null, maxW: 256, tags: ['skill', 'spell', 'lightning', 'hammer', 'holy', 'cutout'] },
    ],
  },

  {
    id: 'spell-icons',
    name: 'Spell & Skill Icons',
    kind: 'icons',
    dir: 'Skill_Spell_Icons',
    blurb:
      'A general collection of 235 painted ability icons — runes and sigils, melee arts, earth and crystal, fire and inferno, beasts and ranged weapons, gadgets, and blood magic. Square, full-bleed and built for skill buttons, champion abilities and mastery grids.',
    accent: '#d98f4a',
    assets: SPELL_ICONS,
  },

  {
    id: 'line-glyphs',
    name: 'Line Glyphs',
    kind: 'icons',
    dir: 'Demo_Icon_Assets',
    blurb:
      'Forty single-colour vector glyphs for interface chrome — stats, currencies, nav, status. Shipped as SVG and drawn through a CSS mask, so one file tints to any colour the UI needs.',
    accent: '#9ec5d8',
    assets: LINE_GLYPHS,
  },
];

export const categoryLabels = {
  panel: 'Panels & Windows',
  frame: 'Frames & Borders',
  button: 'Buttons',
  slot: 'Slots',
  bar: 'Bars & Meters',
  icon: 'Icons',
  glyph: 'Line Glyphs',
  banner: 'Banners & Nameplates',
  background: 'Backgrounds & Fills',
  decor: 'Decor & Dividers',
  silhouette: 'Silhouettes',
};
