import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp, abbreviate } from '../core/dom.ts';

export interface TargetUnit {
  id: string;
  name?: string;
  /** Manifest asset id for the portrait. */
  art?: string;
  hp?: number;
  maxHp?: number;
  /** Shield riding on top of the health. */
  shield?: number;
  /** Affinity or element colour for the rim. */
  color?: string;
  /** Status pips — glyph asset ids. */
  effects?: string[];
  /** Cannot be targeted — stealthed, untargetable, already dead. */
  dead?: boolean;
  /** Forces attacks onto it; drawn with a taunt marker. */
  taunting?: boolean;
  /** Marks the boss or elite of the group. */
  elite?: boolean;
}

export interface TargetSelectorOptions extends BaseOptions {
  /** The line-up, drawn left to right in this order. */
  units: TargetUnit[];
  /** Currently targeted unit id. */
  target?: string;
  /** Heading above the line-up. */
  label?: string;
  /** Portrait size in pixels. */
  size?: number;
  /** Show each unit's health bar under its portrait. */
  bars?: boolean;
  /** Turn clicking off — a read-only enemy line-up. */
  readonly?: boolean;
}

/**
 * The enemy line-up a turn-based fight targets through: portraits in a row,
 * one selected, health under each, and the taunt marker that says your click
 * will not go where you point it.
 *
 *   const targets = new TargetSelector({
 *     label: 'Enemies', bars: true,
 *     units: [
 *       { id: 'a', name: 'Bog Warden', art: 'hunt-dire-wolf', hp: 4200, maxHp: 9000 },
 *       { id: 'b', name: 'Revenant', art: 'blood-necromancer', hp: 18_400, maxHp: 18_400,
 *         elite: true, taunting: true, effects: ['glyph-shield-block'] },
 *     ],
 *   });
 *   targets.on<string>('target:change', (id) => queueAttack(id));
 *
 * A taunting enemy is called out rather than silently redirecting the attack,
 * because "my click did something else" is the worst thing a battle UI can do.
 */
export class TargetSelector extends FuiComponent<TargetSelectorOptions> {
  private list: HTMLElement;
  private target: string | null;

  constructor(opts: TargetSelectorOptions) {
    const root = h('div', {
      class: 'fui fui-targets',
      style: { '--fui-target-size': `${opts.size ?? 62}px` },
      attrs: { role: opts.readonly ? undefined : 'radiogroup', 'aria-label': opts.label ?? 'Targets' },
    });
    super(root, opts);
    this.target = opts.target ?? null;

    if (opts.label) {
      root.appendChild(h('span', { class: 'fui-targets__label fui-label', text: opts.label }));
    }
    this.list = h('div', { class: 'fui-targets__list' });
    root.appendChild(this.list);
    this.render();
  }

  /** The unit currently targeted, or null. */
  get(): string | null {
    return this.target;
  }

  /** The unit an attack would actually land on, taunts included. */
  effectiveTarget(): string | null {
    const taunt = this.opts.units.find((u) => u.taunting && !u.dead);
    return taunt ? taunt.id : this.target;
  }

  select(id: string, opts?: { silent?: boolean }): this {
    const unit = this.opts.units.find((u) => u.id === id);
    if (!unit || unit.dead || this.opts.readonly) return this;
    this.target = id;
    this.render();
    if (!opts?.silent) this.emit('target:change', id);
    return this;
  }

  /** Apply new unit state — the usual call after a turn resolves. */
  setUnits(units: TargetUnit[]): this {
    this.opts.units = units;
    // A dead target should not stay selected; move to the first live enemy.
    if (this.target && units.find((u) => u.id === this.target)?.dead) {
      this.target = units.find((u) => !u.dead)?.id ?? null;
    }
    this.render();
    return this;
  }

  private render(): void {
    clear(this.list);

    for (const unit of this.opts.units) {
      const on = unit.id === this.target;
      const cell = h(this.opts.readonly ? 'div' : 'button', {
        class: 'fui-targets__unit',
        dataset: { id: unit.id },
        style: unit.color ? { '--fui-target-ink': unit.color } : {},
        attrs: {
          type: this.opts.readonly ? undefined : 'button',
          role: this.opts.readonly ? undefined : 'radio',
          'aria-checked': this.opts.readonly ? undefined : String(on),
          disabled: !this.opts.readonly && unit.dead ? true : undefined,
          title: unit.name ?? '',
        },
      });
      if (on) cell.classList.add('is-target');
      if (unit.dead) cell.classList.add('is-dead');
      if (unit.elite) cell.classList.add('is-elite');

      const frame = h('span', { class: 'fui-targets__frame' });
      const art = h('span', { class: 'fui-targets__art' });
      if (unit.art) art.style.backgroundImage = `var(--fui-img-${unit.art})`;
      frame.appendChild(art);

      if (unit.taunting) {
        frame.appendChild(
          h('span', { class: 'fui-targets__taunt', text: 'Taunt', attrs: { 'aria-hidden': 'true' } }),
        );
      }
      if (on) {
        frame.appendChild(h('span', { class: 'fui-targets__reticle', attrs: { 'aria-hidden': 'true' } }));
      }
      cell.appendChild(frame);

      if (unit.effects?.length) {
        const fx = h('span', { class: 'fui-targets__effects' });
        for (const glyph of unit.effects.slice(0, 4)) {
          fx.appendChild(
            h('span', {
              class: 'fui-targets__effect',
              style: { '--fui-glyph-src': `var(--fui-img-${glyph})` },
            }),
          );
        }
        cell.appendChild(fx);
      }

      if ((this.opts.bars ?? true) && unit.maxHp) {
        const pct = clamp((unit.hp ?? 0) / unit.maxHp, 0, 1);
        const shield = clamp((unit.shield ?? 0) / unit.maxHp, 0, 1 - pct);
        const bar = h('span', {
          class: 'fui-targets__bar',
          style: { '--fui-target-hp': String(pct), '--fui-target-shield': String(shield) },
          attrs: { title: `${abbreviate(unit.hp ?? 0)} / ${abbreviate(unit.maxHp)}` },
        });
        bar.appendChild(h('span', { class: 'fui-targets__hp' }));
        if (shield > 0) bar.appendChild(h('span', { class: 'fui-targets__shield' }));
        cell.appendChild(bar);
      }

      if (unit.name) {
        cell.appendChild(h('span', { class: 'fui-targets__name', text: unit.name }));
      }

      if (!this.opts.readonly && !unit.dead) {
        cell.addEventListener('click', () => this.select(unit.id));
      }
      this.list.appendChild(cell);
    }
  }
}
