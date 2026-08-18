import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';
import { Slot } from './Slot.ts';
import type { Rarity } from '../core/component.ts';

export interface Ingredient {
  icon: string;
  name: string;
  /** How many the recipe needs. */
  need: number;
  /** How many the player actually holds. */
  have: number;
}

export interface Recipe {
  id: string;
  name: string;
  icon: string;
  rarity?: Rarity;
  /** Type line, e.g. `'Blacksmithing · Rank 3'`. */
  type?: string;
  ingredients: Ingredient[];
  /** Seconds the craft takes. Omit for instant. */
  craftTime?: number;
  /** Chance of success, 0–1. Omit for guaranteed. */
  chance?: number;
}

export interface CraftingPanelOptions extends BaseOptions {
  title?: string;
  recipes: Recipe[];
  selected?: string;
  /** Width in pixels. */
  width?: number;
}

/**
 * The crafting bench: a recipe list, the ingredient checklist for the selected
 * recipe, and a craft button that only unlocks when every material is in hand.
 *
 * Emits `craft:select` and `craft:start` with the recipe.
 *
 *   const bench = new CraftingPanel({ recipes: [{ id: 'sword', name: 'Iron Sword',
 *     icon: 'icon-sword', ingredients: [{ icon: 'icon-rune-stone',
 *     name: 'Iron Ingot', need: 4, have: 6 }] }] });
 */
export class CraftingPanel extends FuiComponent<CraftingPanelOptions> {
  private listEl: HTMLElement;
  private detailEl: HTMLElement;
  private selectedId: string;

  constructor(opts: CraftingPanelOptions) {
    const root = h('div', {
      class: 'fui fui-craft',
      style: { width: `${opts.width ?? 560}px` },
    });
    super(root, opts);
    this.selectedId = opts.selected ?? opts.recipes[0]?.id ?? '';

    root.appendChild(h('div', { class: 'fui-craft__fill', attrs: { 'aria-hidden': 'true' } }));
    root.appendChild(
      h('h2', { class: 'fui-craft__title fui-title', text: opts.title ?? 'Crafting' }),
    );

    this.listEl = h('div', { class: 'fui-craft__list fui-scroll' });
    this.detailEl = h('div', { class: 'fui-craft__detail' });
    root.appendChild(h('div', { class: 'fui-craft__cols' }, this.listEl, this.detailEl));

    this.renderList();
    this.renderDetail();
  }

  /** True when every ingredient of a recipe is satisfied. */
  static canCraft(recipe: Recipe): boolean {
    return recipe.ingredients.every((i) => i.have >= i.need);
  }

  select(id: string): this {
    this.selectedId = id;
    this.renderList();
    this.renderDetail();
    this.emit('craft:select', this.opts.recipes.find((r) => r.id === id));
    return this;
  }

  /** Refresh material counts after the player's bags change. */
  setRecipes(recipes: Recipe[]): this {
    this.opts.recipes = recipes;
    this.renderList();
    this.renderDetail();
    return this;
  }

  private renderList(): void {
    clear(this.listEl);
    for (const r of this.opts.recipes) {
      const row = h('button', {
        class: 'fui-craft__row',
        attrs: { type: 'button' },
        dataset: r.rarity ? { rarity: r.rarity } : undefined,
      });
      if (r.id === this.selectedId) row.classList.add('is-selected');
      if (!CraftingPanel.canCraft(r)) row.classList.add('is-short');

      row.appendChild(
        h('span', {
          class: 'fui-craft__rowicon',
          style: { backgroundImage: `var(--fui-img-${r.icon})` },
        }),
      );
      row.appendChild(
        h(
          'span',
          { class: 'fui-craft__rowbody' },
          h('span', { class: 'fui-craft__rowname', text: r.name }),
          r.type && h('span', { class: 'fui-craft__rowtype', text: r.type }),
        ),
      );
      row.addEventListener('click', () => this.select(r.id));
      this.listEl.appendChild(row);
    }
  }

  private renderDetail(): void {
    clear(this.detailEl);
    const r = this.opts.recipes.find((x) => x.id === this.selectedId);
    if (!r) return;

    const result = new Slot({ size: 'lg', item: { icon: r.icon, name: r.name, rarity: r.rarity } });
    this.detailEl.appendChild(h('div', { class: 'fui-craft__result' }, result.el));
    this.detailEl.appendChild(h('h3', { class: 'fui-craft__dname fui-title', text: r.name }));
    if (r.type) this.detailEl.appendChild(h('p', { class: 'fui-craft__dtype fui-label', text: r.type }));

    this.detailEl.appendChild(
      h('h4', { class: 'fui-craft__sub fui-label', text: 'Materials' }),
    );
    const list = h('ul', { class: 'fui-craft__ingredients' });
    for (const ing of r.ingredients) {
      const enough = ing.have >= ing.need;
      const li = h('li', { class: 'fui-craft__ingredient' });
      if (!enough) li.classList.add('is-short');
      li.appendChild(
        h('span', {
          class: 'fui-craft__ingicon',
          style: { backgroundImage: `var(--fui-img-${ing.icon})` },
        }),
      );
      li.appendChild(h('span', { class: 'fui-craft__ingname', text: ing.name }));
      li.appendChild(
        h('span', { class: 'fui-craft__ingcount fui-num', text: `${ing.have} / ${ing.need}` }),
      );
      list.appendChild(li);
    }
    this.detailEl.appendChild(list);

    if (r.chance != null || r.craftTime != null) {
      const meta = h('div', { class: 'fui-craft__meta' });
      if (r.chance != null) {
        meta.appendChild(
          h('span', { class: 'fui-craft__chance', text: `${Math.round(r.chance * 100)}% success` }),
        );
      }
      if (r.craftTime != null) {
        meta.appendChild(h('span', { class: 'fui-craft__time', text: `${r.craftTime}s` }));
      }
      this.detailEl.appendChild(meta);
    }

    const can = CraftingPanel.canCraft(r);
    const btn = h('button', {
      class: 'fui-craft__button',
      attrs: { type: 'button', disabled: !can },
      text: can ? 'Craft' : 'Missing materials',
    });
    btn.addEventListener('click', () => this.emit('craft:start', r));
    this.detailEl.appendChild(btn);
  }
}
