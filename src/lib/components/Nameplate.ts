import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp } from '../core/dom.ts';

export interface NameplateOptions extends BaseOptions {
  /** Who this is. */
  name: string;
  /** Level printed before the name. */
  level?: number;
  /** Guild or clan tag, printed above. */
  tag?: string;
  /** Health left, 0–1. */
  health?: number;
  /** Absorb shield on top of health, 0–1 of the same bar. */
  shield?: number;
  /** Which side it is on — colours the bar and the frame. */
  side?: 'ally' | 'enemy' | 'neutral' | 'party';
  /** Rank, which drives the plate's decoration. */
  tier?: 'normal' | 'elite' | 'rare' | 'boss';
  /** Glyph asset ids for status effects. */
  effects?: string[];
  /** The player's current target. */
  targeted?: boolean;
  /** A cast in progress: the spell name and how far along, 0–1. */
  cast?: { name: string; progress: number; interruptible?: boolean };
  /** Plate width in pixels. */
  width?: number;
}

/**
 * The floating plate over a unit's head: name, level, health, casts and the
 * statuses stuck to it. Position it yourself over your canvas or scene — the
 * component owns everything from the plate inward.
 *
 *   const plate = new Nameplate({
 *     name: 'Bog Warden', level: 42, side: 'enemy', tier: 'elite',
 *     health: 0.63, shield: 0.12, effects: ['glyph-thorny-branch'], targeted: true,
 *   });
 *   world.attach(plate.el, unit);
 *   unit.on('damage', () => plate.setHealth(unit.hp / unit.maxHp));
 *   unit.on('cast', (c) => plate.cast(c.name, c.progress, c.interruptible));
 *
 * Shield is drawn as an overlay riding on top of the health fill rather than as
 * a second bar, because that is how a player reads "there is more to chew
 * through than the health says". An interruptible cast gets a pale bar and an
 * uninterruptible one gets a hard red — the single most important distinction on
 * a nameplate, and the one most implementations bury in a tooltip.
 */
export class Nameplate extends FuiComponent<NameplateOptions> {
  private healthFill: HTMLElement;
  private shieldFill: HTMLElement;
  private castRow: HTMLElement;
  private castName: HTMLElement;
  private castFill: HTMLElement;
  private effectRow: HTMLElement;

  constructor(opts: NameplateOptions) {
    const root = h('div', {
      class: 'fui fui-nameplate',
      dataset: {
        side: opts.side ?? 'enemy',
        tier: opts.tier ?? 'normal',
        targeted: opts.targeted ? 'on' : 'off',
      },
      style: { '--fui-plate-w': `${opts.width ?? 148}px` },
    });
    super(root, opts);

    if (opts.tag) root.appendChild(h('span', { class: 'fui-nameplate__tag', text: `‹${opts.tag}›` }));

    const line = h('div', { class: 'fui-nameplate__line' });
    if (opts.level != null) {
      line.appendChild(h('span', { class: 'fui-nameplate__level fui-num', text: String(opts.level) }));
    }
    line.appendChild(h('span', { class: 'fui-nameplate__name', text: opts.name }));
    root.appendChild(line);

    const bar = h('div', { class: 'fui-nameplate__bar' });
    this.healthFill = h('span', { class: 'fui-nameplate__health' });
    this.shieldFill = h('span', { class: 'fui-nameplate__shield' });
    bar.append(this.healthFill, this.shieldFill);
    root.appendChild(bar);

    this.castRow = h('div', { class: 'fui-nameplate__cast', dataset: { on: 'off' } });
    this.castName = h('span', { class: 'fui-nameplate__castname' });
    const castBar = h('span', { class: 'fui-nameplate__castbar' });
    this.castFill = h('span', { class: 'fui-nameplate__castfill' });
    castBar.appendChild(this.castFill);
    this.castRow.append(this.castName, castBar);
    root.appendChild(this.castRow);

    this.effectRow = h('div', { class: 'fui-nameplate__effects' });
    root.appendChild(this.effectRow);

    this.setHealth(opts.health ?? 1, opts.shield ?? 0);
    this.setEffects(opts.effects ?? []);
    if (opts.cast) this.cast(opts.cast.name, opts.cast.progress, opts.cast.interruptible);
  }

  /** Set health and shield, each 0–1 of the bar. */
  setHealth(health: number, shield = this.opts.shield ?? 0): this {
    this.opts.health = clamp(health, 0, 1);
    this.opts.shield = clamp(shield, 0, 1);
    this.healthFill.style.width = `${this.opts.health * 100}%`;
    this.shieldFill.style.left = `${this.opts.health * 100}%`;
    this.shieldFill.style.width = `${Math.min(this.opts.shield, 1 - this.opts.health) * 100}%`;
    // One threshold, stated in one place: a plate that turns red at 30% and a
    // rules engine that panics at 25% is a bug players learn to distrust.
    this.el.dataset.hurt = this.opts.health <= 0.3 ? 'on' : 'off';
    this.el.dataset.dead = this.opts.health <= 0 ? 'on' : 'off';
    return this;
  }

  /** Show a cast in progress. */
  cast(name: string, progress: number, interruptible = true): this {
    this.opts.cast = { name, progress: clamp(progress, 0, 1), interruptible };
    this.castRow.dataset.on = 'on';
    this.castRow.dataset.interruptible = interruptible ? 'on' : 'off';
    this.castName.textContent = name;
    this.castFill.style.width = `${this.opts.cast.progress * 100}%`;
    return this;
  }

  /** Stop showing a cast. */
  stopCast(): this {
    this.opts.cast = undefined;
    this.castRow.dataset.on = 'off';
    return this;
  }

  /** Replace the status glyphs. */
  setEffects(effects: string[]): this {
    this.opts.effects = effects;
    this.effectRow.textContent = '';
    this.effectRow.dataset.empty = effects.length ? 'off' : 'on';
    for (const id of effects) {
      this.effectRow.appendChild(
        h('span', {
          class: 'fui-nameplate__effect',
          style: { '--fui-plate-glyph': `var(--fui-img-${id})` },
        }),
      );
    }
    return this;
  }

  /** Mark this unit as the player's target. */
  setTargeted(on: boolean): this {
    this.opts.targeted = on;
    this.el.dataset.targeted = on ? 'on' : 'off';
    if (on) this.emit('plate:target', this.opts.name);
    return this;
  }
}
