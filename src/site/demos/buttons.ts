import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { IconButton } from '../../lib/components/IconButton.ts';
import { AbilityButton } from '../../lib/components/AbilityButton.ts';
import { HoldButton } from '../../lib/components/HoldButton.ts';
import { RibbonButton } from '../../lib/components/RibbonButton.ts';
import { TintButton } from '../../lib/components/TintButton.ts';
import { SplitButton, type SplitAction } from '../../lib/components/SplitButton.ts';
import { ToggleButton } from '../../lib/components/ToggleButton.ts';
import { CostButton } from '../../lib/components/CostButton.ts';
import { GemButton } from '../../lib/components/GemButton.ts';
import { KeycapButton } from '../../lib/components/KeycapButton.ts';
import { ArrowButton } from '../../lib/components/ArrowButton.ts';
import { MenuButton } from '../../lib/components/MenuButton.ts';
import { LoadingButton } from '../../lib/components/LoadingButton.ts';
import { ButtonGroup } from '../../lib/components/ButtonGroup.ts';

/** A wrapping row, for showing several buttons side by side. */
const row = (...kids: Node[]) =>
  h('div', {
    style: { display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' },
  }, ...kids);

/** A stacked column. */
const col = (...kids: Node[]) =>
  h('div', { style: { display: 'grid', gap: '10px', justifyItems: 'start' } }, ...kids);

export const BUTTONS: CatalogEntry[] = [
  {
    id: 'IconButton',
    name: 'IconButton',
    group: 'controls',
    blurb: 'The icon-only button every screen needs a dozen of — close, back, settings, mail, filter.',
    description:
      '`preset` and `glyph` are different things on purpose. A preset is finished artwork the theme supplies, with its symbol painted into the plate — that is how `close` looks like *this theme\'s* close button rather than a generic X. A glyph is monochrome art masked over the button\'s own colour, so it follows the tone, the hover and the disabled state for free. Painted icons go in `art`, drawn as an image, because a full-colour PNG in a mask slot renders as a solid block.',
    tags: ['icon button', 'close', 'back', 'settings', 'round', 'badge', 'chrome', 'toolbar', 'square', 'small'],
    related: ['Button', 'Glyph', 'ArrowButton', 'ToggleButton'],
    demos: [
      {
        title: 'Presets, glyphs and badges',
        note: 'The first three are the theme\'s own painted chrome. The rest are glyphs, tinted by tone.',
        build: () =>
          row(
            new IconButton({ preset: 'close', size: 44, label: 'Close' }).el,
            new IconButton({ preset: 'back', size: 44, label: 'Back' }).el,
            new IconButton({ preset: 'settings', size: 44, label: 'Settings' }).el,
            new IconButton({ glyph: 'glyph-spell-book', shape: 'round', label: 'Journal', badge: 3 }).el,
            new IconButton({ glyph: 'glyph-crossed-swords', shape: 'square', label: 'Battle', tone: 'danger' }).el,
            new IconButton({ glyph: 'glyph-trophy-cup', shape: 'round', label: 'Rewards', tone: 'gold', dot: true }).el,
            new IconButton({ glyph: 'glyph-peace-dove', shape: 'bare', label: 'Friends', tone: 'success' }).el,
            new IconButton({ glyph: 'glyph-hourglass', shape: 'round', label: 'Locked', disabled: true }).el,
          ),
      },
    ],
  },
  {
    id: 'AbilityButton',
    name: 'AbilityButton',
    group: 'combat',
    blurb: 'One skill button: art, keybind, cooldown sweep, charges, cost, and whether it can be pressed at all.',
    description:
      '`tick()` is driven from the caller\'s own loop rather than an internal timer, because a cooldown that keeps counting while the game is paused — or that drifts from the server\'s number — is worse than no cooldown at all. The button refuses the click itself when it is cooling, unaffordable or blocked, so a caller never re-checks the same three conditions, and the reason lands in the tooltip rather than in a toast.',
    tags: ['ability', 'skill button', 'cooldown', 'hotkey', 'charges', 'mana cost', 'hud', 'spell', 'combat', 'action'],
    related: ['ActionBar', 'SkillCard', 'Button', 'BattleControls'],
    demos: [
      {
        title: 'Ready, cooling, out of mana, silenced',
        note: 'Press the ready one — it goes on cooldown and the sweep unwinds. The rest refuse and say why.',
        build: () => {
          const dash = new AbilityButton({
            art: 'fire-flame-burst', name: 'Emberdash', key: 'Q', size: 66,
            cooldownMax: 8, cost: 30, costGlyph: 'glyph-magic-flame', resource: 120,
          });
          dash.on('ability:use', () => dash.trigger());
          return row(
            dash.el,
            new AbilityButton({
              art: 'fire-immolation', name: 'Inferno', key: 'W', size: 66,
              cooldown: 4.6, cooldownMax: 12, cost: 60, costGlyph: 'glyph-magic-flame', resource: 120,
            }).el,
            new AbilityButton({
              art: 'blood-void-lance', name: 'Void Lance', key: 'E', size: 66,
              cost: 80, costGlyph: 'glyph-magic-flame', resource: 45,
            }).el,
            new AbilityButton({
              art: 'earth-rune-arch', name: 'Wardstone', key: 'R', size: 66,
              charges: 0, chargesMax: 3, blocked: 'Silenced',
            }).el,
            new AbilityButton({
              art: 'hunt-piercing-arrow', name: 'Volley', key: 'F', size: 66,
              charges: 2, chargesMax: 3, active: true,
            }).el,
          );
        },
      },
    ],
  },
  {
    id: 'HoldButton',
    name: 'HoldButton',
    group: 'controls',
    blurb: 'Press and hold to confirm — the button for actions with no undo.',
    description:
      '`ConfirmSlider` asks for a drag; this asks for a hold, which is the better fit on a mouse and the only one that works from a keyboard. Releasing early rewinds the fill at double speed rather than snapping it to zero, so a slip reads as "not yet" instead of "nothing happened" — and `hold:cancel` carries how far they got, which is what tells you the duration is too long. The fill is stepped by rAF against a real timestamp so it can never finish on a different frame from the event.',
    tags: ['hold', 'confirm', 'destructive', 'delete', 'press and hold', 'safety', 'undo', 'scrap', 'disband', 'sell'],
    related: ['ConfirmSlider', 'Button', 'Modal', 'LoadingButton'],
    demos: [
      {
        title: 'Two shapes, one gesture',
        note: 'Hold either. Let go early and watch it rewind — the bar loses ground twice as fast as it gains it.',
        build: () => {
          const scrap = new HoldButton({
            label: 'Scrap item', holdLabel: 'Keep holding…', doneLabel: 'Scrapped',
            duration: 1200, tone: 'danger', glyph: 'glyph-hammer-hit',
          });
          scrap.on('hold:complete', () => console.log('scrapped'));
          scrap.on<number>('hold:cancel', (p) => console.log('let go at', Math.round(p * 100), '%'));

          const disband = new HoldButton({
            label: 'Disband guild', holdLabel: 'Are you sure…', doneLabel: 'Disbanded',
            duration: 2000, tone: 'danger', variant: 'ring', glyph: 'glyph-broken-shackle',
          });
          return row(scrap.el, disband.el);
        },
      },
    ],
  },
  {
    id: 'RibbonButton',
    name: 'RibbonButton',
    group: 'controls',
    blurb: 'The banner-shaped call to action a screen is built around — Start Battle, Claim All, Continue.',
    description:
      'The ribbon art is 9-sliced from the theme\'s banner assets, so the pointed end keeps the shape it was painted at any width — a scaled background stretches the point into a wedge. `shine` is deliberately not the default: a screen where three buttons all sweep has no primary action at all.',
    tags: ['ribbon', 'banner', 'cta', 'start battle', 'claim', 'continue', 'primary', 'arrow', 'wide', 'shine'],
    related: ['Button', 'GemButton', 'Banner', 'CostButton'],
    demos: [
      {
        title: 'Arrow, banner and plain',
        note: 'Only the first has `shine` — that is what makes it the primary action rather than one of three.',
        build: () => {
          const start = new RibbonButton({
            label: 'Start battle', note: '−12 stamina', glyph: 'glyph-crossed-swords',
            variant: 'arrow', tone: 'gold', shine: true, width: 300,
          });
          start.on('ribbon:press', () => console.log('battle!'));
          return col(
            start.el,
            new RibbonButton({
              label: 'Claim all', note: '4 rewards waiting', glyph: 'glyph-trophy-cup',
              variant: 'banner', tone: 'success', width: 300,
            }).el,
            new RibbonButton({
              label: 'Retreat', glyph: 'glyph-broken-shackle',
              variant: 'arrow', direction: 'left', tone: 'danger', width: 220,
            }).el,
            new RibbonButton({ label: 'Not enough stamina', variant: 'plain', width: 300, disabled: true }).el,
          );
        },
      },
    ],
  },
  {
    id: 'TintButton',
    name: 'TintButton',
    group: 'controls',
    blurb: 'A button framed by a tintable ornament, so its colour can carry the rarity, faction or element.',
    description:
      '`Button` wears the theme\'s painted plate and therefore looks like the rest of the theme. This one is for the cases where the *colour is the information* — rarity on a loot action, faction on a war board, element on a hero pick. The ornament is 9-sliced as a `mask-border` over an arbitrary paint, which is why a gradient works where a recoloured PNG could not.',
    tags: ['tint', 'rarity', 'faction', 'ornament', 'coloured', 'frame', 'gradient', 'mask', 'legendary', 'element'],
    related: ['TintFrame', 'Button', 'TierBadge', 'ItemCard'],
    demos: [
      {
        title: 'One PNG, six rarities',
        note: 'Same ornament every time — only the paint under the mask changes.',
        build: () =>
          row(
            new TintButton({ label: 'Common', rarity: 'common', shape: 2 }).el,
            new TintButton({ label: 'Rare', rarity: 'rare', shape: 2 }).el,
            new TintButton({ label: 'Epic', rarity: 'epic', shape: 2, glyph: 'glyph-arcane-symbol' }).el,
            new TintButton({ label: 'Legendary', rarity: 'legendary', shape: 7, glow: true, glyph: 'glyph-trophy-cup' }).el,
            new TintButton({ label: 'Mythic', rarity: 'mythic', shape: 7, glow: true, filled: true }).el,
            new TintButton({
              label: 'Ashfall', shape: 12, filled: true,
              tint: 'linear-gradient(160deg,#ffd98a,#7a3d05)', glyph: 'glyph-magic-flame',
            }).el,
          ),
      },
    ],
  },
  {
    id: 'SplitButton',
    name: 'SplitButton',
    group: 'controls',
    blurb: 'The common action on the left, its variants behind a caret — Use / Use ×10 / Use all.',
    description:
      'Both halves emit the same `split:action` event with the chosen action, so a caller writes one handler and switches on the id — pressing the big half is exactly "chose the primary". That is the whole point of the shape: the common case stays one tap while the variants stop crowding the screen. The menu closes on outside click, on Escape and on choosing, and all three listeners are released on `destroy()`.',
    tags: ['split button', 'dropdown', 'menu', 'use all', 'variants', 'bulk', 'caret', 'actions', 'multi', 'quantity'],
    related: ['Button', 'ContextMenu', 'NumberStepper', 'ButtonGroup'],
    demos: [
      {
        title: 'Use one, ten, or all of them',
        note: 'Press the caret. Both halves fire `split:action`, so one handler covers everything.',
        build: () => {
          const use = new SplitButton({
            primary: { id: 'use1', label: 'Use', glyph: 'glyph-health-potion' },
            actions: [
              { id: 'use10', label: 'Use ×10', note: 'You have 24', glyph: 'glyph-health-potion' },
              { id: 'useall', label: 'Use all', note: 'Cannot be undone', glyph: 'glyph-exploding-bomb' },
              { id: 'sell', label: 'Sell duplicates', note: 'Nothing to sell', disabled: true },
            ],
          });
          use.on<SplitAction>('split:action', (a) => console.log('chose', a.id));
          return row(use.el);
        },
      },
    ],
  },
  {
    id: 'ToggleButton',
    name: 'ToggleButton',
    group: 'controls',
    blurb: 'A button that stays pressed: auto-battle, mute, lock formation, skip cutscenes.',
    description:
      '`Toggle` is the settings-row switch, with a track and a knob; this is a *button* that happens to latch, for the places a switch would be wrong — a combat HUD, a toolbar, a filter row. The pressed state swaps to the theme\'s lit plate rather than filtering the idle one. It carries `aria-pressed` rather than a checkbox role, which is what lets a screen reader describe it as an action that is currently on rather than as a setting.',
    tags: ['toggle', 'latch', 'auto battle', 'mute', 'pressed', 'sticky', 'on off', 'hud', 'filter', 'lock'],
    related: ['Toggle', 'SegmentedControl', 'IconButton', 'BattleControls'],
    demos: [
      {
        title: 'Square HUD toggles and a wide one',
        note: 'Press them. The plate swaps to the lit texture, the glyph takes the tone, and the pip lights.',
        build: () => {
          const auto = new ToggleButton({
            label: 'Auto', onLabel: 'Auto on', glyph: 'glyph-hourglass',
            variant: 'square', tone: 'gold', pip: true,
          });
          auto.on<boolean>('toggle:change', (on) => console.log('auto', on));
          return row(
            auto.el,
            new ToggleButton({ label: 'Mute', glyph: 'glyph-peace-dove', variant: 'square', tone: 'danger', pressed: true }).el,
            new ToggleButton({ label: 'Lock formation', glyph: 'glyph-shield-block', tone: 'accent' }).el,
            new ToggleButton({ label: 'Skip scenes', onLabel: 'Skipping', glyph: 'glyph-rockets', tone: 'success', pressed: true }).el,
          );
        },
      },
    ],
  },
  {
    id: 'CostButton',
    name: 'CostButton',
    group: 'controls',
    blurb: 'The purchase button, with the price on it and the arithmetic already done.',
    description:
      'Two things every shop button gets wrong. The first is letting the press through and failing on the server; this one checks the balance, refuses, and emits `cost:short` with *how many* are missing — exactly the number a top-up sheet needs. The second is hiding the shortfall: the price turns red and the button prints what is missing rather than going quietly grey, because a player who cannot tell why a button is dead assumes the game is broken.',
    tags: ['buy', 'price', 'cost', 'purchase', 'gems', 'shop', 'revive', 'refresh', 'affordable', 'currency'],
    related: ['ShopPanel', 'CurrencyBar', 'OfferCard', 'ExchangeShop'],
    demos: [
      {
        title: 'Affordable, discounted, short, and free',
        note: 'Press the third — it refuses and says exactly how many gems are missing.',
        build: () => {
          const revive = new CostButton({
            label: 'Revive', cost: 50, currency: 'gems',
            currencyGlyph: 'glyph-celestial-body', balance: 320,
          });
          revive.on('cost:buy', () => console.log('revived'));

          const short = new CostButton({
            label: 'Refresh shop', cost: 120, currency: 'gems',
            currencyGlyph: 'glyph-celestial-body', balance: 32,
          });
          short.on<number>('cost:short', (missing) => console.log('need', missing, 'more'));

          return row(
            revive.el,
            new CostButton({
              label: 'Buy', cost: 480, wasCost: 800, tag: '−40%', currency: 'gems',
              currencyGlyph: 'glyph-celestial-body', balance: 3200, size: 'lg',
            }).el,
            short.el,
            new CostButton({ label: 'Daily pull', cost: 160, free: true, currencyGlyph: 'glyph-celestial-body' }).el,
          );
        },
      },
    ],
  },
  {
    id: 'GemButton',
    name: 'GemButton',
    group: 'controls',
    blurb: 'The one big round call to action a screen is organised around: Summon, Spin, Start, Enter.',
    description:
      'The gem is drawn rather than textured — a stack of radial gradients for the dome, the rim light and the inner shadow — so it takes any colour a game wants for a faction, an element or a season without a new asset. `charge` turns the rim into a filling arc, which is how a free-pull timer reads without a second control beside it. `pulse` is off by default: it is the loudest thing this library can do, and it only means anything while it is the only thing doing it.',
    tags: ['gem', 'orb', 'summon', 'spin', 'big button', 'round', 'primary', 'cta', 'glow', 'pulse'],
    related: ['SummonScreen', 'SpinWheel', 'RibbonButton', 'ProgressRing'],
    demos: [
      {
        title: 'Summon, spin, and a charging free pull',
        note: 'Only the first pulses. The third\'s rim arc is a free-pull timer at 68%.',
        build: () => {
          const summon = new GemButton({
            label: 'Summon ×10', glyph: 'glyph-celestial-body', size: 128,
            color: '#c2764a', pulse: true, ring: true, badge: 3,
          });
          summon.on('gem:press', () => console.log('summon'));
          return row(
            summon.el,
            new GemButton({ label: 'Spin', glyph: 'glyph-trophy-cup', size: 104, color: '#6fb3a8', ring: true }).el,
            new GemButton({ label: 'Free pull', glyph: 'glyph-hourglass', size: 104, color: '#9a6fd0', charge: 0.68 }).el,
            new GemButton({ label: 'Locked', glyph: 'glyph-broken-shackle', size: 88, color: '#6a6a72', disabled: true }).el,
          );
        },
        stage: 'scene',
      },
    ],
  },
  {
    id: 'KeycapButton',
    name: 'KeycapButton',
    group: 'controls',
    blurb: 'A physical-looking key for control diagrams, tutorial prompts and rebinding lists.',
    description:
      'The three states this has to get right are *bound*, *listening* and *clashing*, and games routinely conflate the last two. Listening is a live invitation, with the cap pressed in and blinking; a clash is a finished binding that is wrong and stays fully readable in red, because fading it would hide the very thing the player has to fix. `held` is separate again — a live input readout, which is the fastest way to explain a control scheme.',
    tags: ['keycap', 'keybind', 'rebind', 'controls', 'hotkey', 'key', 'tutorial prompt', 'input', 'shortcut', 'legend'],
    related: ['KeybindInput', 'SettingsScreen', 'TutorialTip', 'IconButton'],
    demos: [
      {
        title: 'A rebinding list',
        note: 'Click a cap and press a key. Escape cancels. The last row shows a clash.',
        build: () => {
          const jump = new KeycapButton({ cap: 'Space', action: 'Jump', shape: 'wide', glyph: 'glyph-rockets' });
          jump.on<string>('key:bind', (key) => console.log('jump →', key));
          return col(
            jump.el,
            new KeycapButton({ cap: 'W', action: 'Forward', glyph: 'glyph-magic-arrow', held: true }).el,
            new KeycapButton({ cap: 'Q', action: 'Ability 1', glyph: 'glyph-magic-flame' }).el,
            new KeycapButton({ cap: 'E', action: 'Interact', glyph: 'glyph-spell-book', conflict: true }).el,
            new KeycapButton({ cap: 'LMB', action: 'Attack', glyph: 'glyph-crossed-swords', readonly: true }).el,
          );
        },
      },
    ],
  },
  {
    id: 'ArrowButton',
    name: 'ArrowButton',
    group: 'controls',
    blurb: 'The directional nav button: carousel arrows, page turns, chapter steps, roster paging.',
    description:
      'The arrow is a CSS chevron rather than a glyph asset, so it is sharp at any size, takes the button\'s colour, and can never be the thing still loading when a player wants to page. `repeat` starts after a short delay and then fires on an interval — the same contract as a keyboard\'s auto-repeat — and every timer it starts is released on `destroy()`, because a held arrow on a screen that navigates away is the easiest leak in this library to write by accident.',
    tags: ['arrow', 'chevron', 'next', 'previous', 'carousel', 'paging', 'nav', 'stepper', 'repeat', 'direction'],
    related: ['Pagination', 'Carousel', 'IconButton', 'BannerCarousel'],
    demos: [
      {
        title: 'Shapes, labels and a held repeat',
        note: 'Hold the down arrow — after a beat it repeats, exactly like a key does.',
        build: () => {
          const scrub = new ArrowButton({ direction: 'down', shape: 'square', repeat: true, repeatEvery: 90, title: 'Scroll down' });
          scrub.on('arrow:press', () => console.log('scroll'));
          return row(
            new ArrowButton({ direction: 'left', shape: 'round', title: 'Previous hero' }).el,
            new ArrowButton({ direction: 'right', shape: 'round', title: 'Next hero' }).el,
            new ArrowButton({ direction: 'left', shape: 'square', label: 'Chapter 3', title: 'Previous chapter' }).el,
            new ArrowButton({ direction: 'right', shape: 'square', label: 'Chapter 5', title: 'Next chapter' }).el,
            scrub.el,
            new ArrowButton({ direction: 'right', shape: 'bare', title: 'End of list', disabled: true }).el,
          );
        },
      },
    ],
  },
  {
    id: 'MenuButton',
    name: 'MenuButton',
    group: 'controls',
    blurb: 'One row of a hub menu: emblem, destination, what is waiting there, and a badge for anything unclaimed.',
    description:
      'A locked row stays in the menu and swaps its note for the requirement, which is the point: a hub that hides what you have not unlocked gives a new player nothing to aim at. The press is refused at the component rather than by the caller, so a locked destination cannot be navigated to by a handler that forgot to check — `menu:locked` fires instead, carrying the requirement.',
    tags: ['menu', 'hub', 'main menu', 'navigation', 'destination', 'badge', 'locked', 'row', 'pause menu', 'drawer'],
    related: ['MainMenu', 'PauseMenu', 'SideNav', 'BottomNav'],
    demos: [
      {
        title: 'A hub with one locked destination',
        note: 'Press the locked row — it refuses and emits `menu:locked` with the requirement.',
        build: () => {
          const arena = new MenuButton({
            label: 'Arena', note: '3 free entries left', glyph: 'glyph-crossed-swords',
            badge: 3, width: 320,
          });
          arena.on('menu:go', () => console.log('to arena'));

          const raid = new MenuButton({
            label: 'Clan raid', glyph: 'glyph-flaming-skull', width: 320,
            locked: true, requirement: 'Reach guild level 5',
          });
          raid.on<string>('menu:locked', (why) => console.log('locked:', why));

          return col(
            new MenuButton({ label: 'Campaign', note: 'Chapter 4 — The Sunken Gate', glyph: 'glyph-magic-staff', current: true, width: 320 }).el,
            arena.el,
            new MenuButton({ label: 'Guild', note: 'Ashfall · 42 members', glyph: 'glyph-holy-totem', dot: true, width: 320 }).el,
            raid.el,
          );
        },
      },
    ],
  },
  {
    id: 'LoadingButton',
    name: 'LoadingButton',
    group: 'controls',
    blurb: 'A button that owns its round-trip: press, go busy, report what happened.',
    description:
      'Double-submission is the bug this exists to kill: the button disables itself the instant it goes busy, so a second tap during a slow request cannot send a second claim. It never leaves busy on its own — only `succeed()` or `fail()` ends it — because a spinner that times out optimistically is how a UI ends up disagreeing with the server. A failure returns to a pressable state with the reason in the title, since an action a player can neither retry nor understand is worse than one that simply did not work.',
    tags: ['loading', 'async', 'submit', 'spinner', 'busy', 'network', 'claim', 'retry', 'double submit', 'pending'],
    related: ['Button', 'HoldButton', 'LoadingDots', 'ConnectionStatus'],
    demos: [
      {
        title: 'One succeeds, one fails',
        note: 'Press either. Both go busy and refuse a second press; the failure comes back pressable.',
        build: () => {
          const claim = new LoadingButton({
            label: 'Claim', busyLabel: 'Claiming…', doneLabel: 'Claimed',
            glyph: 'glyph-trophy-cup', tone: 'gold',
          });
          claim.on('load:press', () => setTimeout(() => claim.succeed(), 1100));

          const join = new LoadingButton({
            label: 'Join guild', busyLabel: 'Sending…', failLabel: 'Try again',
            glyph: 'glyph-holy-totem',
          });
          join.on('load:press', () => setTimeout(() => join.fail('Guild is full'), 1100));

          return row(claim.el, join.el);
        },
      },
    ],
  },
  {
    id: 'ButtonGroup',
    name: 'ButtonGroup',
    group: 'controls',
    blurb: 'Puts buttons in a row and makes them behave as one control — dialog footers, HUD action bars.',
    description:
      '`fill` is what a dialog footer wants and a toolbar does not: every button shares the width evenly, so a two-word label and a six-word one still make a symmetrical pair. `joined` butts them into a single bar with the inner corners squared, which is the shape a segmented action bar needs without pretending to be `SegmentedControl` — these stay independent buttons, each with its own handler and disabled state. The group is a `role="group"`, not a toolbar: a toolbar promises arrow-key roving focus, and claiming that without implementing it is worse than claiming nothing.',
    tags: ['button group', 'row', 'footer', 'toolbar', 'joined', 'segmented', 'layout', 'dialog', 'actions', 'bar'],
    related: ['Button', 'SegmentedControl', 'SplitButton', 'Modal'],
    demos: [
      {
        title: 'A dialog footer, a joined bar and a HUD row',
        note: '`fill` makes the footer symmetrical; `joined` butts the middle bar into one piece.',
        build: () =>
          col(
            new ButtonGroup({
              label: 'Confirm sale', gap: 'tight', fill: true, align: 'end',
              style: { width: '340px' },
              buttons: [
                new IconButton({ preset: 'back', size: 44, label: 'Cancel' }).el,
                new CostButton({ label: 'Sell', cost: 240, currencyGlyph: 'glyph-trophy-cup', balance: 12480, block: true }).el,
              ],
            }).el,
            new ButtonGroup({
              label: 'Battle speed', gap: 'joined',
              buttons: [
                new ToggleButton({ label: '×1', variant: 'square', size: 46, pressed: true }).el,
                new ToggleButton({ label: '×2', variant: 'square', size: 46 }).el,
                new ToggleButton({ label: '×4', variant: 'square', size: 46, tone: 'gold' }).el,
              ],
            }).el,
            new ButtonGroup({
              label: 'Battle actions', gap: 'tight',
              buttons: [
                new AbilityButton({ art: 'fire-flame-burst', name: 'Emberdash', key: 'Q', size: 52 }).el,
                new AbilityButton({ art: 'earth-stone-blade', name: 'Cleave', key: 'W', size: 52, cooldown: 2.1, cooldownMax: 6 }).el,
                new AbilityButton({ art: 'icon-shield', name: 'Guard', key: 'E', size: 52 }).el,
                new ToggleButton({ label: 'Auto', glyph: 'glyph-hourglass', variant: 'square', size: 52, tone: 'gold', pip: true }).el,
              ],
            }).el,
          ),
      },
    ],
  },
];
