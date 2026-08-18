/**
 * FantasyUIs — monochrome line glyph collection (40 icons).
 *
 * Single-colour vector icons, shipped as SVG and consumed through CSS
 * `mask-image` so they inherit `currentColor` — one file recolours to any
 * rarity, faction or state without a second asset. The source pack's own names
 * already describe the artwork, so they are kept minus the `rpg_v1_` prefix and
 * the trailing catalogue number.
 */

export const LINE_GLYPHS = [
  { src: 'WHITE/SVG/rpg_v1_arcane_symbol_306.svg', id: 'glyph-arcane-symbol', name: 'Arcane Symbol', tags: ['arcane', 'symbol'] },
  { src: 'WHITE/SVG/rpg_v1_bow_and_arrow_63.svg', id: 'glyph-bow-and-arrow', name: 'Bow And Arrow', tags: ['bow', 'and', 'arrow'] },
  { src: 'WHITE/SVG/rpg_v1_broken_shackle_38.svg', id: 'glyph-broken-shackle', name: 'Broken Shackle', tags: ['broken', 'shackle'] },
  { src: 'WHITE/SVG/rpg_v1_burning_scroll_56.svg', id: 'glyph-burning-scroll', name: 'Burning Scroll', tags: ['burning', 'scroll'] },
  { src: 'WHITE/SVG/rpg_v1_celestial_body_300.svg', id: 'glyph-celestial-body', name: 'Celestial Body', tags: ['celestial', 'body'] },
  { src: 'WHITE/SVG/rpg_v1_cloaked_figure_49.svg', id: 'glyph-cloaked-figure', name: 'Cloaked Figure', tags: ['cloaked', 'figure'] },
  { src: 'WHITE/SVG/rpg_v1_crossed_swords_38.svg', id: 'glyph-crossed-swords', name: 'Crossed Swords', tags: ['crossed', 'swords'] },
  { src: 'WHITE/SVG/rpg_v1_cursed_eye_52.svg', id: 'glyph-cursed-eye', name: 'Cursed Eye', tags: ['cursed', 'eye'] },
  { src: 'WHITE/SVG/rpg_v1_eagle_staff_199.svg', id: 'glyph-eagle-staff', name: 'Eagle Staff', tags: ['eagle', 'staff'] },
  { src: 'WHITE/SVG/rpg_v1_evil_eye_12.svg', id: 'glyph-evil-eye', name: 'Evil Eye', tags: ['evil', 'eye'] },
  { src: 'WHITE/SVG/rpg_v1_exploding_bomb_40.svg', id: 'glyph-exploding-bomb', name: 'Exploding Bomb', tags: ['exploding', 'bomb'] },
  { src: 'WHITE/SVG/rpg_v1_fist_punch_50.svg', id: 'glyph-fist-punch', name: 'Fist Punch', tags: ['fist', 'punch'] },
  { src: 'WHITE/SVG/rpg_v1_flaming_skull_40.svg', id: 'glyph-flaming-skull', name: 'Flaming Skull', tags: ['flaming', 'skull'] },
  { src: 'WHITE/SVG/rpg_v1_hammer_hit_48.svg', id: 'glyph-hammer-hit', name: 'Hammer Hit', tags: ['hammer', 'hit'] },
  { src: 'WHITE/SVG/rpg_v1_health_potion_01.svg', id: 'glyph-health-potion', name: 'Health Potion', tags: ['health', 'potion'] },
  { src: 'WHITE/SVG/rpg_v1_holy_cross_35.svg', id: 'glyph-holy-cross', name: 'Holy Cross', tags: ['holy', 'cross'] },
  { src: 'WHITE/SVG/rpg_v1_holy_totem_128.svg', id: 'glyph-holy-totem', name: 'Holy Totem', tags: ['holy', 'totem'] },
  { src: 'WHITE/SVG/rpg_v1_hourglass_207.svg', id: 'glyph-hourglass', name: 'Hourglass', tags: ['hourglass'] },
  { src: 'WHITE/SVG/rpg_v1_magic_arrow_83.svg', id: 'glyph-magic-arrow', name: 'Magic Arrow', tags: ['magic', 'arrow'] },
  { src: 'WHITE/SVG/rpg_v1_magic_feather_17.svg', id: 'glyph-magic-feather', name: 'Magic Feather', tags: ['magic', 'feather'] },
  { src: 'WHITE/SVG/rpg_v1_magic_flame_131.svg', id: 'glyph-magic-flame', name: 'Magic Flame', tags: ['magic', 'flame'] },
  { src: 'WHITE/SVG/rpg_v1_magic_staff_194.svg', id: 'glyph-magic-staff', name: 'Magic Staff', tags: ['magic', 'staff'] },
  { src: 'WHITE/SVG/rpg_v1_nature_shield_93.svg', id: 'glyph-nature-shield', name: 'Nature Shield', tags: ['nature', 'shield'] },
  { src: 'WHITE/SVG/rpg_v1_owl_309.svg', id: 'glyph-owl', name: 'Owl', tags: ['owl'] },
  { src: 'WHITE/SVG/rpg_v1_peace_dove_168.svg', id: 'glyph-peace-dove', name: 'Peace Dove', tags: ['peace', 'dove'] },
  { src: 'WHITE/SVG/rpg_v1_phoenix_179.svg', id: 'glyph-phoenix', name: 'Phoenix', tags: ['phoenix'] },
  { src: 'WHITE/SVG/rpg_v1_ribcage_armor_335.svg', id: 'glyph-ribcage-armor', name: 'Ribcage Armor', tags: ['ribcage', 'armor'] },
  { src: 'WHITE/SVG/rpg_v1_rockets_247.svg', id: 'glyph-rockets', name: 'Rockets', tags: ['rockets'] },
  { src: 'WHITE/SVG/rpg_v1_shield_block_37.svg', id: 'glyph-shield-block', name: 'Shield Block', tags: ['shield', 'block'] },
  { src: 'WHITE/SVG/rpg_v1_shooting_stars_314.svg', id: 'glyph-shooting-stars', name: 'Shooting Stars', tags: ['shooting', 'stars'] },
  { src: 'WHITE/SVG/rpg_v1_skull_wreath_258.svg', id: 'glyph-skull-wreath', name: 'Skull Wreath', tags: ['skull', 'wreath'] },
  { src: 'WHITE/SVG/rpg_v1_spell_book_173.svg', id: 'glyph-spell-book', name: 'Spell Book', tags: ['spell', 'book'] },
  { src: 'WHITE/SVG/rpg_v1_spell_casting_82.svg', id: 'glyph-spell-casting', name: 'Spell Casting', tags: ['spell', 'casting'] },
  { src: 'WHITE/SVG/rpg_v1_spiked_cleaver_.svg', id: 'glyph-spiked-cleaver', name: 'Spiked Cleaver', tags: ['spiked', 'cleaver'] },
  { src: 'WHITE/SVG/rpg_v1_spirit_vortex_55.svg', id: 'glyph-spirit-vortex', name: 'Spirit Vortex', tags: ['spirit', 'vortex'] },
  { src: 'WHITE/SVG/rpg_v1_stomp_impact_36.svg', id: 'glyph-stomp-impact', name: 'Stomp Impact', tags: ['stomp', 'impact'] },
  { src: 'WHITE/SVG/rpg_v1_sword_clash_56.svg', id: 'glyph-sword-clash', name: 'Sword Clash', tags: ['sword', 'clash'] },
  { src: 'WHITE/SVG/rpg_v1_thorn_staff_210.svg', id: 'glyph-thorn-staff', name: 'Thorn Staff', tags: ['thorn', 'staff'] },
  { src: 'WHITE/SVG/rpg_v1_thorny_branch_99.svg', id: 'glyph-thorny-branch', name: 'Thorny Branch', tags: ['thorny', 'branch'] },
  { src: 'WHITE/SVG/rpg_v1_trophy_cup_132.svg', id: 'glyph-trophy-cup', name: 'Trophy Cup', tags: ['trophy', 'cup'] },
].map((g) => ({
  ...g,
  category: 'glyph',
  format: 'svg',
  slice: null,
  tags: [...new Set([...g.tags, 'glyph', 'line', 'mono', 'ui', 'tintable'])],
}));
