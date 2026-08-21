import { h } from '../../lib/core/dom.ts';
import type { CatalogEntry } from '../types.ts';

import { Ribbon } from '../../lib/components/Ribbon.ts';
import { SceneTransition } from '../../lib/components/SceneTransition.ts';
import { Pagination } from '../../lib/components/Pagination.ts';
import { ReorderList } from '../../lib/components/ReorderList.ts';
import { DyePicker } from '../../lib/components/DyePicker.ts';
import { ShareBar } from '../../lib/components/ShareBar.ts';
import { ActivityCalendar } from '../../lib/components/ActivityCalendar.ts';
import { ElementWheel } from '../../lib/components/ElementWheel.ts';

import { ChampionCard } from '../../lib/components/ChampionCard.ts';

const row = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-row' }, ...kids.filter(Boolean));
/** A full-width stack, for components that are a row in a real layout. */
const stack = (...kids: (Node | null | false)[]) =>
  h('div', { class: 'demo-col', style: { width: '100%', alignItems: 'stretch' } },
    ...kids.filter(Boolean));

export const STATION: CatalogEntry[] = [
  {
    id: 'Ribbon',
    name: 'Ribbon',
    group: 'surfaces',
    blurb: 'The corner flash a shop puts over a card — NEW, −50%, SOLD OUT.',
    description:
      'It wraps the card it is marking, so nothing about the card has to change: the wrapper owns the `overflow: hidden` that clips a rotated corner strip, and the card underneath stays a plain component. Pass no `content` and you get the strip alone, ready to drop into a positioned element of your own.',
    tags: ['ribbon', 'badge', 'corner', 'sale', 'new', 'sold out', 'flag', 'shop', 'overlay'],
    related: ['OfferCard', 'ItemCard', 'ShopPanel', 'TierBadge'],
    demos: [
      {
        title: 'Three variants over real cards',
        note: 'The wrapper clips the corner strip, so the card underneath is unchanged.',
        build: () =>
          row(
            new Ribbon({
              text: '-50%',
              tone: 'sale',
              variant: 'corner',
              at: 'top-left',
              content: new ChampionCard({
                name: 'Runeblade', art: 'weapon-runeblade', rarity: 'epic',
                stars: 5, level: 50, power: 84_200, size: 150,
              }).el,
            }).el,
            new Ribbon({
              text: 'Event',
              note: 'Ends Sunday',
              tone: 'event',
              variant: 'banner',
              at: 'bottom-left',
              glyph: 'glyph-shooting-stars',
              content: new ChampionCard({
                name: 'Emberwake', art: 'fire-phoenix-rise', rarity: 'legendary',
                stars: 6, level: 60, power: 128_900, size: 150,
              }).el,
            }).el,
            new Ribbon({
              text: 'Sold',
              tone: 'sold',
              variant: 'flag',
              at: 'top-left',
              content: new ChampionCard({
                name: 'Warhammer', art: 'weapon-warhammer', rarity: 'rare',
                stars: 4, level: 40, power: 41_500, size: 150,
              }).el,
            }).el,
          ),
        stage: 'wide',
      },
    ],
  },
  {
    id: 'SceneTransition',
    name: 'SceneTransition',
    group: 'surfaces',
    blurb: 'Curtains, an iris, a stone gate — the half-second that hides a screen swap.',
    description:
      '`play()` covers the screen, awaits your swap while nothing is visible, then reveals — so the callback can do anything, including work that would flash. Every promise resolves off a `transitionend` *guarded by a timer*, and the timer is the source of truth: an event that never fires (a backgrounded tab, reduced motion, an off-screen element) can never strand the player behind the panels.',
    tags: ['transition', 'wipe', 'curtain', 'iris', 'fade', 'screen', 'loading', 'scene', 'swap'],
    related: ['LoadingScreen', 'Modal', 'StorySlide', 'TitleGate'],
    demos: [
      {
        title: 'Five wipes over a scene',
        note: 'Press a variant to cover and reveal. The swap runs while the screen is hidden.',
        build: () => {
          const stage = h('div', { class: 'demo-screen', style: { height: '240px' } });
          const label = h('p', {
            class: 'demo-note',
            style: { position: 'absolute', inset: 'auto 0 40% 0', textAlign: 'center' },
            text: 'Scene one',
          });
          stage.append(label);

          let n = 1;
          const buttons = h('div', { class: 'demo-row' });
          for (const variant of ['curtain', 'gate', 'iris', 'wipe', 'fade'] as const) {
            const wipe = new SceneTransition({ variant, text: 'Loading', art: 'bg-tile-sm' });
            stage.appendChild(wipe.el);
            const btn = h('button', { class: 'demo-btn', text: variant });
            btn.addEventListener('click', () =>
              wipe.play(() => {
                label.textContent = `Scene ${++n}`;
              }),
            );
            buttons.appendChild(btn);
          }
          return stack(stage, buttons);
        },
        stage: 'wide',
      },
      {
        title: 'What covered looks like',
        note: 'Built with `covered: true`, which is also what the pre-rendered page shows.',
        build: () => {
          const stage = h('div', { class: 'demo-screen', style: { height: '150px' } });
          stage.appendChild(
            new SceneTransition({
              variant: 'gate',
              covered: true,
              art: 'bg-tile-sm',
              text: 'Entering the Vale',
            }).el,
          );
          return stage;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'Pagination',
    name: 'Pagination',
    group: 'controls',
    blurb: 'Page controls with a sliding window, edge jumps and a "showing 21–40 of 312" line.',
    description:
      'The first and last page are always drawn whatever the window does, because "jump to the end" is the second most common thing anyone asks of a pager and losing it to an ellipsis is the classic bug. `setPages()` re-clamps the current page, so shrinking the set while sitting on the last page moves you to the new last page rather than to nothing.',
    tags: ['pagination', 'pager', 'pages', 'next', 'previous', 'list', 'roster', 'inbox'],
    related: ['ChampionList', 'MailInbox', 'AuctionHouse', 'Leaderboard'],
    demos: [
      {
        title: 'A roster of 312 champions',
        note: 'Click through — the window slides and the ellipsis appears once there is a gap.',
        build: () => {
          const pager = new Pagination({
            pages: 12,
            page: 1,
            siblings: 1,
            edges: true,
            total: 312,
            perPage: 28,
            noun: 'champions',
          });
          pager.on<number>('page:change', (p) => console.log('load page', p));
          return pager.el;
        },
        stage: 'wide',
      },
      {
        title: 'Compact, for a sidebar',
        build: () => new Pagination({ pages: 6, page: 3, compact: true }).el,
        stage: 'wide',
      },
    ],
  },
  {
    id: 'ReorderList',
    name: 'ReorderList',
    group: 'controls',
    blurb: 'Drag a priority list into the order you want — skill rotation, target order, team slots.',
    description:
      'Dragging is not the only way to move a row. Every list also ships arrow buttons and arrow-key handling, because a drag is the one interaction that fails on a touch screen inside a scrolling panel — and a rotation editor that only works with a mouse is no editor at all. A locked row is an anchor: it neither moves nor lets anything past it.',
    tags: ['reorder', 'drag', 'priority', 'sort', 'list', 'rotation', 'order', 'queue'],
    related: ['AutoBattleRules', 'TeamSlots', 'ActionBar', 'FormationGrid'],
    demos: [
      {
        title: 'A skill rotation',
        note: 'Drag the handle, use the arrows, or focus a row and press ↑ / ↓.',
        build: () => {
          const order = new ReorderList({
            title: 'Skill priority',
            numbered: true,
            toggles: true,
            buttons: true,
            items: [
              { id: 'heal', label: 'Sanctuary', note: 'when an ally is under 40%', art: 'fx-lotus-spring', color: '#52b96b' },
              { id: 'nuke', label: 'Voidlance', note: 'on cooldown', art: 'blood-void-lance', color: '#a335ee' },
              { id: 'buff', label: 'Warcry', note: 'if the buff has dropped', art: 'tech-signal-horn', color: '#dd9a2b' },
              { id: 'aoe', label: 'Firenado', note: 'with three or more enemies', art: 'fire-firenado', color: '#e2622f', off: true },
              { id: 'basic', label: 'Basic attack', note: 'always available', art: 'weapon-longsword-gold', locked: true },
            ],
          });
          order.on<string[]>('order:change', (ids) => console.log('saved', ids));
          return order.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'DyePicker',
    name: 'DyePicker',
    group: 'controls',
    blurb: 'The dye station: a palette, the armour channels it paints, and what is on each one.',
    description:
      'One grid serves every channel — picking paints the *selected* channel, so a player never hunts for a second swatch board. A dye the player does not own is shown rather than hidden, which is both kinder and the entire commercial point of a dye station. A custom colour joins the palette as a dye like any other rather than living in a parallel piece of state.',
    tags: ['dye', 'colour', 'color', 'palette', 'swatch', 'customise', 'transmog', 'cosmetic', 'armour'],
    related: ['Paperdoll', 'ItemCard', 'ShopPanel', 'CharacterSelect'],
    demos: [
      {
        title: 'Three channels and a palette',
        note: 'Pick a channel, then a dye. The chip on the tab follows.',
        build: () => {
          const dye = new DyePicker({
            title: 'Dye station',
            custom: true,
            action: 'Apply',
            cost: '2,400 gold per channel',
            channels: [
              { id: 'plate', label: 'Plate', dye: 'ash' },
              { id: 'trim', label: 'Trim', dye: 'gilt' },
              { id: 'cloth', label: 'Cloth' },
            ],
            dyes: [
              { id: 'ash', name: 'Ashen Grey', color: '#6d6a63', owned: 4 },
              { id: 'coal', name: 'Coalhide', color: '#2f2c28', owned: 9 },
              { id: 'blood', name: 'Oxblood', color: '#7d2420', owned: 1 },
              { id: 'moss', name: 'Deep Moss', color: '#3f5c33', owned: 6 },
              { id: 'sea', name: 'Tidewrack', color: '#2f5f6b', owned: 0 },
              { id: 'gilt', name: 'Gilt', color: '#c9a248', color2: '#f2d68c', premium: true, owned: 2 },
              { id: 'ember', name: 'Emberheart', color: '#c9502a', color2: '#f2a33c', premium: true, owned: 1 },
              { id: 'void', name: 'Voidsilk', color: '#4a2c6b', locked: true },
            ],
          });
          dye.on<{ channel: string; color: string }>('dye:pick', (d) => console.log('preview', d));
          return dye.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'ShareBar',
    name: 'ShareBar',
    group: 'data',
    blurb: 'One bar split into parts that add up — damage share, where the gold went, roster balance.',
    description:
      '`DamageMeter` ranks the same numbers as rows; this shows them as one whole, which is the right shape when the question is "what fraction" rather than "who won". Set `total` above the sum and the shortfall stays visible as empty track — the honest way to draw progress toward a target nobody has hit. Slices under `minShare` roll into a labelled remainder instead of becoming invisible hairlines.',
    tags: ['share', 'stacked', 'proportion', 'percentage', 'breakdown', 'split', 'damage', 'chart'],
    related: ['DamageMeter', 'StatBar', 'CollectionProgress', 'Sparkline'],
    demos: [
      {
        title: 'Damage share for a clan boss run',
        build: () =>
          new ShareBar({
            title: 'Damage share',
            legend: true,
            showValues: true,
            sorted: true,
            minShare: 0.03,
            height: 18,
            shares: [
              { label: 'Vexhollow', value: 48_200_000, color: '#a335ee', you: true },
              { label: 'Grixmaul', value: 21_400_000, color: '#3b8ae0' },
              { label: 'Solene', value: 18_900_000, color: '#52b96b' },
              { label: 'Kessra', value: 9_800_000, color: '#e8c14a' },
              { label: 'Drab', value: 1_100_000, color: '#9d9d9d' },
              { label: 'Brannoc', value: 400_000, color: '#8b8578' },
            ],
          }).el,
        stage: 'wide',
      },
      {
        title: 'Against a target nobody has hit',
        note: 'The total is set above the sum, so the shortfall stays visible.',
        build: () =>
          new ShareBar({
            title: 'Clan event — 200M goal',
            total: 200_000_000,
            showValues: true,
            shares: [
              { label: 'Day 1', value: 42_000_000, glyph: 'glyph-crossed-swords' },
              { label: 'Day 2', value: 51_000_000, glyph: 'glyph-crossed-swords' },
              { label: 'Day 3', value: 28_000_000, glyph: 'glyph-crossed-swords' },
            ],
          }).el,
        stage: 'wide',
      },
    ],
  },
  {
    id: 'ActivityCalendar',
    name: 'ActivityCalendar',
    group: 'data',
    blurb: 'One cell per day, shaded by how much happened — attendance, logins, keys spent.',
    description:
      'A day nobody has reached yet is drawn as a hole rather than an empty cell, because a grid that shows the rest of the month as misses reads as failure before the month has happened. `streak()` counts back from the last day that is *not* in the future for the same reason. Column-first flow is what makes each column a week running downward.',
    tags: ['calendar', 'heatmap', 'activity', 'attendance', 'streak', 'daily', 'history', 'grid'],
    related: ['StreakMeter', 'DailyRewards', 'AchievementList', 'Sparkline'],
    demos: [
      {
        title: 'Ten weeks of clan boss keys',
        build: () => {
          // A run of attended days at the end, so the streak readout has
          // something to count.
          const days = Array.from({ length: 70 }, (_, i) => ({
            label: `Day ${i + 1}`,
            value: i > 61 ? 0 : i > 50 ? [3, 4, 2, 4, 3][i % 5] : [0, 1, 2, 2, 3, 4, 0, 2, 1, 0][i % 10],
            future: i > 61,
            marked: i === 61,
          }));
          const cal = new ActivityCalendar({
            title: 'Clan boss attendance',
            rows: 7,
            key: true,
            rowLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
            days,
          });
          cal.el.appendChild(
            h('p', { class: 'fui-cal__summary', text: `${cal.streak()}-day streak` }),
          );
          return cal.el;
        },
        stage: 'wide',
      },
    ],
  },
  {
    id: 'ElementWheel',
    name: 'ElementWheel',
    group: 'data',
    blurb: 'The affinity ring, with the arrows actually on it — who beats whom, at a glance.',
    description:
      'Positions are computed once from the element count, so a three-element triangle and a six-element hexagon come from the same code. The arrows are one SVG under the nodes drawn from each element’s own `beats` list — the same list `matchup()` rules from, so the picture can never disagree with the verdict.',
    tags: ['affinity', 'element', 'wheel', 'type chart', 'weakness', 'strength', 'counter', 'matchup'],
    related: ['AffinityBadge', 'TargetSelector', 'ChampionCard', 'ArenaMatchup'],
    demos: [
      {
        title: 'Four affinities in a matchup',
        note: 'Click an element — its own arrows brighten and the verdict updates.',
        build: () => {
          const wheel = new ElementWheel({
            title: 'Affinity',
            arrows: true,
            selected: 'fire',
            against: 'water',
            size: 280,
            elements: [
              { id: 'fire', label: 'Fire', color: '#e2622f', art: 'fire-sunburst', beats: ['nature'], count: 34 },
              { id: 'water', label: 'Water', color: '#3f8fd6', art: 'hunt-frost-bolt', beats: ['fire'], count: 28 },
              { id: 'nature', label: 'Nature', color: '#4fae52', art: 'fx-nature-surge', beats: ['water'], count: 31 },
              { id: 'void', label: 'Void', color: '#a335ee', art: 'blood-void-lance', count: 9 },
            ],
          });
          wheel.on<string>('wheel:select', (id) => wheel.setAgainst(id === 'water' ? 'fire' : 'water'));
          return wheel.el;
        },
        stage: 'wide',
      },
    ],
  },
];
