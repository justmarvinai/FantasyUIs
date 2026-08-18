import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp, commas } from '../core/dom.ts';

export interface VipTier {
  /** Tier number. */
  level: number;
  /** Points needed to reach it. */
  at: number;
  /** What the tier unlocks, one line per perk. */
  perks?: string[];
}

export interface VipProgressOptions extends BaseOptions {
  /** Points accumulated. */
  points: number;
  tiers: VipTier[];
  /** Heading. Defaults to "VIP". */
  label?: string;
  /** Show the current tier's perks under the bar. */
  showPerks?: boolean;
  /** Name for the points, e.g. "VIP points". */
  unit?: string;
}

/**
 * The VIP / battle-status ladder: total points, current tier, the next tier,
 * and what it unlocks.
 *
 *   new VipProgress({
 *     points: 4200, label: 'VIP',
 *     tiers: [
 *       { level: 3, at: 3000, perks: ['+1 daily free summon'] },
 *       { level: 4, at: 6000, perks: ['+10% campaign XP', 'Auto-repeat x5'] },
 *     ],
 *     showPerks: true,
 *   });
 *
 * The next tier's perks are what the component is for — showing the level alone
 * tells a player where they are, not why they should care.
 */
export class VipProgress extends FuiComponent<VipProgressOptions> {
  constructor(opts: VipProgressOptions) {
    const tiers = [...opts.tiers].sort((a, b) => a.at - b.at);
    const current = [...tiers].reverse().find((t) => opts.points >= t.at);
    const next = tiers.find((t) => opts.points < t.at);
    const floor = current?.at ?? 0;
    const ceiling = next?.at ?? current?.at ?? 1;
    const span = Math.max(1, ceiling - floor);
    const pct = next ? clamp((opts.points - floor) / span, 0, 1) : 1;

    const root = h('div', {
      class: 'fui fui-vip',
      style: { '--fui-vip-p': String(pct) },
    });
    if (!next) root.classList.add('is-max');
    super(root, opts);

    const head = h('div', { class: 'fui-vip__head' });
    head.appendChild(
      h('span', {
        class: 'fui-vip__badge',
        text: `${opts.label ?? 'VIP'} ${current?.level ?? 0}`,
      }),
    );
    head.appendChild(
      h('span', {
        class: 'fui-vip__points fui-num',
        text: `${commas(opts.points)} ${opts.unit ?? 'points'}`,
      }),
    );
    root.appendChild(head);

    const bar = h('div', { class: 'fui-vip__bar' }, h('span', { class: 'fui-vip__fill' }));
    root.appendChild(bar);

    const foot = h('div', { class: 'fui-vip__foot' });
    if (next) {
      foot.appendChild(
        h('span', {
          class: 'fui-vip__next fui-num',
          text: `${commas(next.at - opts.points)} to ${opts.label ?? 'VIP'} ${next.level}`,
        }),
      );
    } else {
      foot.appendChild(h('span', { class: 'fui-vip__next', text: 'Maximum tier reached' }));
    }
    root.appendChild(foot);

    if (opts.showPerks) {
      const perks = (next ?? current)?.perks ?? [];
      if (perks.length) {
        const list = h('ul', { class: 'fui-vip__perks' });
        for (const perk of perks) {
          list.appendChild(h('li', { class: 'fui-vip__perk', text: perk }));
        }
        root.appendChild(
          h('div', { class: 'fui-vip__perk-block' },
            h('span', {
              class: 'fui-vip__perk-title fui-label',
              text: next ? `Unlocks at ${opts.label ?? 'VIP'} ${next.level}` : 'Active perks',
            }),
            list,
          ),
        );
      }
    }
  }
}
