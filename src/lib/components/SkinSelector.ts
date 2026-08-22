import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear, commas } from '../core/dom.ts';

export interface Skin {
  id: string;
  name: string;
  /** Manifest asset id for the full preview art. */
  art?: string;
  /** Smaller art for the strip. Falls back to `art`. */
  thumb?: string;
  rarity?: Rarity;
  /** Owned skins can be equipped; the rest show a price. */
  owned?: boolean;
  /** Cost when not owned. */
  price?: number;
  /** Currency glyph asset id. */
  priceArt?: string;
  /** Colour swatches this skin can be dyed. */
  tints?: string[];
  /** One line of flavour. */
  blurb?: string;
  /** Where it came from, e.g. `'Season 4 reward'`. */
  source?: string;
}

export interface SkinSelectorOptions extends BaseOptions {
  /** Every skin for this character. */
  skins: Skin[];
  /** Id shown in the preview. Defaults to the equipped one. */
  selected?: string;
  /** Id currently worn. */
  equipped?: string;
  /** Name above the preview. */
  character?: string;
  /** Preview height in pixels. */
  height?: number;
}

/**
 * The cosmetics wardrobe: a large preview, the strip of everything the player
 * owns or could own, dye swatches, and one button whose label depends on
 * whether the skin is worn, owned or for sale.
 *
 *   const wardrobe = new SkinSelector({
 *     character: 'Ashen Vanguard', skins, equipped: 'default', height: 260,
 *   });
 *   wardrobe.on<Skin>('skin:equip', (s) => profile.wear(s.id));
 *   wardrobe.on<Skin>('skin:buy', (s) => store.purchase(s.id));
 *   wardrobe.on<{ skin: string; tint: string }>('skin:tint', (t) => profile.dye(t));
 *
 * One button, three meanings, is deliberate: a wardrobe that shows Equip and Buy
 * side by side makes the player read both every time. The action reflects the
 * selected skin's state, so there is only ever one thing to press — and the
 * preview updates before any network round-trip, because trying skins on is the
 * whole point of the screen.
 */
export class SkinSelector extends FuiComponent<SkinSelectorOptions> {
  private stage: HTMLElement;
  private nameEl: HTMLElement;
  private blurbEl: HTMLElement;
  private sourceEl: HTMLElement;
  private tintRow: HTMLElement;
  private strip: HTMLElement;
  private action: HTMLButtonElement;

  constructor(opts: SkinSelectorOptions) {
    const root = h('div', {
      class: 'fui fui-skinsel',
      style: { '--fui-skin-height': `${opts.height ?? 240}px` },
    });
    super(root, opts);
    this.opts.selected = opts.selected ?? opts.equipped ?? opts.skins[0]?.id;

    if (opts.character) {
      root.appendChild(h('h3', { class: 'fui-skinsel__character', text: opts.character }));
    }

    this.stage = h('div', { class: 'fui-skinsel__stage' });
    this.stage.appendChild(h('span', { class: 'fui-skinsel__art' }));
    this.stage.appendChild(h('span', { class: 'fui-skinsel__glow' }));
    this.stage.appendChild(h('span', { class: 'fui-skinsel__worn', text: 'Equipped' }));
    root.appendChild(this.stage);

    const meta = h('div', { class: 'fui-skinsel__meta' });
    this.nameEl = h('span', { class: 'fui-skinsel__name' });
    this.blurbEl = h('p', { class: 'fui-skinsel__blurb' });
    this.sourceEl = h('span', { class: 'fui-skinsel__source' });
    meta.append(this.nameEl, this.blurbEl, this.sourceEl);
    root.appendChild(meta);

    this.tintRow = h('div', { class: 'fui-skinsel__tints' });
    root.appendChild(this.tintRow);

    this.strip = h('div', { class: 'fui-skinsel__strip' });
    root.appendChild(this.strip);

    this.action = h('button', { class: 'fui-skinsel__action', attrs: { type: 'button' } });
    this.action.addEventListener('click', () => {
      const skin = this.current();
      if (!skin || skin.id === this.opts.equipped) return;
      if (skin.owned) this.equip(skin.id);
      else this.emit('skin:buy', skin);
    });
    root.appendChild(this.action);

    this.build();
    this.paint();
  }

  /** Show a skin in the preview. */
  select(id: string): this {
    if (!this.opts.skins.some((s) => s.id === id)) return this;
    this.opts.selected = id;
    this.paint();
    this.emit('skin:select', this.current());
    return this;
  }

  /** Wear the given skin. */
  equip(id: string): this {
    const skin = this.opts.skins.find((s) => s.id === id);
    if (!skin?.owned) return this;
    this.opts.equipped = id;
    this.opts.selected = id;
    this.paint();
    this.emit('skin:equip', skin);
    return this;
  }

  /** Mark a skin owned — call after a purchase clears. */
  unlock(id: string): this {
    const skin = this.opts.skins.find((s) => s.id === id);
    if (skin) {
      skin.owned = true;
      this.build();
      this.paint();
    }
    return this;
  }

  private current(): Skin | undefined {
    return this.opts.skins.find((s) => s.id === this.opts.selected);
  }

  private build(): void {
    clear(this.strip);
    for (const skin of this.opts.skins) {
      const chip = h('button', {
        class: 'fui-skinsel__chip',
        dataset: {
          id: skin.id,
          ...(skin.rarity ? { rarity: skin.rarity } : {}),
          owned: skin.owned ? 'on' : 'off',
        },
        attrs: { type: 'button', 'aria-label': skin.name },
        style: (() => {
          const art = skin.thumb ?? skin.art;
          return art ? { '--fui-skin-thumb': `var(--fui-img-${art})` } : undefined;
        })(),
      });
      if (!skin.owned) chip.appendChild(h('span', { class: 'fui-skinsel__lock' }));
      chip.addEventListener('click', () => this.select(skin.id));
      this.strip.appendChild(chip);
    }
  }

  private paint(): void {
    const skin = this.current();
    if (!skin) return;

    // An undefined custom property poisons the whole declaration it appears in,
    // so an art-less skin clears the slot instead of pointing at a missing id.
    if (skin.art) this.stage.style.setProperty('--fui-skin-art', `var(--fui-img-${skin.art})`);
    else this.stage.style.removeProperty('--fui-skin-art');
    this.stage.dataset.rarity = skin.rarity ?? 'common';
    this.stage.dataset.worn = skin.id === this.opts.equipped ? 'on' : 'off';
    this.stage.dataset.owned = skin.owned ? 'on' : 'off';

    this.nameEl.textContent = skin.name;
    this.blurbEl.textContent = skin.blurb ?? '';
    this.blurbEl.dataset.empty = skin.blurb ? 'off' : 'on';
    this.sourceEl.textContent = skin.source ?? '';
    this.sourceEl.dataset.empty = skin.source ? 'off' : 'on';

    for (const chip of Array.from(this.strip.children) as HTMLElement[]) {
      chip.dataset.state = chip.dataset.id === skin.id ? 'chosen' : 'off';
      chip.dataset.worn = chip.dataset.id === this.opts.equipped ? 'on' : 'off';
    }

    // Dyes belong to the skin, not the wardrobe — a skin with no tints hides
    // the row rather than showing an empty rail.
    clear(this.tintRow);
    this.tintRow.dataset.empty = skin.tints?.length ? 'off' : 'on';
    for (const tint of skin.tints ?? []) {
      const swatch = h('button', {
        class: 'fui-skinsel__tint',
        style: { '--fui-skin-tint': tint },
        attrs: { type: 'button', 'aria-label': `Dye ${tint}` },
      });
      swatch.addEventListener('click', () => {
        for (const s of Array.from(this.tintRow.children) as HTMLElement[]) s.dataset.on = 'off';
        swatch.dataset.on = 'on';
        this.emit('skin:tint', { skin: skin.id, tint });
      });
      this.tintRow.appendChild(swatch);
    }

    if (skin.id === this.opts.equipped) {
      this.action.textContent = 'Equipped';
      this.action.disabled = true;
      this.action.dataset.mode = 'worn';
    } else if (skin.owned) {
      this.action.textContent = 'Equip';
      this.action.disabled = false;
      this.action.dataset.mode = 'equip';
    } else {
      this.action.textContent = skin.price != null ? `Unlock — ${commas(skin.price)}` : 'Unlock';
      this.action.disabled = false;
      this.action.dataset.mode = 'buy';
      if (skin.priceArt) {
        this.action.style.setProperty('--fui-skin-coin', `var(--fui-img-${skin.priceArt})`);
      } else {
        this.action.style.removeProperty('--fui-skin-coin');
      }
    }
  }
}
