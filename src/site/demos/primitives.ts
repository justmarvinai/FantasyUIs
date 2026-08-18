import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { Panel } from '../../lib/components/Panel.ts';
import { Button } from '../../lib/components/Button.ts';
import { Icon } from '../../lib/components/Icon.ts';
import { StatBar } from '../../lib/components/StatBar.ts';
import { Slot } from '../../lib/components/Slot.ts';
import { Frame } from '../../lib/components/Frame.ts';
import { Divider } from '../../lib/components/Divider.ts';
import { Banner } from '../../lib/components/Banner.ts';
import { Portrait } from '../../lib/components/Portrait.ts';
import { Tooltip } from '../../lib/components/Tooltip.ts';
import { Badge } from '../../lib/components/Badge.ts';
import { Tabs } from '../../lib/components/Tabs.ts';
import { Toggle } from '../../lib/components/Toggle.ts';
import { Slider } from '../../lib/components/Slider.ts';
import { Select } from '../../lib/components/Select.ts';
import { TextInput } from '../../lib/components/TextInput.ts';
import { Modal } from '../../lib/components/Modal.ts';
import { ContextMenu } from '../../lib/components/ContextMenu.ts';

/** Layout helper used only by the examples on this site. */
const row = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-row' }, ...kids.filter(Boolean));
const col = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-col' }, ...kids.filter(Boolean));

export const PRIMITIVES: CatalogEntry[] = [
  {
    id: 'Panel',
    name: 'Panel',
    group: 'surfaces',
    blurb: 'The workhorse window — 9-sliced fill plus ornament frame, with title, body and footer slots.',
    description:
      'Panel is the base every window in the library sits on. Art is stacked as two layers — a fill behind and an ornament frame over the top — so the frame can overhang the fill exactly as it was painted. Because both layers are 9-sliced, a panel stays crisp at any size from a 200px tooltip to a full-screen journal.',
    tags: ['window', 'dialog', 'modal', 'container', 'card', 'box', 'frame', 'popup'],
    related: ['Modal', 'Frame', 'Tabs'],
    demos: [
      {
        title: 'Titled window',
        note: 'Header, body and footer, with a close button that emits `close`.',
        build: () => {
          const panel = new Panel({
            title: 'Inventory',
            subtitle: '18 / 30 slots',
            width: 420,
            closable: true,
            content: h('p', {
              class: 'fui-body',
              text: 'Body content is inset far enough to clear the frame ornament.',
            }),
            footer: [
              new Button({ label: 'Sort', variant: 'ghost' }).el,
              new Button({ label: 'Close' }).el,
            ],
          });
          panel.on('panel:close', () => console.log('closed'));
          return panel.el;
        },
      },
      {
        title: 'Variants',
        note: '`alt` uses the ornate window art, `surface` the flat inner plate.',
        build: () =>
          row(
            new Panel({
              title: 'Quest',
              variant: 'alt',
              width: 300,
              height: 260,
              content: h('p', { class: 'fui-body', text: 'The secondary window art.' }),
            }).el,
            new Panel({
              variant: 'surface',
              width: 240,
              content: h('p', { class: 'fui-body', text: 'A flat inner surface for lists.' }),
            }).el,
          ),
      },
    ],
  },

  {
    id: 'Button',
    name: 'Button',
    group: 'controls',
    blurb: 'Nine-sliced button with icon, keybind hint and a refusal shake for denied actions.',
    description:
      'Themes that ship real idle and hover artwork swap the texture on hover; themes that do not brighten the single texture instead. The component code is identical either way.',
    tags: ['button', 'cta', 'action', 'click', 'submit', 'menu', 'press'],
    related: ['Slot', 'Modal', 'MainMenu'],
    demos: [
      {
        title: 'Variants and sizes',
        build: () =>
          col(
            row(
              new Button({ label: 'Attack', icon: 'icon-sword' }).el,
              new Button({ label: 'Continue', variant: 'long' }).el,
              new Button({ label: 'Cancel', variant: 'ghost' }).el,
              new Button({ icon: 'icon-potion', variant: 'square' }).el,
              new Button({ icon: 'icon-star', variant: 'round' }).el,
            ),
            row(
              new Button({ label: 'Small', size: 'sm' }).el,
              new Button({ label: 'Large', size: 'lg', hint: 'Enter' }).el,
              new Button({ label: 'Locked', disabled: true }).el,
            ),
          ),
      },
      {
        title: 'Refusal shake',
        note: 'Call `deny()` when the player cannot afford the action.',
        build: () => {
          const btn = new Button({ label: 'Cast Firebolt', icon: 'skill-firehand' });
          btn.el.addEventListener('click', () => btn.deny());
          return btn.el;
        },
      },
    ],
  },

  {
    id: 'Icon',
    name: 'Icon',
    group: 'data',
    blurb: 'A single piece of item or spell art sized to a square box, with rarity glow.',
    tags: ['icon', 'item', 'art', 'sprite', 'glyph', 'image'],
    related: ['Slot', 'Badge'],
    demos: [
      {
        title: 'Item art',
        build: () =>
          row(
            ...[
              'icon-heart',
              'icon-coins',
              'icon-chest',
              'icon-key',
              'icon-potion',
              'icon-sword',
              'icon-shield',
              'icon-star',
              'icon-scroll',
              'icon-sack',
              'icon-armor',
              'icon-axe',
              'icon-rune-stone',
            ].map((id) => new Icon({ icon: id, size: 44, label: id }).el),
          ),
      },
      {
        title: 'Spell art with rarity glow',
        build: () =>
          row(
            new Icon({ icon: 'skill-firehand', size: 56, rarity: 'rare' }).el,
            new Icon({ icon: 'skill-comet', size: 56, rarity: 'epic' }).el,
            new Icon({ icon: 'skill-soulskull', size: 56, rarity: 'legendary' }).el,
            new Icon({ icon: 'skill-thunderhammer', size: 56, rarity: 'mythic', glow: true }).el,
            new Icon({ icon: 'skill-comet', size: 56, muted: true }).el,
          ),
      },
    ],
  },

  {
    id: 'StatBar',
    name: 'StatBar',
    group: 'data',
    blurb: 'Health, mana, stamina or XP, with an animated fill and a lagging damage trail.',
    description:
      'Dropping the value leaves a red ghost behind the fill that catches up a beat later — the standard damage cue players already read without being told.',
    tags: ['health', 'hp', 'mana', 'mp', 'stamina', 'xp', 'progress', 'bar', 'meter', 'resource'],
    related: ['UnitFrame', 'CastBar'],
    demos: [
      {
        title: 'Resources',
        build: () =>
          col(
            new StatBar({ kind: 'health', value: 72, max: 100, label: 'Health' }).el,
            new StatBar({ kind: 'mana', value: 40, max: 100, label: 'Mana' }).el,
            new StatBar({ kind: 'stamina', value: 88, max: 100, label: 'Stamina', readout: 'pct' }).el,
            new StatBar({ kind: 'xp', value: 3200, max: 8000, label: 'XP' }).el,
          ),
      },
      {
        title: 'Damage trail and segments',
        note: 'Click the bar to take a hit and watch the trail catch up.',
        build: () => {
          const hp = new StatBar({ kind: 'health', value: 100, max: 100, label: 'Health', dangerAt: 0.25 });
          hp.el.style.cursor = 'pointer';
          hp.el.addEventListener('click', () => hp.add(hp.get() <= 12 ? 100 : -18));
          return col(
            hp.el,
            new StatBar({ kind: 'stamina', value: 3, max: 5, segments: 5, readout: 'none', width: 220 }).el,
          );
        },
      },
    ],
  },

  {
    id: 'Slot',
    name: 'Slot',
    group: 'data',
    blurb: 'The universal container square: inventory cell, equipment socket, ability button.',
    description:
      'Carries rarity glow, stack count, keybind pip, lock state, drag-and-drop and a radial cooldown sweep. Nearly every other widget in the library is built from it.',
    tags: ['inventory', 'slot', 'cell', 'item', 'equipment', 'socket', 'cooldown', 'drag'],
    related: ['InventoryGrid', 'ActionBar', 'Paperdoll'],
    demos: [
      {
        title: 'States',
        build: () =>
          row(
            new Slot({ item: { icon: 'icon-sword', name: 'Iron Sword', rarity: 'common' } }).el,
            new Slot({ item: { icon: 'icon-potion', name: 'Draught', qty: 12, rarity: 'uncommon' } }).el,
            new Slot({ item: { icon: 'skill-soulskull', rarity: 'epic' }, keyHint: '3' }).el,
            new Slot({ item: { icon: 'icon-chest', rarity: 'legendary' }, size: 'lg' }).el,
            new Slot({}).el,
            new Slot({ locked: true, item: { icon: 'icon-key' } }).el,
            new Slot({ selected: true, item: { icon: 'icon-shield', rarity: 'rare' } }).el,
          ),
      },
      {
        title: 'Cooldown',
        note: 'Click to start an 8-second sweep; `slot:ready` fires when it clears.',
        build: () => {
          const slot = new Slot({ item: { icon: 'skill-firehand', name: 'Firebolt' }, size: 'lg', keyHint: 'Q' });
          slot.on('slot:click', () => slot.startCooldown(8));
          return slot.el;
        },
      },
    ],
  },

  {
    id: 'Frame',
    name: 'Frame',
    group: 'surfaces',
    blurb: 'A hollow decorative border drawn around arbitrary content — canvases, maps, renders.',
    tags: ['frame', 'border', 'ornament', 'outline', 'decorative', 'wrapper'],
    related: ['Panel', 'Portrait'],
    demos: [
      {
        title: 'Around content',
        build: () =>
          row(
            new Frame({
              width: 300,
              height: 170,
              content: h('p', { class: 'fui-body', text: 'Whatever sits behind shows through.' }),
            }).el,
            new Frame({
              size: 'sm',
              width: 150,
              height: 150,
              content: h('p', { class: 'fui-label', text: 'Small' }),
            }).el,
          ),
      },
    ],
  },

  {
    id: 'Divider',
    name: 'Divider',
    group: 'surfaces',
    blurb: 'Section separator — the painted vine ornament, or an etched rule with a caption.',
    tags: ['divider', 'separator', 'rule', 'hr', 'ornament', 'break'],
    demos: [
      {
        title: 'Both variants',
        build: () =>
          col(
            new Divider({ width: 420 }).el,
            new Divider({ variant: 'rule', label: 'Equipment', width: 420 }).el,
            new Divider({ variant: 'rule', width: 420 }).el,
          ),
      },
    ],
  },

  {
    id: 'Banner',
    name: 'Banner',
    group: 'surfaces',
    blurb: 'Nameplate ribbon for section headers, unit names, chapter titles and objectives.',
    tags: ['banner', 'nameplate', 'label', 'header', 'title', 'ribbon', 'plate'],
    related: ['UnitFrame', 'Panel'],
    demos: [
      {
        title: 'Variants',
        build: () =>
          col(
            new Banner({ text: 'Ashfall Keep', icon: 'icon-star', meta: 'Lv 24' }).el,
            new Banner({ text: 'Objective', variant: 'arrow', tone: 'gold' }).el,
            new Banner({ text: 'Chapter Two', variant: 'dark', size: 'lg' }).el,
            new Banner({ text: 'Danger', tone: 'danger', size: 'sm' }).el,
          ),
      },
    ],
  },

  {
    id: 'Portrait',
    name: 'Portrait',
    group: 'data',
    blurb: 'Framed character art with a level pip and a class badge, square or round.',
    tags: ['portrait', 'avatar', 'character', 'face', 'headshot', 'unit'],
    related: ['UnitFrame', 'CharacterSelect'],
    demos: [
      {
        title: 'Shapes and badges',
        build: () =>
          row(
            new Portrait({ art: 'silhouette-warrior-m', size: 90, level: 24, badge: 'icon-sword' }).el,
            new Portrait({ art: 'silhouette-warrior-f', size: 90, level: 19, badge: 'icon-scroll' }).el,
            new Portrait({ art: 'skill-soulskull', size: 90, shape: 'round', level: 40 }).el,
            new Portrait({ art: 'silhouette-warrior-m', size: 90, inactive: true }).el,
            new Portrait({ art: 'silhouette-warrior-f', size: 90, active: true }).el,
          ),
      },
    ],
  },

  {
    id: 'Tooltip',
    name: 'Tooltip',
    group: 'data',
    blurb: 'The item card: rarity-tinted title, stat lines, requirements, flavour text and price.',
    description:
      'Use it as a static card, or bind one instance to an entire inventory with `attach()` and swap its contents on hover.',
    tags: ['tooltip', 'item', 'hover', 'stats', 'popup', 'inspect', 'compare'],
    related: ['Slot', 'ItemCard'],
    demos: [
      {
        title: 'Item card',
        build: () =>
          new Tooltip({
            title: 'Emberfang',
            rarity: 'epic',
            subtitle: 'Two-Handed Sword',
            slotLabel: 'Main Hand',
            stats: [
              { label: 'Damage', value: '84 – 112' },
              { label: 'Strength', value: '+24', tone: 'good' },
              { label: 'Attack Speed', value: '-0.2', tone: 'bad' },
              { label: 'Burn on hit', value: '15%', tone: 'magic' },
            ],
            requires: ['Requires Level 30'],
            flavor: 'Forged in the last breath of a dying forge-god.',
            price: 14500,
            hint: 'Shift-click to compare',
          }).el,
      },
      {
        title: 'Bound to a hover target',
        note: 'One tooltip instance can serve a whole grid.',
        build: () => {
          const slot = new Slot({ item: { icon: 'icon-potion', name: 'Healing Draught', qty: 5 } });
          const tip = new Tooltip({
            title: 'Healing Draught',
            rarity: 'uncommon',
            subtitle: 'Consumable',
            stats: [{ label: 'Restores', value: '250 Health', tone: 'good' }],
            flavor: 'Tastes of bark and regret.',
            price: 45,
          });
          tip.attach(slot.el);
          return row(slot.el, tip.el);
        },
      },
    ],
  },

  {
    id: 'Badge',
    name: 'Badge',
    group: 'data',
    blurb: 'Status pill for counts, NEW flags, buff stacks, currency chips and difficulty tags.',
    tags: ['badge', 'pill', 'chip', 'count', 'tag', 'label', 'notification'],
    demos: [
      {
        title: 'Tones',
        build: () =>
          row(
            new Badge({ icon: 'icon-coins', count: 12500, tone: 'gold' }).el,
            new Badge({ text: 'NEW', tone: 'danger', pulse: true }).el,
            new Badge({ text: 'Ready', tone: 'success' }).el,
            new Badge({ text: 'Epic', tone: 'epic' }).el,
            new Badge({ text: 'Legendary', tone: 'legendary' }).el,
            new Badge({ text: 'x3', tone: 'accent', size: 'sm' }).el,
            new Badge({ dot: true, tone: 'danger' }).el,
          ),
      },
    ],
  },

  {
    id: 'Tabs',
    name: 'Tabs',
    group: 'controls',
    blurb: 'Category strip for inventory filters, settings sections and shop departments.',
    tags: ['tabs', 'nav', 'sections', 'filter', 'categories', 'switch'],
    related: ['SettingsScreen', 'ShopPanel'],
    demos: [
      {
        title: 'Horizontal and vertical',
        build: () => {
          const tabs = new Tabs({
            items: [
              { id: 'gear', label: 'Gear', icon: 'icon-armor', count: 18 },
              { id: 'consumables', label: 'Potions', icon: 'icon-potion', count: 6 },
              { id: 'quest', label: 'Quest', icon: 'icon-scroll' },
              { id: 'junk', label: 'Junk', disabled: true },
            ],
          });
          tabs.on<{ id: string }>('tabs:change', ({ id }) => console.log('tab', id));
          const side = new Tabs({
            orientation: 'vertical',
            items: [
              { id: 'audio', label: 'Audio' },
              { id: 'video', label: 'Video' },
              { id: 'controls', label: 'Controls' },
            ],
          });
          return col(tabs.el, side.el);
        },
      },
    ],
  },

  {
    id: 'Toggle',
    name: 'Toggle',
    group: 'controls',
    blurb: 'On/off switch and engraved tick box for settings screens.',
    tags: ['toggle', 'switch', 'checkbox', 'boolean', 'option', 'setting'],
    related: ['SettingsScreen', 'Slider'],
    demos: [
      {
        title: 'Switch and check',
        build: () =>
          col(
            new Toggle({ label: 'Screen shake', hint: 'Camera reacts to heavy hits', checked: true }).el,
            new Toggle({ label: 'Damage numbers', checked: true }).el,
            new Toggle({ label: 'Permadeath', variant: 'check' }).el,
            new Toggle({ label: 'Unavailable', disabled: true }).el,
          ),
      },
    ],
  },

  {
    id: 'Slider',
    name: 'Slider',
    group: 'controls',
    blurb: 'Range control for volume, brightness, sensitivity and difficulty scaling.',
    tags: ['slider', 'range', 'volume', 'setting', 'value', 'scrub'],
    related: ['SettingsScreen', 'Toggle'],
    demos: [
      {
        title: 'Formats',
        build: () =>
          col(
            new Slider({ label: 'Master volume', icon: 'icon-star', value: 70, format: 'percent' }).el,
            new Slider({ label: 'Music', value: 45, format: 'percent' }).el,
            new Slider({ label: 'Field of view', value: 90, min: 60, max: 120 }).el,
            new Slider({ label: 'Locked', value: 30, disabled: true }).el,
          ),
      },
    ],
  },

  {
    id: 'Select',
    name: 'Select',
    group: 'controls',
    blurb: 'Dropdown that carries icons and hint lines native options cannot render.',
    tags: ['select', 'dropdown', 'combobox', 'options', 'picker', 'menu', 'choose'],
    related: ['SettingsScreen', 'ContextMenu'],
    demos: [
      {
        title: 'With icons and hints',
        build: () => {
          const select = new Select({
            label: 'Starting class',
            items: [
              { value: 'warrior', label: 'Warrior', icon: 'icon-sword', hint: 'Heavy armour, heavier axe' },
              { value: 'mage', label: 'Mage', icon: 'skill-firehand', hint: 'Fragile, devastating' },
              { value: 'rogue', label: 'Rogue', icon: 'icon-key', hint: 'Fast and quiet' },
              { value: 'locked', label: 'Necromancer', hint: 'Reach level 30', disabled: true },
            ],
          });
          select.on<string>('select:change', (v) => console.log('class', v));
          return select.el;
        },
      },
    ],
  },

  {
    id: 'TextInput',
    name: 'TextInput',
    group: 'controls',
    blurb: 'Engraved field for character naming, search boxes, chat and world seeds.',
    tags: ['input', 'text', 'field', 'name', 'search', 'chat', 'form'],
    demos: [
      {
        title: 'Field states',
        build: () =>
          col(
            new TextInput({ label: 'Character name', placeholder: 'Enter a name…', maxLength: 20, counter: true }).el,
            new TextInput({ label: 'Search', icon: 'icon-scroll', placeholder: 'Filter items…' }).el,
            new TextInput({ label: 'World seed', value: 'ashen-vale-4417', error: 'Seed already in use' }).el,
          ),
      },
    ],
  },

  {
    id: 'Modal',
    name: 'Modal',
    group: 'screens',
    blurb: 'Centred window over a dimmed backdrop — confirmations, notices, turn-ins.',
    tags: ['modal', 'dialog', 'confirm', 'popup', 'overlay', 'prompt', 'alert'],
    related: ['Panel', 'LevelUpModal'],
    demos: [
      {
        title: 'Confirmation',
        note: 'Click to open; Escape or the backdrop dismisses it.',
        build: () => {
          const open = new Button({ label: 'Abandon quest' });
          const modal = new Modal({
            title: 'Abandon quest?',
            message: 'All progress on The Sunken Gate will be lost. This cannot be undone.',
            actions: [
              { label: 'Abandon', onClick: () => console.log('abandoned') },
              { label: 'Keep it', variant: 'ghost' },
            ],
          });
          open.el.addEventListener('click', () => modal.open());
          return row(open.el, modal.el);
        },
      },
    ],
  },

  {
    id: 'ContextMenu',
    name: 'ContextMenu',
    group: 'controls',
    blurb: 'Right-click menu for inventory items, party members, map pins and chat names.',
    tags: ['context', 'menu', 'right-click', 'actions', 'dropdown', 'popup'],
    related: ['Slot', 'InventoryGrid'],
    demos: [
      {
        title: 'Bound to a slot',
        note: 'Right-click the slot.',
        build: () => {
          const slot = new Slot({ item: { icon: 'icon-potion', name: 'Healing Draught', qty: 5 } });
          const menu = new ContextMenu({
            title: 'Healing Draught',
            items: [
              { id: 'use', label: 'Use', icon: 'icon-potion', hint: 'Right-click' },
              { id: 'split', label: 'Split stack' },
              { id: 'link', label: 'Link in chat' },
              { id: 'sep', label: '', separator: true },
              { id: 'destroy', label: 'Destroy', danger: true },
            ],
          });
          menu.bind(slot.el);
          menu.on<{ id: string }>('menu:select', ({ id }) => console.log('picked', id));
          return row(slot.el, menu.el);
        },
      },
    ],
  },
];
