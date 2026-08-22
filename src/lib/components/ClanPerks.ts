import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp, commas } from '../core/dom.ts';

export interface ClanPerk {
  id: string;
  name: string;
  /** Glyph asset id for the perk badge. */
  icon?: string;
  /** What it does at the current level. */
  effect?: string;
  /** Levels bought so far. */
  level: number;
  /** Maximum level. */
  max: number;
  /** Treasury cost of the next level. */
  cost: number;
  /** Guild level needed before it can be funded at all. */
  requires?: number;
  /** Perk ids that must be maxed first. */
  after?: string[];
}

export interface ClanPerksOptions extends BaseOptions {
  /** Every perk the guild can fund. */
  perks: ClanPerk[];
  /** Gold in the guild treasury. */
  treasury?: number;
  /** Guild level, gating the higher perks. */
  guildLevel?: number;
  /** Glyph asset id for the treasury currency. */
  treasuryArt?: string;
  /** Heading. */
  title?: string;
  /** This member may spend from the treasury. Officers only, usually. */
  canFund?: boolean;
}

/**
 * The guild's upgrade board: shared perks bought out of the treasury, gated by
 * guild level and by each other.
 *
 *   const perks = new ClanPerks({
 *     title: 'Hall upgrades', treasury: 84_000, guildLevel: 6,
 *     treasuryArt: 'glyph-trophy-cup', canFund: isOfficer, perks: hallPerks,
 *   });
 *   perks.on<ClanPerk>('perk:fund', (perk) => guild.buyPerk(perk.id));
 *
 * Every locked perk says *why* it is locked — guild level, a prerequisite perk,
 * an empty treasury, or a rank that cannot spend — because "can't buy" with no
 * reason is what sends members to ask an officer. `blockedBy()` resolves that
 * one reason in priority order, so a perk with three problems still gets one
 * sentence rather than a list nobody reads.
 */
export class ClanPerks extends FuiComponent<ClanPerksOptions> {
  private grid: HTMLElement;
  private purse: HTMLElement | null = null;

  constructor(opts: ClanPerksOptions) {
    const root = h('div', { class: 'fui fui-clanperks' });
    super(root, opts);

    const head = h('div', { class: 'fui-clanperks__head' });
    head.appendChild(h('h3', { class: 'fui-clanperks__title', text: opts.title ?? 'Guild perks' }));
    if (opts.guildLevel != null) {
      head.appendChild(
        h('span', { class: 'fui-clanperks__level fui-num', text: `Guild Lv ${opts.guildLevel}` }),
      );
    }
    if (opts.treasury != null) {
      const purse = h('span', { class: 'fui-clanperks__purse' });
      if (opts.treasuryArt) {
        purse.appendChild(
          h('span', {
            class: 'fui-clanperks__coin',
            style: { '--fui-perk-coin': `var(--fui-img-${opts.treasuryArt})` },
          }),
        );
      }
      this.purse = h('span', { class: 'fui-clanperks__gold fui-num', text: commas(opts.treasury) });
      purse.appendChild(this.purse);
      head.appendChild(purse);
    }
    root.appendChild(head);

    this.grid = h('div', { class: 'fui-clanperks__grid' });
    root.appendChild(this.grid);
    this.build();
  }

  /** Buy the next level of a perk out of the treasury. */
  fund(id: string): boolean {
    const perk = this.opts.perks.find((p) => p.id === id);
    if (!perk || this.blockedBy(perk)) return false;

    perk.level += 1;
    if (this.opts.treasury != null) this.setTreasury(this.opts.treasury - perk.cost);
    else this.build();
    this.emit('perk:fund', perk);
    return true;
  }

  /** Update the treasury — call when another member deposits. */
  setTreasury(gold: number): this {
    this.opts.treasury = gold;
    if (this.purse) this.purse.textContent = commas(gold);
    this.build();
    return this;
  }

  /** Why this perk cannot be funded right now, or null. */
  private blockedBy(perk: ClanPerk): string | null {
    if (perk.level >= perk.max) return 'Fully upgraded';
    if (perk.requires != null && (this.opts.guildLevel ?? 0) < perk.requires) {
      return `Needs guild level ${perk.requires}`;
    }
    for (const id of perk.after ?? []) {
      const dep = this.opts.perks.find((p) => p.id === id);
      if (dep && dep.level < dep.max) return `Max ${dep.name} first`;
    }
    if (this.opts.canFund === false) return 'Officers only';
    if (this.opts.treasury != null && this.opts.treasury < perk.cost) return 'Treasury too low';
    return null;
  }

  private build(): void {
    clear(this.grid);
    for (const perk of this.opts.perks) {
      const blocked = this.blockedBy(perk);
      const maxed = perk.level >= perk.max;
      const card = h('div', {
        class: 'fui-clanperks__card',
        dataset: { state: maxed ? 'max' : blocked ? 'locked' : 'open' },
        style: { '--fui-perk-fill': String(clamp(perk.level / Math.max(1, perk.max), 0, 1)) },
      });

      const top = h('div', { class: 'fui-clanperks__top' });
      top.appendChild(
        h('span', {
          class: 'fui-clanperks__badge',
          dataset: { glyph: perk.icon ? 'on' : 'off' },
          style: perk.icon ? { '--fui-perk-glyph': `var(--fui-img-${perk.icon})` } : undefined,
          text: perk.icon ? '' : perk.name.slice(0, 1),
        }),
      );
      const names = h('div', { class: 'fui-clanperks__names' });
      names.appendChild(h('span', { class: 'fui-clanperks__name', text: perk.name }));
      names.appendChild(
        h('span', { class: 'fui-clanperks__rank fui-num', text: `Level ${perk.level} / ${perk.max}` }),
      );
      top.appendChild(names);
      card.appendChild(top);

      const track = h('div', { class: 'fui-clanperks__track' });
      for (let i = 0; i < perk.max; i += 1) {
        track.appendChild(
          h('span', { class: 'fui-clanperks__pip', dataset: { on: i < perk.level ? 'on' : 'off' } }),
        );
      }
      card.appendChild(track);

      if (perk.effect) {
        card.appendChild(h('p', { class: 'fui-clanperks__effect', text: perk.effect }));
      }

      const btn = h('button', {
        class: 'fui-clanperks__fund',
        dataset: { state: maxed ? 'max' : blocked ? 'locked' : 'open' },
        attrs: { type: 'button', disabled: !!blocked },
        text: maxed ? 'Maxed' : (blocked ?? `Fund — ${commas(perk.cost)}`),
      });
      btn.addEventListener('click', () => this.fund(perk.id));
      card.appendChild(btn);

      this.grid.appendChild(card);
    }
  }
}
