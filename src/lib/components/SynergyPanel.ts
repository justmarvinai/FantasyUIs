import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface SynergyTier {
  /** Units needed to reach this tier. */
  at: number;
  /** What the tier grants. */
  effect: string;
}

export interface Synergy {
  id: string;
  /** Trait name, e.g. `'Emberborn'`. */
  name: string;
  /** Glyph asset id for the trait badge. */
  icon?: string;
  /** How many units on the board carry it. */
  count: number;
  /** Breakpoints, ascending. */
  tiers: SynergyTier[];
  /** Accent colour for this trait. */
  color?: string;
  /** Names of the contributing units, listed when the row is opened. */
  units?: string[];
}

export interface SynergyPanelOptions extends BaseOptions {
  /** Every trait the board has at least one of. */
  synergies: Synergy[];
  /** Heading. */
  title?: string;
  /** Show traits with no tier reached yet, greyed. */
  showInactive?: boolean;
  /** Start with a row expanded. */
  expanded?: string;
}

/**
 * Team-composition traits and their breakpoints — the auto-battler panel that
 * tells a player whether adding one more Emberborn is worth a board slot.
 *
 *   const synergy = new SynergyPanel({
 *     title: 'Bonds', showInactive: true, synergies: [
 *       { id: 'ember', name: 'Emberborn', icon: 'glyph-magic-flame', color: '#e0743a', count: 3,
 *         units: ['Pyre Knight', 'Cinder Adept', 'Ash Hound'],
 *         tiers: [{ at: 2, effect: '+15% burn damage' }, { at: 4, effect: 'Attacks ignite' }] },
 *     ],
 *   });
 *   synergy.on<Synergy>('synergy:open', (s) => board.highlight(s.units));
 *
 * Traits sort by how far into their tiers they are, so the ones actually doing
 * work rise to the top and the "one more unit" candidates sit right under them.
 * Every row prints both the tier it has reached *and* the next one, because the
 * decision being made is always about the gap between those two — a panel that
 * only shows the active bonus tells the player nothing about what to build
 * toward.
 */
export class SynergyPanel extends FuiComponent<SynergyPanelOptions> {
  private list: HTMLElement;

  constructor(opts: SynergyPanelOptions) {
    const root = h('div', { class: 'fui fui-synergy' });
    super(root, opts);

    if (opts.title) {
      root.appendChild(h('h3', { class: 'fui-synergy__title', text: opts.title }));
    }
    this.list = h('div', { class: 'fui-synergy__list' });
    root.appendChild(this.list);
    this.build();
  }

  /** Change how many units carry a trait. */
  setCount(id: string, count: number): this {
    const syn = this.opts.synergies.find((s) => s.id === id);
    if (!syn) return this;
    const before = this.reached(syn);
    syn.count = Math.max(0, count);
    const after = this.reached(syn);
    this.build();
    if (after > before) this.emit('synergy:tier', { id, tier: after });
    return this;
  }

  /** Replace the whole set — call after any board change. */
  setSynergies(synergies: Synergy[]): this {
    this.opts.synergies = synergies;
    this.build();
    return this;
  }

  /** Index of the highest tier reached, or -1. */
  private reached(syn: Synergy): number {
    let at = -1;
    syn.tiers.forEach((t, i) => {
      if (syn.count >= t.at) at = i;
    });
    return at;
  }

  private build(): void {
    clear(this.list);
    const rows = this.opts.synergies
      .filter((s) => this.opts.showInactive || this.reached(s) >= 0)
      // Deepest progress first, then closest to the next breakpoint — which puts
      // the "one more unit" candidates directly under the working traits.
      .slice()
      .sort((a, b) => {
        const d = this.reached(b) - this.reached(a);
        if (d !== 0) return d;
        return this.gap(a) - this.gap(b);
      });

    for (const syn of rows) {
      const at = this.reached(syn);
      const next = syn.tiers[at + 1];
      const top = syn.tiers[syn.tiers.length - 1];
      const row = h('div', {
        class: 'fui-synergy__row',
        dataset: { state: at < 0 ? 'idle' : at === syn.tiers.length - 1 ? 'max' : 'on' },
        style: syn.color ? { '--fui-synergy-ink': syn.color } : undefined,
      });

      const head = h('button', {
        class: 'fui-synergy__head',
        attrs: { type: 'button', 'aria-expanded': String(this.opts.expanded === syn.id) },
      });
      head.appendChild(
        h('span', {
          class: 'fui-synergy__badge',
          dataset: { glyph: syn.icon ? 'on' : 'off' },
          style: syn.icon ? { '--fui-synergy-glyph': `var(--fui-img-${syn.icon})` } : undefined,
          text: syn.icon ? '' : syn.name.slice(0, 1),
        }),
      );
      const label = h('span', { class: 'fui-synergy__label' });
      label.appendChild(h('span', { class: 'fui-synergy__name', text: syn.name }));
      label.appendChild(
        h('span', {
          class: 'fui-synergy__effect',
          text: at >= 0 ? syn.tiers[at].effect : (syn.tiers[0]?.effect ?? ''),
        }),
      );
      head.appendChild(label);
      head.appendChild(
        h('span', {
          class: 'fui-synergy__count fui-num',
          text: `${syn.count} / ${next ? next.at : top.at}`,
        }),
      );
      row.appendChild(head);

      // Pips, one per breakpoint — the shape of the whole trait at a glance.
      const pips = h('div', { class: 'fui-synergy__pips' });
      syn.tiers.forEach((tier, i) => {
        pips.appendChild(
          h('span', {
            class: 'fui-synergy__pip fui-num',
            dataset: { on: i <= at ? 'on' : 'off' },
            text: String(tier.at),
            attrs: { title: tier.effect },
          }),
        );
      });
      row.appendChild(pips);

      const body = h('div', { class: 'fui-synergy__body' });
      for (const tier of syn.tiers) {
        body.appendChild(
          h('p', {
            class: 'fui-synergy__tier',
            dataset: { on: syn.count >= tier.at ? 'on' : 'off' },
            text: `${tier.at} — ${tier.effect}`,
          }),
        );
      }
      if (syn.units?.length) {
        body.appendChild(h('p', { class: 'fui-synergy__units', text: syn.units.join(' · ') }));
      }
      row.appendChild(body);

      head.addEventListener('click', () => {
        const open = this.opts.expanded === syn.id;
        this.opts.expanded = open ? undefined : syn.id;
        this.build();
        if (!open) this.emit('synergy:open', syn);
      });
      row.dataset.open = this.opts.expanded === syn.id ? 'on' : 'off';
      this.list.appendChild(row);
    }
  }

  /** Units still needed for the next breakpoint; a maxed trait sorts last. */
  private gap(syn: Synergy): number {
    const next = syn.tiers.find((t) => syn.count < t.at);
    return next ? next.at - syn.count : Number.MAX_SAFE_INTEGER;
  }
}
