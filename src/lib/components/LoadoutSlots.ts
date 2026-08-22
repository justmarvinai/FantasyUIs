import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, commas } from '../core/dom.ts';

export interface Loadout {
  id: string;
  /** What the player called it. */
  name: string;
  /** Line under the name — a role, a target, a note to self. */
  note?: string;
  /** Manifest asset ids for the units or gear in it, drawn as a strip. */
  art?: string[];
  /** Power, gear score, or whatever the game rates a build on. */
  power?: number;
  /** Currently equipped. */
  active?: boolean;
  /** Nothing saved here yet. */
  empty?: boolean;
  /** Locked until a requirement is met. */
  locked?: boolean;
  /** What would unlock it. */
  requirement?: string;
}

export interface LoadoutSlotsOptions extends BaseOptions {
  /** The slots, in order. Include empty ones — they are the invitation. */
  slots: Loadout[];
  /** Heading over the row. */
  title?: string;
  /** Line under the heading. */
  hint?: string;
  /** Label on the save-here button. */
  saveLabel?: string;
  /** Slots can be renamed in place. */
  renameable?: boolean;
  /** Cost of unlocking another slot, shown on the locked ones. */
  unlockCost?: string;
}

/**
 * Saved build presets: the row of slots a player swaps their whole setup
 * through. Gear sets, team comps, talent builds, spell bars.
 *
 *   const slots = new LoadoutSlots({
 *     title: 'Loadouts', renameable: true, saveLabel: 'Save here',
 *     unlockCost: '400 gems',
 *     slots: [
 *       { id: '1', name: 'Clan boss', note: 'Poison stack', power: 204_000, active: true,
 *         art: ['blood-necromancer', 'hero-vanguard', 'hero-duelist'] },
 *       { id: '2', name: 'Arena', power: 191_000, art: ['fire-phoenix-rise'] },
 *       { id: '3', name: '', empty: true },
 *       { id: '4', name: '', locked: true, requirement: 'Account level 60' },
 *     ],
 *   });
 *   slots.on<string>('loadout:equip', (id) => hero.equip(id));
 *
 * An empty slot is a button that says "save here", not a greyed-out card — the
 * whole point of the row is to invite a second build. A locked slot says what
 * would unlock it and what that costs, because a slot the player cannot use is
 * the one they most want to know about.
 */
export class LoadoutSlots extends FuiComponent<LoadoutSlotsOptions> {
  private row: HTMLElement;

  constructor(opts: LoadoutSlotsOptions) {
    const root = h('div', { class: 'fui fui-loadout' });
    super(root, opts);

    if (opts.title || opts.hint) {
      const head = h('div', { class: 'fui-loadout__head' });
      if (opts.title) {
        head.appendChild(h('span', { class: 'fui-loadout__title fui-title', text: opts.title }));
      }
      if (opts.hint) head.appendChild(h('span', { class: 'fui-loadout__hint', text: opts.hint }));
      root.appendChild(head);
    }

    this.row = h('div', { class: 'fui-loadout__row' });
    root.appendChild(this.row);
    this.render();
  }

  /** The slot currently equipped. */
  active(): Loadout | undefined {
    return this.opts.slots.find((s) => s.active);
  }

  /** Equip a slot. An empty or locked one refuses. */
  equip(id: string): this {
    const slot = this.opts.slots.find((s) => s.id === id);
    if (!slot || slot.empty || slot.locked) return this;
    for (const s of this.opts.slots) s.active = s.id === id;
    this.render();
    this.emit('loadout:equip', id);
    return this;
  }

  /** Rename a slot. */
  rename(id: string, name: string): this {
    const slot = this.opts.slots.find((s) => s.id === id);
    if (!slot) return this;
    slot.name = name;
    this.render();
    this.emit('loadout:rename', { id, name });
    return this;
  }

  /** Replace the slots. */
  setSlots(slots: Loadout[]): this {
    this.opts.slots = slots;
    this.render();
    return this;
  }

  private render(): void {
    clear(this.row);
    for (const slot of this.opts.slots) {
      const state = slot.locked ? 'locked' : slot.empty ? 'empty' : slot.active ? 'active' : 'saved';
      const card = h('div', { class: 'fui-loadout__slot', dataset: { state } });

      if (slot.locked) {
        card.appendChild(h('span', { class: 'fui-loadout__lock', attrs: { 'aria-hidden': 'true' } }));
        card.appendChild(
          h('span', { class: 'fui-loadout__locked-label', text: slot.requirement ?? 'Locked' }),
        );
        if (this.opts.unlockCost) {
          const buy = h('button', {
            class: 'fui-loadout__unlock',
            text: this.opts.unlockCost,
            attrs: { type: 'button' },
          });
          buy.addEventListener('click', () => this.emit('loadout:unlock', slot.id));
          card.appendChild(buy);
        }
        this.row.appendChild(card);
        continue;
      }

      if (slot.empty) {
        // An empty slot is the invitation, so it is a button, not a grey card.
        const save = h('button', { class: 'fui-loadout__save', attrs: { type: 'button' } });
        save.appendChild(h('span', { class: 'fui-loadout__plus', text: '+' }));
        save.appendChild(
          h('span', { class: 'fui-loadout__save-label', text: this.opts.saveLabel ?? 'Save here' }),
        );
        save.addEventListener('click', () => this.emit('loadout:save', slot.id));
        card.appendChild(save);
        this.row.appendChild(card);
        continue;
      }

      const strip = h('div', { class: 'fui-loadout__strip' });
      for (const art of (slot.art ?? []).slice(0, 5)) {
        strip.appendChild(
          h('span', {
            class: 'fui-loadout__face',
            style: { backgroundImage: `var(--fui-img-${art})` },
          }),
        );
      }
      if ((slot.art?.length ?? 0) > 5) {
        strip.appendChild(
          h('span', { class: 'fui-loadout__more fui-num', text: `+${(slot.art?.length ?? 0) - 5}` }),
        );
      }
      card.appendChild(strip);

      if (this.opts.renameable) {
        const input = h('input', {
          class: 'fui-loadout__name fui-loadout__name--input',
          attrs: { type: 'text', value: slot.name, 'aria-label': 'Loadout name', maxlength: '24' },
        });
        input.addEventListener('change', () => this.rename(slot.id, input.value));
        card.appendChild(input);
      } else {
        card.appendChild(h('span', { class: 'fui-loadout__name', text: slot.name }));
      }

      const meta = [slot.note, slot.power != null ? `${commas(slot.power)} power` : null]
        .filter(Boolean)
        .join('  ·  ');
      if (meta) card.appendChild(h('span', { class: 'fui-loadout__meta', text: meta }));

      const equip = h('button', {
        class: 'fui-loadout__equip',
        text: slot.active ? 'Equipped' : 'Equip',
        attrs: { type: 'button', disabled: slot.active || undefined },
      });
      equip.addEventListener('click', () => this.equip(slot.id));
      card.appendChild(equip);

      const over = h('button', {
        class: 'fui-loadout__overwrite',
        text: 'Overwrite',
        attrs: { type: 'button', title: `Save the current setup into ${slot.name}` },
      });
      over.addEventListener('click', () => this.emit('loadout:save', slot.id));
      card.appendChild(over);

      this.row.appendChild(card);
    }
  }
}
