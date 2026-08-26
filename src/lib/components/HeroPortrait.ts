import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface HeroPortraitOptions extends BaseOptions {
  /** Hero name. */
  name: string;
  /** The class or faction, printed under the name. */
  heroClass?: string;
  /** Manifest asset id for the portrait. */
  art?: string;
  /** Health left. */
  health?: number;
  /** Starting health, so damage colours the number. */
  maxHealth?: number;
  /** Armour, drawn as its own shield gem. Omit or `0` to hide it. */
  armour?: number;
  /** Attack the hero has this turn, from a weapon or an effect. */
  attack?: number;
  /** Which side of the board. */
  side?: 'friendly' | 'enemy';
  /** Cannot be targeted. */
  immune?: boolean;
  /** Frozen this turn. */
  frozen?: boolean;
  /** Diameter in pixels. */
  size?: number;
  /** Glyph asset ids for status markers. */
  effects?: string[];
  /** The player's current target. */
  targeted?: boolean;
}

/**
 * The hero: portrait, health, armour and the attack a weapon gives them. One
 * sits at each end of a board and everything aims at it.
 *
 *   const hero = new HeroPortrait({
 *     name: 'Vexhollow', heroClass: 'Necromancer', art: 'blood-necromancer',
 *     health: 24, maxHealth: 30, armour: 5, attack: 3, side: 'friendly',
 *   });
 *   hero.on('hero:target', () => combat.attackFace());
 *   hero.damage(6);
 *
 * Armour is a separate gem rather than added to health, and `damage()` spends it
 * first — which is what makes "you are on 24 but really 29" visible instead of
 * being a number the player has to hold in their head. Lethal maths is the most
 * common thing a card-game player gets wrong, and it is wrong because the UI
 * merged two numbers that behave differently.
 *
 * The attack gem only appears when the hero actually has attack, because a
 * permanent 0 in the corner trains players to stop reading it.
 */
export class HeroPortrait extends FuiComponent<HeroPortraitOptions> {
  private healthEl: HTMLElement | null = null;
  private armourEl: HTMLElement | null = null;
  private attackEl: HTMLElement | null = null;
  private effectRow: HTMLElement;

  constructor(opts: HeroPortraitOptions) {
    const root = h('div', {
      class: 'fui fui-hero',
      dataset: {
        side: opts.side ?? 'friendly',
        immune: opts.immune ? 'on' : 'off',
        frozen: opts.frozen ? 'on' : 'off',
        targeted: opts.targeted ? 'on' : 'off',
      },
      style: {
        '--fui-hero-size': `${opts.size ?? 120}px`,
        ...(opts.art ? { '--fui-hero-art': `var(--fui-img-${opts.art})` } : {}),
      },
      attrs: {
        role: 'button',
        tabindex: '0',
        'aria-label': `${opts.name}, ${opts.health ?? 30} health${opts.armour ? `, ${opts.armour} armour` : ''}`,
      },
    });
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-hero__portrait', attrs: { 'aria-hidden': 'true' } }));
    root.appendChild(h('span', { class: 'fui-hero__rim', attrs: { 'aria-hidden': 'true' } }));
    root.appendChild(h('span', { class: 'fui-hero__frost', attrs: { 'aria-hidden': 'true' } }));

    const plate = h('div', { class: 'fui-hero__plate' });
    plate.appendChild(h('span', { class: 'fui-hero__name', text: opts.name }));
    if (opts.heroClass) {
      plate.appendChild(h('span', { class: 'fui-hero__class', text: opts.heroClass }));
    }
    root.appendChild(plate);

    if (opts.attack) {
      this.attackEl = h('span', { class: 'fui-hero__attack fui-num', text: String(opts.attack) });
      root.appendChild(this.attackEl);
    }

    this.healthEl = h('span', {
      class: 'fui-hero__health fui-num',
      dataset: { low: (opts.health ?? 30) <= 10 ? 'on' : 'off' },
      text: String(opts.health ?? 30),
    });
    root.appendChild(this.healthEl);

    if (opts.armour) {
      this.armourEl = h('span', { class: 'fui-hero__armour fui-num', text: String(opts.armour) });
      root.appendChild(this.armourEl);
    }

    this.effectRow = h('div', { class: 'fui-hero__effects' });
    root.appendChild(this.effectRow);
    this.paintEffects();

    root.addEventListener('click', () => this.emit('hero:target', opts.name));
    root.addEventListener('keydown', (ev) => {
      const key = ev as KeyboardEvent;
      if (key.key === 'Enter' || key.key === ' ') {
        key.preventDefault();
        this.emit('hero:target', opts.name);
      }
    });
  }

  /** Take damage. Armour is spent first, which is what makes it visible. */
  damage(amount: number): this {
    let left = amount;
    if (this.opts.armour) {
      const eaten = Math.min(this.opts.armour, left);
      this.setArmour(this.opts.armour - eaten);
      left -= eaten;
    }
    if (left > 0) this.setHealth(Math.max(0, (this.opts.health ?? 30) - left));
    this.el.dataset.hurt = 'on';
    void this.el.offsetWidth;
    this.el.dataset.hurt = 'off';
    if ((this.opts.health ?? 0) <= 0) this.emit('hero:dead', this.opts.name);
    return this;
  }

  /** Heal, capped at the starting health. */
  heal(amount: number): this {
    const max = this.opts.maxHealth ?? 30;
    return this.setHealth(Math.min(max, (this.opts.health ?? 0) + amount));
  }

  /** Set health directly. */
  setHealth(health: number): this {
    this.opts.health = health;
    if (this.healthEl) {
      this.healthEl.textContent = String(health);
      this.healthEl.dataset.low = health <= 10 ? 'on' : 'off';
    }
    this.paintLabel();
    return this;
  }

  /** Set armour. Zero removes the gem rather than showing a 0. */
  setArmour(armour: number): this {
    this.opts.armour = armour;
    if (armour > 0) {
      if (!this.armourEl) {
        this.armourEl = h('span', { class: 'fui-hero__armour fui-num' });
        this.el.appendChild(this.armourEl);
      }
      this.armourEl.textContent = String(armour);
    } else {
      this.armourEl?.remove();
      this.armourEl = null;
    }
    this.paintLabel();
    return this;
  }

  /** Set the attack a weapon or effect gives the hero this turn. */
  setAttack(attack: number): this {
    this.opts.attack = attack;
    if (attack > 0) {
      if (!this.attackEl) {
        this.attackEl = h('span', { class: 'fui-hero__attack fui-num' });
        this.el.appendChild(this.attackEl);
      }
      this.attackEl.textContent = String(attack);
    } else {
      this.attackEl?.remove();
      this.attackEl = null;
    }
    return this;
  }

  /** Replace the status glyphs. */
  setEffects(effects: string[]): this {
    this.opts.effects = effects;
    this.paintEffects();
    return this;
  }

  private paintEffects(): void {
    clear(this.effectRow);
    this.effectRow.dataset.empty = this.opts.effects?.length ? 'off' : 'on';
    for (const glyph of this.opts.effects ?? []) {
      this.effectRow.appendChild(
        h('span', {
          class: 'fui-hero__effect',
          style: { '--fui-hero-glyph': `var(--fui-img-${glyph})` },
        }),
      );
    }
  }

  private paintLabel(): void {
    this.el.setAttribute(
      'aria-label',
      `${this.opts.name}, ${this.opts.health ?? 0} health${this.opts.armour ? `, ${this.opts.armour} armour` : ''}`,
    );
  }
}
