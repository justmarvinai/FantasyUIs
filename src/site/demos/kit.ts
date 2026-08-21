import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { TintFrame } from '../../lib/components/TintFrame.ts';
import { ProgressRing } from '../../lib/components/ProgressRing.ts';
import { SegmentedControl } from '../../lib/components/SegmentedControl.ts';
import { NumberStepper } from '../../lib/components/NumberStepper.ts';
import { StatChip } from '../../lib/components/StatChip.ts';
import { EmptyState } from '../../lib/components/EmptyState.ts';
import { Accordion } from '../../lib/components/Accordion.ts';
import { Carousel } from '../../lib/components/Carousel.ts';
import { LoadingDots } from '../../lib/components/LoadingDots.ts';
import { ConfirmSlider } from '../../lib/components/ConfirmSlider.ts';
import { TutorialTip } from '../../lib/components/TutorialTip.ts';

import { Toggle } from '../../lib/components/Toggle.ts';
import { Slider } from '../../lib/components/Slider.ts';

const row = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-row' }, ...kids.filter(Boolean));
const col = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-col' }, ...kids.filter(Boolean));

/** A contained viewport, so `position: fixed` components render inline. */
const screen = (height = 340) =>
  h('div', { class: 'demo-screen', style: { height: `${height}px` } });

export const KIT: CatalogEntry[] = [
  {
    id: 'TintFrame',
    name: 'TintFrame',
    group: 'surfaces',
    blurb: 'An ornamental 9-slice border that takes its colour from CSS, not from the file.',
    description:
      'The library ships 32 pixel-art ornament shapes in four centre treatments. Because the art is a pure white silhouette it is drawn as a 9-sliced *mask* with the tint painted underneath, so one 400-byte PNG serves a grey common frame, a purple epic frame and a gold legendary frame. That is 128 framings before you pick a colour at all. Browsers without `mask-border` fall back to the untinted white ornament.',
    tags: ['frame', 'border', 'ornament', 'tint', 'rarity', '9-slice', 'mask', 'panel', 'pixel'],
    related: ['Frame', 'Panel', 'ChampionCard', 'ArtifactCard'],
    demos: [
      {
        title: 'One asset, every rarity',
        note: 'All six are the same PNG. Only `rarity` differs.',
        build: () =>
          row(
            ...(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const).map(
              (rarity) =>
                new TintFrame({
                  shape: 7,
                  rarity,
                  width: 116,
                  height: 92,
                  content: h('span', { class: 'demo-note', text: rarity }),
                }).el,
            ),
          ),
      },
      {
        title: 'Centre treatments',
        note: 'Hollow shows what is behind; scrim washes it; solid and soft fill it.',
        build: () =>
          row(
            ...(['hollow', 'scrim', 'solid', 'soft'] as const).map(
              (fill) =>
                new TintFrame({
                  shape: 21,
                  fill,
                  tint: 'var(--fui-accent)',
                  width: 132,
                  height: 92,
                  content: h('span', { class: 'demo-note', text: fill }),
                }).el,
            ),
          ),
      },
      {
        title: 'Any paint, gradients included',
        note: 'The tint is a CSS value, so a gradient works exactly as well as a colour.',
        build: () =>
          row(
            new TintFrame({
              shape: 13,
              fill: 'solid',
              tint: 'linear-gradient(160deg, #ffd98a, #c8791f 55%, #7a3d05)',
              width: 168,
              height: 108,
              content: h('span', { class: 'demo-note', text: 'Gilded' }),
            }).el,
            new TintFrame({
              shape: 26,
              fill: 'scrim',
              tint: 'linear-gradient(180deg, #6fb3a8, #1d3f4a)',
              glow: true,
              width: 168,
              height: 108,
              content: h('span', { class: 'demo-note', text: 'Tidewrought' }),
            }).el,
            new TintFrame({
              shape: 30,
              tint: 'var(--fui-danger)',
              glow: true,
              scale: 1,
              width: 168,
              height: 108,
              content: h('span', { class: 'demo-note', text: 'Bloodbound' }),
            }).el,
          ),
      },
      {
        title: 'The shape library',
        note: 'Thirty-two corner and edge treatments, each usable in any colour.',
        build: () =>
          row(
            ...Array.from({ length: 16 }, (_, i) =>
              new TintFrame({
                shape: i + 1,
                tint: 'var(--fui-gold)',
                scale: 0.55,
                width: 78,
                height: 62,
              }).el,
            ),
          ),
      },
    ],
  },

  {
    id: 'ProgressRing',
    name: 'ProgressRing',
    group: 'data',
    blurb: 'A circular dial for cooldowns, refill timers and completion.',
    description:
      'Drawn with a `conic-gradient` and a radial mask, so there is no SVG, nothing to reflow, and the sweep animates on the compositor.',
    tags: ['progress', 'ring', 'circle', 'dial', 'cooldown', 'timer', 'percent', 'radial'],
    related: ['StatBar', 'CountdownTimer', 'EnergyBar'],
    demos: [
      {
        title: 'Resources',
        build: () =>
          row(
            new ProgressRing({ value: 68, kind: 'health', sublabel: 'Health' }).el,
            new ProgressRing({ value: 41, kind: 'mana', sublabel: 'Mana' }).el,
            new ProgressRing({ value: 84, kind: 'xp', sublabel: 'Level 42' }).el,
            new ProgressRing({ value: 92, color: 'var(--fui-gold)', sublabel: 'Season' }).el,
          ),
      },
      {
        title: 'A refill countdown',
        note: '`countdown` prints the value as m:ss instead of a percentage.',
        build: () => {
          const ring = new ProgressRing({
            value: 148,
            max: 300,
            countdown: true,
            sublabel: 'Energy',
            kind: 'stamina',
            size: 96,
            reverse: true,
          });
          ring.on<number>('ring:complete', () => console.log('energy full'));
          return row(ring.el);
        },
      },
      {
        title: 'Sizes and bare rings',
        build: () =>
          row(
            new ProgressRing({ value: 30, size: 40, thickness: 5, bare: true }).el,
            new ProgressRing({ value: 55, size: 60, bare: true, kind: 'rage' }).el,
            new ProgressRing({ value: 76, size: 110, label: 'B+', sublabel: 'Rank' }).el,
          ),
      },
    ],
  },

  {
    id: 'SegmentedControl',
    name: 'SegmentedControl',
    group: 'controls',
    blurb: 'A one-of-N switch that keeps every option visible and one tap away.',
    description:
      'The pattern mobile RPGs use for roster filters, shop currencies and difficulty tiers, because it costs one tap where a dropdown costs two. A single thumb slides between segments, so selection reads as one travelling object.',
    tags: ['segmented', 'switch', 'tabs', 'toggle', 'filter', 'difficulty', 'picker'],
    related: ['Tabs', 'Toggle', 'FilterBar', 'BottomNav'],
    demos: [
      {
        title: 'Difficulty',
        build: () => {
          const diff = new SegmentedControl({
            segments: [
              { value: 'normal', label: 'Normal' },
              { value: 'hard', label: 'Hard' },
              { value: 'brutal', label: 'Brutal' },
              { value: 'nightmare', label: 'Nightmare', badge: 'NEW' },
            ],
            value: 'hard',
          });
          diff.on<string>('segment:change', (v) => console.log('difficulty', v));
          return row(diff.el);
        },
      },
      {
        title: 'With glyphs and counts',
        build: () =>
          col(
            new SegmentedControl({
              segments: [
                { value: 'all', label: 'All', badge: 128 },
                { value: 'gear', label: 'Gear', glyph: 'glyph-shield-block', badge: 64 },
                { value: 'skills', label: 'Skills', glyph: 'glyph-spell-book' },
                { value: 'locked', label: 'Locked', glyph: 'glyph-broken-shackle', disabled: true },
              ],
              size: 'sm',
            }).el,
            new SegmentedControl({
              segments: [
                { value: 'day', label: 'Daily' },
                { value: 'week', label: 'Weekly' },
                { value: 'season', label: 'Season' },
              ],
              size: 'lg',
              block: true,
            }).el,
          ),
      },
    ],
  },

  {
    id: 'NumberStepper',
    name: 'NumberStepper',
    group: 'controls',
    blurb: 'A quantity picker with hold-to-repeat and a running cost.',
    description:
      'Holding a button repeats and then accelerates, so picking 87 of something does not cost 87 taps. Pass `unitCost` and it keeps a running total beside the count.',
    tags: ['stepper', 'quantity', 'number', 'input', 'shop', 'buy', 'amount', 'counter'],
    related: ['Slider', 'ShopPanel', 'OfferCard', 'TextInput'],
    demos: [
      {
        title: 'Buying stamina potions',
        note: 'Press and hold either button — the repeat accelerates.',
        build: () => {
          const qty = new NumberStepper({
            value: 1,
            max: 99,
            unitCost: 150,
            costGlyph: 'glyph-health-potion',
            maxButton: true,
          });
          qty.on<number>('stepper:change', (n) => console.log('quantity', n));
          return row(qty.el);
        },
      },
      {
        title: 'Variants',
        build: () =>
          col(
            new NumberStepper({ value: 5, min: 1, max: 10, size: 'sm' }).el,
            new NumberStepper({ value: 12, max: 999, step: 1, editable: true }).el,
          ),
      },
    ],
  },

  {
    id: 'StatChip',
    name: 'StatChip',
    group: 'data',
    blurb: 'The labelled stat atom every roster row, tooltip and compare view is built from.',
    description:
      'Small enough to scatter anywhere, but it knows how to render a signed delta — which is the part that would otherwise be reimplemented at every call site.',
    tags: ['stat', 'chip', 'pill', 'badge', 'attack', 'defence', 'speed', 'delta'],
    related: ['CompareStats', 'ChampionCard', 'StatsPanel', 'Badge'],
    demos: [
      {
        title: 'A champion’s stat line',
        build: () =>
          row(
            new StatChip({ glyph: 'glyph-crossed-swords', label: 'ATK', value: 1482 }).el,
            new StatChip({ glyph: 'glyph-shield-block', label: 'DEF', value: 1104 }).el,
            new StatChip({ glyph: 'glyph-health-potion', label: 'HP', value: 24_180, compact: true }).el,
            new StatChip({ glyph: 'glyph-hourglass', label: 'SPD', value: 212, tone: 'accent' }).el,
          ),
      },
      {
        title: 'Deltas',
        note: 'Pass `delta` and the chip renders the sign, the colour and the arrow.',
        build: () =>
          row(
            new StatChip({ label: 'C.RATE', value: 62, suffix: '%', delta: 15, tone: 'gold' }).el,
            new StatChip({ label: 'C.DMG', value: 128, suffix: '%', delta: 38, tone: 'gold' }).el,
            new StatChip({ label: 'ACC', value: 40, delta: -12 }).el,
            new StatChip({ label: 'RES', value: 90, delta: 0 }).el,
          ),
      },
      {
        title: 'Tones and sizes',
        build: () =>
          row(
            new StatChip({ label: 'Power', value: 184_320, compact: true, tone: 'gold' }).el,
            new StatChip({ label: 'Wins', value: 41, tone: 'good', size: 'sm' }).el,
            new StatChip({ label: 'Losses', value: 12, tone: 'bad', size: 'sm' }).el,
            new StatChip({ label: 'Rank', value: '#284', tone: 'info', size: 'sm' }).el,
          ),
      },
    ],
  },

  {
    id: 'Accordion',
    name: 'Accordion',
    group: 'controls',
    blurb: 'Collapsible sections for settings groups, objectives and boss mechanics.',
    description:
      'Heights animate through `grid-template-rows: 0fr → 1fr`, so a section opens smoothly without anyone measuring its content first.',
    tags: ['accordion', 'collapse', 'expand', 'section', 'settings', 'faq', 'disclosure'],
    related: ['Tabs', 'SettingsScreen', 'QuestLog'],
    demos: [
      {
        title: 'Settings groups',
        note: 'One open at a time by default; pass `multi` to allow several.',
        build: () => {
          const accordion = new Accordion({
            sections: [
              {
                title: 'Graphics',
                glyph: 'glyph-celestial-body',
                meta: 'High',
                open: true,
                content: [
                  new Toggle({ label: 'Bloom', checked: true }).el,
                  new Slider({ label: 'Shadow quality', value: 70 }).el,
                ],
              },
              {
                title: 'Audio',
                glyph: 'glyph-spirit-vortex',
                meta: '80%',
                content: [
                  new Slider({ label: 'Music', value: 60 }).el,
                  new Slider({ label: 'Effects', value: 85 }).el,
                ],
              },
              {
                title: 'Battle',
                glyph: 'glyph-crossed-swords',
                content: [
                  new Toggle({ label: 'Auto-repeat', checked: true }).el,
                  new Toggle({ label: 'Skip animations' }).el,
                ],
              },
            ],
          });
          accordion.on<string>('accordion:open', (id) => console.log('opened', id));
          return accordion.el;
        },
      },
    ],
  },

  {
    id: 'Carousel',
    name: 'Carousel',
    group: 'surfaces',
    blurb: 'A snapping horizontal rail for banners, promos and skill pages.',
    description:
      'Autoplay pauses on hover and on focus, and stops for good the moment the player takes manual control. One slide’s stride is derived in CSS, so any `perView` works without measuring.',
    tags: ['carousel', 'slider', 'rail', 'banner', 'rotator', 'slideshow', 'swipe'],
    related: ['BannerCarousel', 'EventBanner', 'OfferCard'],
    demos: [
      {
        title: 'Featured banners',
        note: 'Autoplays every five seconds until you touch it.',
        build: () => {
          const tile = (title: string, tint: string) =>
            new TintFrame({
              shape: 5,
              fill: 'solid',
              tint,
              height: 150,
              content: h('span', { class: 'demo-note', text: title }),
            }).el;

          const banners = new Carousel({
            slides: [
              tile('Void Ascendant', 'linear-gradient(135deg,#5b2a8c,#1d0f2e)'),
              tile('Ember Rising', 'linear-gradient(135deg,#a83c14,#2b0f06)'),
              tile('Tidebound', 'linear-gradient(135deg,#1c5f74,#08202a)'),
            ],
            autoplay: 5000,
            loop: true,
          });
          banners.on<number>('carousel:change', (i) => console.log('banner', i));
          return banners.el;
        },
        stage: 'wide',
      },
      {
        title: 'Three at a time',
        build: () =>
          new Carousel({
            perView: 3,
            gap: 10,
            slides: Array.from(
              { length: 7 },
              (_, i) =>
                new TintFrame({
                  shape: 12 + i,
                  fill: 'scrim',
                  tint: 'var(--fui-accent)',
                  height: 104,
                  content: h('span', { class: 'demo-note', text: `Page ${i + 1}` }),
                }).el,
            ),
          }).el,
        stage: 'wide',
      },
    ],
  },

  {
    id: 'ConfirmSlider',
    name: 'ConfirmSlider',
    group: 'controls',
    blurb: 'Slide-to-confirm for the actions a player must not trigger by accident.',
    description:
      'A modal with a Yes button gets tapped through on reflex; a gesture that has to be completed does not. Use it for spending premium currency, sacrificing a champion, or leaving a clan. Arrow keys and Enter work too, so the gesture is not the only way through.',
    tags: ['confirm', 'slide', 'swipe', 'commit', 'destructive', 'safety', 'purchase'],
    related: ['Modal', 'RankUpPanel', 'Button'],
    demos: [
      {
        title: 'Sacrificing a champion',
        note: 'Drag the handle all the way across, or focus it and press Enter.',
        build: () => {
          const sell = new ConfirmSlider({
            label: 'Slide to sacrifice',
            confirmLabel: 'Sacrificed',
            tone: 'danger',
          });
          sell.on('confirm:done', () => console.log('sacrificed'));
          sell.on('confirm:cancel', () => console.log('let go too early'));
          return sell.el;
        },
      },
      {
        title: 'Tones',
        note: 'A slide gesture needs travel, so give the track a real width.',
        build: () =>
          h(
            'div',
            { class: 'demo-col', style: { width: '380px', maxWidth: '100%' } },
            new ConfirmSlider({ label: 'Slide to summon ×10', tone: 'gold' }).el,
            new ConfirmSlider({ label: 'Slide to start raid' }).el,
            new ConfirmSlider({ label: 'Not enough shards', disabled: true }).el,
          ),
      },
    ],
  },

  {
    id: 'LoadingDots',
    name: 'LoadingDots',
    group: 'feedback',
    blurb: 'An inline busy indicator for waits too short to deserve a loading screen.',
    description:
      'Pure CSS animation with the stagger derived from each dot’s index over the count, so it costs no timers and stops dead under `prefers-reduced-motion`.',
    tags: ['loading', 'spinner', 'dots', 'busy', 'wait', 'matchmaking', 'pending'],
    related: ['LoadingScreen', 'ProgressRing'],
    demos: [
      {
        title: 'Variants',
        build: () =>
          col(
            new LoadingDots({ label: 'Matchmaking' }).el,
            new LoadingDots({ label: 'Summoning', variant: 'pulse', color: 'var(--fui-gold)' }).el,
            new LoadingDots({ label: 'Syncing roster', variant: 'orbit', size: 7 }).el,
            new LoadingDots({ count: 5, size: 6 }).el,
          ),
      },
    ],
  },

  {
    id: 'EmptyState',
    name: 'EmptyState',
    group: 'feedback',
    blurb: 'What a list shows when it has nothing to show.',
    description:
      'Worth building once rather than inlining: a list that renders nothing when it is empty reads as a bug, and every list in a game eventually hits this state.',
    tags: ['empty', 'placeholder', 'zero', 'blank', 'nothing', 'no results'],
    related: ['ChampionList', 'MailInbox', 'InventoryGrid'],
    demos: [
      {
        title: 'A filter that matched nothing',
        build: () => {
          const empty = new EmptyState({
            glyph: 'glyph-owl',
            title: 'No champions match',
            message: 'Try clearing a filter or two — you have 128 champions in total.',
            action: 'Reset filters',
          });
          empty.on('empty:action', () => console.log('reset'));
          return empty.el;
        },
      },
      {
        title: 'Compact',
        build: () =>
          new EmptyState({
            glyph: 'glyph-burning-scroll',
            title: 'Inbox empty',
            size: 'sm',
          }).el,
      },
    ],
  },

  {
    id: 'TutorialTip',
    name: 'TutorialTip',
    group: 'feedback',
    blurb: 'A coach mark: a card pointing at one control, everything else dimmed.',
    description:
      'The spotlight is a single `box-shadow` spread over the whole viewport with a hole where the anchor is, so it costs one element and no canvas. The dimmed area stays click-through, which means a tutorial can never trap the player.',
    tags: ['tutorial', 'onboarding', 'coach mark', 'tooltip', 'spotlight', 'ftue', 'hint'],
    related: ['Tooltip', 'Modal'],
    demos: [
      {
        title: 'Step two of four',
        note: 'The tip anchors itself to the button beside it and spotlights it.',
        build: () => {
          const stage = screen(300);
          const target = h('button', {
            class: 'demo-target',
            text: 'Summon',
            attrs: { type: 'button' },
          });
          stage.appendChild(target);

          const tip = new TutorialTip({
            title: 'Your first summon',
            text: 'Spend an Ancient Shard here. Your first ten pulls guarantee an Epic.',
            anchor: target,
            placement: 'bottom',
            step: 2,
            steps: 4,
            skippable: true,
            spotlight: true,
          });
          tip.on('tip:next', (step) => console.log('advance from', step));
          tip.on('tip:skip', () => console.log('skipped'));
          stage.appendChild(tip.el);
          return stage;
        },
        stage: 'wide',
      },
    ],
  },
];
