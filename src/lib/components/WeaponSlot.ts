import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface WeaponSlotOptions extends BaseOptions {
  /** Weapon name. Omit for an empty slot. */
  name?: string;
  /** Manifest asset id for the weapon art. */
  art?: string;
  /** Attack it gives the hero. */
  attack?: number;
  /** Swings left before it breaks. */
  durability?: number;
  /** Printed durability, so a damaged weapon prints red. */
  maxDurability?: number;
  /** Rules text, shown on hover. */
  text?: string;
  /** Already swung this turn. */
  used?: boolean;
  /** Diameter in pixels. */
  size?: number;
  /** Which side of the board. */
  side?: 'friendly' | 'enemy';
}

/**
 * The equipped weapon: attack, durability, and the swing left in it. It hangs
 * beside the hero and is the reason the hero has an attack gem at all.
 *
 *   const axe = new WeaponSlot({
 *     name: 'Ashfall Cleaver', art: 'weapon-cleaver-axe', attack: 3,
 *     durability: 2, maxDurability: 2, text: 'After your hero attacks, gain 1 Armour.',
 *   });
 *   hero.on('hero:attack', () => axe.swing());
 *   axe.on('weapon:break', () => hero.setAttack(0));
 *
 * `swing()` spends durability and fires `weapon:break` at zero rather than
 * leaving the caller to check — which is what stops a hero keeping its attack
 * gem after the weapon is gone, the most common desync in a card game HUD.
 *
 * An empty slot still renders, as an outline. A weapon appearing and vanishing
 * from the layout shifts the hero every time one breaks; a permanent socket
 * does not, and it also tells a new player that a weapon is a thing they could
 * have.
 */
export class WeaponSlot extends FuiComponent<WeaponSlotOptions> {
  private attackEl: HTMLElement | null = null;
  private durEl: HTMLElement | null = null;

  constructor(opts: WeaponSlotOptions = {}) {
    const root = h('div', {
      class: 'fui fui-weaponslot',
      dataset: {
        empty: opts.name ? 'off' : 'on',
        used: opts.used ? 'on' : 'off',
        side: opts.side ?? 'friendly',
      },
      style: {
        '--fui-weapon-size': `${opts.size ?? 72}px`,
        ...(opts.art ? { '--fui-weapon-art': `var(--fui-img-${opts.art})` } : {}),
      },
      attrs: {
        role: opts.name ? 'button' : 'presentation',
        tabindex: opts.name ? '0' : undefined,
        'aria-label': opts.name
          ? `${opts.name}, ${opts.attack ?? 0} attack, ${opts.durability ?? 0} durability`
          : 'No weapon equipped',
      },
    });
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-weaponslot__socket', attrs: { 'aria-hidden': 'true' } }));
    if (!opts.name) return;

    root.appendChild(h('span', { class: 'fui-weaponslot__art', attrs: { 'aria-hidden': 'true' } }));

    if (opts.attack != null) {
      this.attackEl = h('span', { class: 'fui-weaponslot__attack fui-num', text: String(opts.attack) });
      root.appendChild(this.attackEl);
    }
    if (opts.durability != null) {
      this.durEl = h('span', {
        class: 'fui-weaponslot__dur fui-num',
        dataset: {
          low: opts.durability <= 1 ? 'on' : 'off',
          damaged: opts.maxDurability != null && opts.durability < opts.maxDurability ? 'on' : 'off',
        },
        text: String(opts.durability),
      });
      root.appendChild(this.durEl);
    }

    const tip = h('div', { class: 'fui-weaponslot__tip', attrs: { role: 'tooltip' } });
    tip.appendChild(h('span', { class: 'fui-weaponslot__tipname', text: opts.name }));
    if (opts.text) tip.appendChild(h('p', { class: 'fui-weaponslot__tiptext', text: opts.text }));
    root.appendChild(tip);

    root.addEventListener('click', () => this.emit('weapon:select', opts.name));
  }

  /** Spend one durability. Fires `weapon:break` when it runs out. */
  swing(): this {
    if (this.opts.durability == null) return this;
    const left = Math.max(0, this.opts.durability - 1);
    this.setDurability(left);
    this.opts.used = true;
    this.el.dataset.used = 'on';
    if (left === 0) {
      this.emit('weapon:break', this.opts.name);
      this.unequip();
    }
    return this;
  }

  /** Set durability directly. */
  setDurability(durability: number): this {
    this.opts.durability = durability;
    if (this.durEl) {
      this.durEl.textContent = String(durability);
      this.durEl.dataset.low = durability <= 1 ? 'on' : 'off';
      const max = this.opts.maxDurability ?? durability;
      this.durEl.dataset.damaged = durability < max ? 'on' : 'off';
    }
    return this;
  }

  /** Free the weapon at the start of a turn. */
  ready(): this {
    this.opts.used = false;
    this.el.dataset.used = 'off';
    return this;
  }

  /** Empty the slot, leaving the socket. */
  unequip(): this {
    this.opts.name = undefined;
    this.el.dataset.empty = 'on';
    this.el.setAttribute('aria-label', 'No weapon equipped');
    for (const child of Array.from(this.el.children)) {
      if (!child.classList.contains('fui-weaponslot__socket')) child.remove();
    }
    this.attackEl = null;
    this.durEl = null;
    return this;
  }
}
