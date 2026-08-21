import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { MainMenu } from '../../lib/components/MainMenu.ts';
import { PauseMenu } from '../../lib/components/PauseMenu.ts';
import { SettingsScreen } from '../../lib/components/SettingsScreen.ts';
import { CharacterSelect } from '../../lib/components/CharacterSelect.ts';
import { LoadingScreen } from '../../lib/components/LoadingScreen.ts';
import { ResultScreen } from '../../lib/components/ResultScreen.ts';
import { LevelUpModal } from '../../lib/components/LevelUpModal.ts';
import { HUD } from '../../lib/components/HUD.ts';
import { ToastStack } from '../../lib/components/ToastStack.ts';
import { FloatingText } from '../../lib/components/FloatingText.ts';
import { AchievementPopup } from '../../lib/components/AchievementPopup.ts';

import { UnitFrame } from '../../lib/components/UnitFrame.ts';
import { ActionBar } from '../../lib/components/ActionBar.ts';
import { Minimap } from '../../lib/components/Minimap.ts';
import { BuffBar } from '../../lib/components/BuffBar.ts';
import { QuestTracker } from '../../lib/components/QuestTracker.ts';
import { CurrencyBar } from '../../lib/components/CurrencyBar.ts';
import { CastBar } from '../../lib/components/CastBar.ts';
import { Button } from '../../lib/components/Button.ts';

const row = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-row' }, ...kids.filter(Boolean));
const col = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-col' }, ...kids.filter(Boolean));

/** A contained viewport. `transform` makes it the containing block for the
 *  position:fixed screens, so they render inline instead of over the page. */
const screen = (height = 520) =>
  h('div', { class: 'demo-screen', style: { height: `${height}px` } });

export const SCREENS: CatalogEntry[] = [
  {
    id: 'MainMenu',
    name: 'MainMenu',
    group: 'screens',
    blurb: 'Title screen with drifting backdrop, logo, menu stack and version lines.',
    tags: ['menu', 'title', 'start', 'splash', 'home', 'main', 'screen'],
    related: ['PauseMenu', 'CharacterSelect', 'SettingsScreen'],
    demos: [
      {
        title: 'Title screen',
        stage: 'wide',
        build: () => {
          const menu = new MainMenu({
            fullscreen: false,
            title: 'Ashen Vale',
            tagline: 'Chapter One — The Sunken Gate',
            version: 'v0.4.2 · build 812',
            footer: 'Made with FantasyUIs',
            entries: [
              { id: 'new', label: 'New Game', primary: true },
              { id: 'load', label: 'Continue' },
              { id: 'settings', label: 'Settings' },
              { id: 'quit', label: 'Quit' },
            ],
          });
          menu.on<{ id: string }>('menu:select', ({ id }) => console.log('menu', id));
          return menu.el;
        },
      },
    ],
  },

  {
    id: 'PauseMenu',
    name: 'PauseMenu',
    group: 'screens',
    blurb: 'In-game pause overlay: blurred scrim, short menu and run stats. Escape toggles it.',
    tags: ['pause', 'escape', 'menu', 'overlay', 'ingame', 'stop', 'break'],
    related: ['MainMenu', 'SettingsScreen', 'Modal'],
    demos: [
      {
        title: 'Paused',
        note: 'Rendered inside a contained viewport rather than over this page.',
        stage: 'wide',
        build: () => {
          const stage = screen(460);
          const pause = new PauseMenu({
            bindEscape: false,
            open: true,
            stats: [
              { label: 'Playtime', value: '4h 12m' },
              { label: 'Zone', value: 'Emberwood Vale' },
              { label: 'Difficulty', value: 'Veteran' },
            ],
          });
          pause.on<{ id: string }>('pause:select', ({ id }) => console.log('pause', id));
          stage.appendChild(pause.el);
          return stage;
        },
      },
    ],
  },

  {
    id: 'SettingsScreen',
    name: 'SettingsScreen',
    group: 'screens',
    blurb: 'Sectioned options with toggles, sliders, dropdowns and rebindable keys.',
    description:
      'Every control feeds one change stream, and `values()` returns the whole settings object ready to persist.',
    tags: ['settings', 'options', 'preferences', 'config', 'audio', 'video', 'keybinds', 'controls'],
    related: ['Toggle', 'Slider', 'Select', 'Tabs'],
    demos: [
      {
        title: 'Options',
        stage: 'wide',
        build: () => {
          const settings = new SettingsScreen({
            sections: [
              {
                id: 'audio',
                label: 'Audio',
                controls: [
                  { kind: 'slider', id: 'master', label: 'Master volume', value: 80, format: 'percent' },
                  { kind: 'slider', id: 'music', label: 'Music', value: 55, format: 'percent' },
                  { kind: 'slider', id: 'sfx', label: 'Effects', value: 90, format: 'percent' },
                  { kind: 'divider', id: 'd1' },
                  { kind: 'toggle', id: 'subs', label: 'Subtitles', hint: 'Show dialogue captions', value: true },
                ],
              },
              {
                id: 'video',
                label: 'Video',
                controls: [
                  {
                    kind: 'select', id: 'res', label: 'Resolution', value: '1920',
                    items: [
                      { value: '1280', label: '1280 × 720' },
                      { value: '1920', label: '1920 × 1080' },
                      { value: '2560', label: '2560 × 1440' },
                    ],
                  },
                  { kind: 'toggle', id: 'fullscreen', label: 'Fullscreen', value: true },
                  { kind: 'toggle', id: 'shake', label: 'Screen shake', hint: 'Camera reacts to heavy hits', value: true },
                  { kind: 'slider', id: 'fov', label: 'Field of view', value: 90, min: 60, max: 120 },
                ],
              },
              {
                id: 'controls',
                label: 'Controls',
                controls: [
                  { kind: 'keybind', id: 'attack', label: 'Attack', value: 'Mouse1' },
                  { kind: 'keybind', id: 'dodge', label: 'Dodge', value: 'Space' },
                  { kind: 'keybind', id: 'inventory', label: 'Inventory', value: 'I' },
                  { kind: 'divider', id: 'd2', label: 'Advanced' },
                  { kind: 'toggle', id: 'hold', label: 'Hold to sprint' },
                ],
              },
            ],
          });
          settings.on('settings:apply', (v) => console.log('saved', v));
          return settings.el;
        },
      },
    ],
  },

  {
    id: 'CharacterSelect',
    name: 'CharacterSelect',
    group: 'screens',
    blurb: 'Silhouette class cards with a detail column of stat pips and starting gear.',
    tags: ['character', 'class', 'select', 'hero', 'creation', 'pick', 'roster', 'screen'],
    related: ['Portrait', 'MainMenu'],
    demos: [
      {
        title: 'Class picker',
        stage: 'wide',
        build: () => {
          const select = new CharacterSelect({
            fullscreen: false,
            classes: [
              {
                id: 'warrior', name: 'Warrior', art: 'silhouette-warrior-m', icon: 'icon-sword',
                tagline: 'Heavy armour, heavier axe.',
                description: 'Holds the line while everyone else finds their footing. Trades speed for the ability to simply not die.',
                stats: { Might: 5, Agility: 2, Arcana: 1, Vigour: 5 },
                startingGear: ['icon-sword', 'icon-shield', 'icon-armor'],
              },
              {
                id: 'sorceress', name: 'Sorceress', art: 'silhouette-warrior-f', icon: 'skill-firehand',
                tagline: 'Fragile, and devastating.',
                description: 'Ends fights before they start, provided nothing reaches her first.',
                stats: { Might: 1, Agility: 3, Arcana: 5, Vigour: 2 },
                startingGear: ['skill-firehand', 'icon-scroll', 'icon-potion'],
              },
              {
                id: 'necromancer', name: 'Necromancer', art: 'silhouette-warrior-m', icon: 'skill-soulskull',
                locked: true, lockHint: 'Reach level 30',
              },
            ],
          });
          select.on('character:confirm', (c) => console.log('confirmed', c));
          return select.el;
        },
      },
    ],
  },

  {
    id: 'LoadingScreen',
    name: 'LoadingScreen',
    group: 'screens',
    blurb: 'Backdrop, progress bar, rotating gameplay tips and a status line.',
    tags: ['loading', 'progress', 'splash', 'tips', 'transition', 'streaming', 'screen'],
    related: ['MainMenu', 'StatBar'],
    demos: [
      {
        title: 'Zone transition',
        note: 'Progress animates from 0 to 100 and loops.',
        stage: 'wide',
        build: () => {
          const load = new LoadingScreen({
            fullscreen: false,
            title: 'Entering Emberwood Vale',
            progress: 0,
            status: 'Streaming terrain…',
            tips: [
              'Blocking at the moment of impact reduces stagger by 40%.',
              'Ember runes can be reclaimed from any item at the Ashen Anvil.',
              'Bog wardens are vulnerable to fire, but their aura douses torches.',
            ],
          });
          let p = 0;
          setInterval(() => {
            p = p >= 1 ? 0 : p + 0.01;
            load.setProgress(p, p < 0.5 ? 'Streaming terrain…' : 'Warming shaders…');
          }, 60);
          return load.el;
        },
      },
    ],
  },

  {
    id: 'ResultScreen',
    name: 'ResultScreen',
    group: 'screens',
    blurb: 'End-of-run summary: victory or defeat headline, stat table, stars and reward chips.',
    tags: ['victory', 'defeat', 'result', 'gameover', 'summary', 'score', 'stars', 'screen'],
    related: ['LootWindow', 'Leaderboard'],
    demos: [
      {
        title: 'Victory',
        stage: 'wide',
        build: () => {
          const result = new ResultScreen({
            fullscreen: false,
            outcome: 'victory',
            subtitle: 'The Sunken Gate',
            stars: 2,
            xp: 4200,
            gold: 860,
            rewards: [{ icon: 'icon-sword', label: 'Emberfang' }, { icon: 'icon-rune-stone', qty: 3 }],
            stats: [
              { label: 'Clear time', value: '6:42', best: true },
              { label: 'Damage dealt', value: 184920 },
              { label: 'Damage taken', value: 12480 },
              { label: 'Deaths', value: 0 },
            ],
            actions: [
              { id: 'next', label: 'Continue', primary: true },
              { id: 'retry', label: 'Replay' },
            ],
          });
          result.on('result:action', (a) => console.log('action', a));
          return result.el;
        },
      },
      {
        title: 'Defeat',
        stage: 'wide',
        build: () =>
          new ResultScreen({
            fullscreen: false,
            outcome: 'defeat',
            subtitle: 'Slain by Thal, the Sunken Gate',
            stats: [
              { label: 'Survived', value: '4:08' },
              { label: 'Boss health left', value: '32%' },
            ],
            actions: [
              { id: 'retry', label: 'Try Again', primary: true },
              { id: 'quit', label: 'Abandon Run' },
            ],
          }).el,
      },
    ],
  },

  {
    id: 'LevelUpModal',
    name: 'LevelUpModal',
    group: 'screens',
    blurb: 'Celebratory burst with the new level in large type, stat gains and unlocked abilities.',
    tags: ['levelup', 'level', 'progression', 'celebration', 'unlock', 'modal', 'reward'],
    related: ['Modal', 'AchievementPopup', 'SkillTree'],
    demos: [
      {
        title: 'Level 12',
        stage: 'wide',
        build: () => {
          const stage = screen(520);
          const up = new LevelUpModal({
            level: 12,
            subtitle: 'Warden of the Vale',
            points: 2,
            gains: [
              { label: 'Max Health', value: '+18' },
              { label: 'Strength', value: '+2' },
              { label: 'Armour', value: '+9' },
            ],
            unlocks: [
              { icon: 'skill-thunderhammer', name: 'Thunder Hammer', detail: 'Stuns on impact' },
              { icon: 'icon-shield', name: 'Second Wind', detail: 'Heal on block' },
            ],
          });
          stage.appendChild(up.el);
          up.open(stage);
          return stage;
        },
      },
    ],
  },

  {
    id: 'HUD',
    name: 'HUD',
    group: 'screens',
    blurb: 'A nine-zone overlay frame that game widgets drop into, with click-through empty space.',
    description:
      'Compose a whole HUD instead of hand-positioning every widget. Empty zones never eat clicks meant for the game canvas underneath.',
    tags: ['hud', 'overlay', 'layout', 'ingame', 'zones', 'screen', 'interface'],
    related: ['UnitFrame', 'ActionBar', 'Minimap', 'QuestTracker'],
    demos: [
      {
        title: 'A complete combat HUD',
        note: 'Every widget here is a separate component dropped into a zone.',
        stage: 'wide',
        build: () => {
          const stage = screen(560);
          const hud = new HUD({ fullscreen: false });
          hud.el.style.minHeight = '100%';

          const player = new UnitFrame({
            name: 'Kaelen', level: 24, portraitArt: 'silhouette-warrior-m', role: 'icon-sword',
            health: 780, healthMax: 900, mana: 210, manaMax: 400,
          });
          const buffs = new BuffBar({
            buffs: [
              { id: 'haste', icon: 'skill-comet', remaining: 24, total: 30, stacks: 3 },
              { id: 'burn', icon: 'skill-firehand', remaining: 9, total: 12, kind: 'debuff' },
            ],
          });
          const target = new UnitFrame({
            kind: 'target', name: 'Bog Warden', level: 26, portraitArt: 'skill-soulskull',
            health: 420, healthMax: 1400, elite: 'Elite',
          });
          const wallet = new CurrencyBar({
            currencies: [
              { id: 'gold', icon: 'icon-coins', amount: 12480 },
              { id: 'runes', icon: 'icon-rune-stone', amount: 37 },
            ],
          });
          const map = new Minimap({
            size: 150, x: 1000, y: 1200, heading: 35, zoom: 500, zone: 'Emberwood Vale',
            pins: [
              { id: 'gate', x: 1050, y: 1120, kind: 'objective' },
              { id: 'warden', x: 1010, y: 1330, kind: 'enemy' },
            ],
          });
          const tracker = new QuestTracker({
            width: 210,
            quests: [{ id: 'q1', title: 'The Sunken Gate', kind: 'main', objectives: [{ text: 'Slay bog wardens', have: 3, need: 8 }] }],
          });
          const bar = new ActionBar({
            resource: 210,
            actions: [
              { icon: 'skill-firehand', name: 'Firebolt', cooldown: 4, cost: 20 },
              { icon: 'skill-comet', name: 'Comet Slash', cooldown: 8, cost: 35 },
              { icon: 'skill-soulskull', name: 'Soul Burn', cooldown: 12, cost: 50 },
              { icon: 'skill-thunderhammer', name: 'Thunder Hammer', cooldown: 20, cost: 80 },
              { icon: 'icon-potion', name: 'Draught', cooldown: 30, charges: 5 },
            ],
          });
          const cast = new CastBar({ width: 300 });
          cast.start({ name: 'Thunder Hammer', icon: 'skill-thunderhammer', duration: 60 });

          hud.add('top-left', player.el, buffs.el);
          hud.add('top-center', target.el);
          hud.add('top-right', wallet.el, map.el, tracker.el);
          hud.add('bottom-center', cast.el, bar.el);

          stage.appendChild(hud.el);
          return stage;
        },
      },
    ],
  },
];

export const FEEDBACK: CatalogEntry[] = [
  {
    id: 'ToastStack',
    name: 'ToastStack',
    group: 'feedback',
    blurb: 'The notification corner — item pickups, quest updates, level-ups and warnings.',
    tags: ['toast', 'notification', 'alert', 'popup', 'message', 'pickup', 'snackbar'],
    related: ['AchievementPopup', 'FloatingText'],
    demos: [
      {
        title: 'Notifications',
        note: 'Toasts render into a fixed corner; the buttons push new ones.',
        stage: 'wide',
        build: () => {
          const stage = screen(320);
          const toasts = new ToastStack({ position: 'top-right' });
          stage.appendChild(toasts.el);

          const drop = new Button({ label: 'Item drop', size: 'sm' });
          drop.el.addEventListener('click', () =>
            toasts.push({ title: 'Emberfang', text: 'Added to inventory', icon: 'icon-sword', rarity: 'epic' }),
          );
          const quest = new Button({ label: 'Quest update', size: 'sm', variant: 'ghost' });
          quest.el.addEventListener('click', () =>
            toasts.push({ title: 'Objective complete', text: 'Slay bog wardens (8/8)', icon: 'icon-scroll', tone: 'success' }),
          );
          const warn = new Button({ label: 'Warning', size: 'sm', variant: 'ghost' });
          warn.el.addEventListener('click', () => toasts.warn('Inventory full', 'Sell or destroy something first.'));

          stage.appendChild(h('div', { class: 'demo-stagerow' }, drop.el, quest.el, warn.el));
          toasts.push({ title: 'Ember Rune', text: 'x3 added', icon: 'icon-rune-stone', rarity: 'rare', duration: 0 });
          return stage;
        },
      },
    ],
  },

  {
    id: 'FloatingText',
    name: 'FloatingText',
    group: 'feedback',
    blurb: 'Damage numbers, crits, heal ticks, XP pops and gold pickups.',
    tags: ['damage', 'numbers', 'combat', 'crit', 'heal', 'floating', 'text', 'feedback'],
    related: ['ToastStack', 'UnitFrame'],
    demos: [
      {
        title: 'Combat numbers',
        note: 'Click inside the panel to spawn a hit.',
        stage: 'wide',
        build: () => {
          const stage = screen(280);
          const fx = new FloatingText({ anchor: stage });
          const kinds = ['damage', 'crit', 'heal', 'miss', 'xp', 'gold'] as const;
          let i = 0;
          stage.addEventListener('click', (ev) => {
            const kind = kinds[i++ % kinds.length];
            const r = stage.getBoundingClientRect();
            fx.spawn(ev.clientX - r.left, ev.clientY - r.top, {
              value: kind === 'miss' ? 'Miss' : Math.floor(40 + Math.random() * 400),
              kind,
              icon: kind === 'gold' ? 'icon-coins' : undefined,
            });
          });
          stage.appendChild(
            h('p', { class: 'demo-hint', text: 'Click anywhere in this panel' }),
          );
          return stage;
        },
      },
    ],
  },

  {
    id: 'AchievementPopup',
    name: 'AchievementPopup',
    group: 'feedback',
    blurb: 'Sliding unlock banner with bronze, silver, gold and platinum treatments.',
    tags: ['achievement', 'trophy', 'unlock', 'banner', 'award', 'milestone', 'badge'],
    related: ['ToastStack', 'LevelUpModal'],
    demos: [
      {
        title: 'Unlocks',
        note: 'Queued unlocks play one after another.',
        stage: 'wide',
        build: () => {
          const stage = screen(280);
          const achievements = new AchievementPopup({ position: 'top' });
          stage.appendChild(achievements.el);

          const fire = new Button({ label: 'Unlock three', size: 'sm' });
          fire.el.addEventListener('click', () => {
            achievements.unlock({ title: 'Untouched', tier: 'gold', points: 50, icon: 'icon-shield', description: 'Defeat the Warden without taking damage.' });
            achievements.unlock({ title: 'Well Read', tier: 'bronze', points: 10, icon: 'icon-scroll', description: 'Read every journal in the Vale.' });
            achievements.unlock({ title: 'Gatebreaker', tier: 'platinum', points: 100, icon: 'icon-key', description: 'Open the Sunken Gate.' });
          });
          stage.appendChild(h('div', { class: 'demo-stagerow' }, fire.el));
          achievements.unlock({ title: 'First Blood', tier: 'silver', points: 25, icon: 'icon-sword', description: 'Win your first duel.', duration: 100000 });
          return stage;
        },
      },
    ],
  },
];

export { row as demoRow, col as demoCol };
