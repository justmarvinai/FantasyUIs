import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { ObjectiveBanner, type ObjectiveBannerOptions } from '../../lib/components/ObjectiveBanner.ts';
import { ImpactFrame } from '../../lib/components/ImpactFrame.ts';
import { Nameplate } from '../../lib/components/Nameplate.ts';
import { TutorialMask } from '../../lib/components/TutorialMask.ts';
import { CountdownOverlay } from '../../lib/components/CountdownOverlay.ts';

/** A dark box the size of a HUD, for components that overlay a scene. */
const scene = (height: string, ...kids: Node[]) =>
  h('div', {
    class: 'demo-scene',
    style: {
      position: 'relative',
      width: '100%',
      height,
      borderRadius: '8px',
      overflow: 'hidden',
      background:
        'radial-gradient(ellipse at 50% 30%, rgba(120,90,60,.35), transparent 60%), #16130f',
    },
  }, ...kids);

export const SIGNALS: CatalogEntry[] = [
  {
    id: 'ObjectiveBanner',
    name: 'ObjectiveBanner',
    group: 'feedback',
    blurb: 'The wide banner that sweeps in mid-mission to say the rules just changed.',
    description:
      'Announcements interrupt each other: `show()` while one is on screen re-runs the entrance on the new text rather than queueing, because a player who has just been told "the gate is falling" should not have to sit through the previous banner first. One expiry timer is replaced on every call and cleared on destroy, so an interrupted banner cannot take the new one down with it.',
    tags: ['objective', 'banner', 'announcement', 'mission', 'hud', 'alert', 'wave', 'quest', 'sweep', 'notification'],
    related: ['ToastStack', 'KillFeed', 'CountdownOverlay', 'QuestTracker'],
    demos: [
      {
        title: 'Four tones',
        note: 'Objective, warning, success and failure. Click a banner to replay its entrance.',
        build: () => {
          const make = (opts: ObjectiveBannerOptions) => {
            const banner = new ObjectiveBanner({ linger: 0, ...opts });
            banner.el.style.cursor = 'pointer';
            banner.el.addEventListener('click', () => banner.show());
            return banner.el;
          };
          return scene('300px',
            h('div', {
              style: { position: 'absolute', inset: '0', display: 'grid', alignContent: 'center', gap: '14px', justifyItems: 'center' },
            },
              make({ kicker: 'New objective', title: 'Defend the Gate', detail: 'Survive three waves · 02:00', icon: 'glyph-shield-block', tone: 'objective' }),
              make({ kicker: 'Warning', title: 'The Maw has awoken', detail: 'Leave the inner ring', icon: 'glyph-flaming-skull', tone: 'warning' }),
              make({ kicker: 'Objective complete', title: 'Shrine secured', icon: 'glyph-holy-totem', tone: 'success' }),
              make({ kicker: 'Failed', title: 'The gate has fallen', detail: 'Retreat to the keep', icon: 'glyph-broken-shackle', tone: 'failure' }),
            ),
          );
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'ImpactFrame',
    name: 'ImpactFrame',
    group: 'feedback',
    blurb: 'The one-frame punctuation on a big hit — flash, burst, speed lines and a word that lands.',
    description:
      'The whole effect is one CSS animation per layer keyed off a playing flag, and `play()` restarts it by toggling the flag with a forced reflow between — so a second crit inside 200 ms replays cleanly instead of being swallowed by the animation still running. `power` is a single knob wired to burst size, shake distance and line opacity together, because three numbers a caller has to keep in agreement is how effects end up mismatched at the extremes.',
    tags: ['impact', 'crit', 'hit', 'flash', 'speed lines', 'freeze frame', 'juice', 'feedback', 'anime', 'burst'],
    related: ['FloatingText', 'DamageVignette', 'Reticle', 'ComboCounter'],
    demos: [
      {
        title: 'Five kinds of hit',
        note: 'Press a button — the frame replays over the scene. Tones are crit, break, heal, block and miss.',
        build: () => {
          const impact = new ImpactFrame({ tone: 'crit', power: 0.9, lines: true });
          const shots: Array<[string, string, string, Parameters<typeof impact.setTone>[0], number]> = [
            ['Critical', 'CRITICAL', '2,481', 'crit', 0.95],
            ['Break', 'BREAK!', 'Guard shattered', 'break', 0.8],
            ['Heal', 'MENDED', '+640', 'heal', 0.5],
            ['Block', 'BLOCKED', '', 'block', 0.45],
            ['Miss', 'MISS', '', 'miss', 0.25],
          ];
          const buttons = h('div', {
            style: { position: 'absolute', left: '0', right: '0', bottom: '12px', display: 'flex', gap: '8px', justifyContent: 'center', zIndex: '2' },
          });
          for (const [label, text, sub, tone, power] of shots) {
            const btn = h('button', { class: 'demo-btn', text: label, attrs: { type: 'button' } });
            btn.addEventListener('click', () => impact.setTone(tone, power).play(text, sub));
            buttons.appendChild(btn);
          }
          return scene('280px', impact.el, buttons);
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'Nameplate',
    name: 'Nameplate',
    group: 'feedback',
    blurb: 'The floating plate over a unit: name, level, health, shield, cast bar and the statuses stuck to it.',
    description:
      'Shield is drawn as an overlay riding on top of the health fill rather than as a second bar, because that is how a player reads "there is more to chew through than the health says". An interruptible cast gets a pale bar and an uninterruptible one gets a hard red — the single most important distinction on a nameplate, and the one most implementations bury in a tooltip.',
    tags: ['nameplate', 'health bar', 'unit frame', 'overhead', 'target', 'cast bar', 'shield', 'elite', 'boss', 'mmo'],
    related: ['BossHealthBar', 'PartyFrame', 'Reticle', 'BuffBar'],
    demos: [
      {
        title: 'Four units in a fight',
        note: 'A boss mid-cast, an elite with a shield, an ally, and something almost dead.',
        build: () =>
          scene('220px',
            h('div', {
              style: { position: 'absolute', inset: '0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', placeItems: 'center' },
            },
              new Nameplate({
                name: 'The Maw', level: 62, side: 'enemy', tier: 'boss', health: 0.64, targeted: true, width: 170,
                effects: ['glyph-magic-flame', 'glyph-cursed-eye'],
                cast: { name: 'Devouring Tide', progress: 0.7, interruptible: false },
              }).el,
              new Nameplate({
                name: 'Bog Warden', level: 42, side: 'enemy', tier: 'elite', health: 0.72, shield: 0.18,
                effects: ['glyph-thorny-branch'],
                cast: { name: 'Strangling Vines', progress: 0.35 },
              }).el,
              new Nameplate({
                name: 'Sablewick', level: 58, tag: 'Ashfall', side: 'party', health: 0.88, effects: ['glyph-shield-block'],
              }).el,
              new Nameplate({ name: 'Ash Husk', level: 38, side: 'enemy', health: 0.14 }).el,
            ),
          ),
        stage: 'wide',
      },
    ],
  },
  {
    id: 'TutorialMask',
    name: 'TutorialMask',
    group: 'feedback',
    blurb: 'Dim everything but one thing — the first-run overlay that walks a player through a screen.',
    description:
      '`TutorialTip` points at a thing; this takes the whole screen away except that thing. The hole is a `box-shadow` with an enormous spread on a transparent element, not four dimming panels: one box, one radius, and a shape that can animate between steps. It measures the target against its *own* rect rather than the viewport, so it works inside a transformed stage exactly as it does over a whole page.',
    tags: ['tutorial', 'onboarding', 'overlay', 'spotlight', 'mask', 'coach mark', 'first run', 'highlight', 'steps', 'guide'],
    related: ['TutorialTip', 'Modal', 'ObjectiveBanner', 'Tooltip'],
    demos: [
      {
        title: 'Step two of five',
        note: 'Next cycles the hole between the three fake buttons; the card follows and flips above when there is no room below.',
        build: () => {
          const targets = ['Bag', 'Map', 'Skills'].map((label, i) =>
            h('button', {
              class: 'demo-btn',
              text: label,
              attrs: { type: 'button' },
              style: { position: 'absolute', left: `${18 + i * 90}px`, top: '18px' },
            }),
          );
          const box = scene('300px', ...targets);
          const steps = [
            { title: 'Your bag', body: 'Everything you pick up lands here. It fills up faster than you think.' },
            { title: 'The map', body: 'Fast travel between any shrine you have lit.' },
            { title: 'Skills', body: 'Spend the points you earned levelling. You can respec at any shrine.' },
          ];
          let at = 0;
          const mask = new TutorialMask({
            ...steps[0], step: 1, steps: 5, shape: 'circle', pad: 10, skipLabel: 'Skip tutorial',
          });
          box.appendChild(mask.el);
          mask.on('tutorial:next', () => {
            at = (at + 1) % steps.length;
            mask.focusElement(targets[at], { ...steps[at], step: at + 1 });
          });
          mask.on('tutorial:skip', () => mask.close());
          // Measure once the stage has a box — a constructor runs before layout.
          requestAnimationFrame(() => mask.focusElement(targets[0]));
          return box;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'CountdownOverlay',
    name: 'CountdownOverlay',
    group: 'feedback',
    blurb: 'Three, two, one, fight — the pre-match countdown with a ring that drains on every number.',
    description:
      'The go-word fires its event when it *appears*, not when the overlay clears, so the fight starts on the frame the player sees "Fight!" — waiting for the hold to finish is what makes a countdown feel a beat late. `start()` on a running countdown restarts it cleanly rather than running two interleaved timers, which is the usual cause of a doubled "1".',
    tags: ['countdown', 'ready', 'fight', 'start', 'overlay', 'round', 'timer', 'match', 'three two one', 'versus'],
    related: ['CountdownTimer', 'ObjectiveBanner', 'SceneTransition', 'PhaseTracker'],
    demos: [
      {
        title: 'Round two',
        note: 'Press start. `countdown:go` fires on the frame the word lands, not when the overlay clears.',
        build: () => {
          const count = new CountdownOverlay({ from: 3, go: 'Fight!', label: 'Round 2', dim: true, interval: 800 });
          count.on<number>('countdown:tick', (n) => console.log('tick', n));
          count.on('countdown:go', () => console.log('battle begins'));
          const start = h('button', {
            class: 'demo-btn',
            text: 'Start countdown',
            attrs: { type: 'button' },
            style: { position: 'absolute', left: '50%', bottom: '14px', transform: 'translateX(-50%)', zIndex: '2' },
          });
          start.addEventListener('click', () => count.start());
          return scene('280px', count.el, start);
        },
        stage: 'wide',
      },
    ],
  },
];
