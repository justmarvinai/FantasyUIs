import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear, commas } from '../core/dom.ts';

export interface FusionSlot {
  /** What this slot demands — "Rare Fire champion", "Any 4★". */
  requirement: string;
  /** Manifest asset id shown as a hint when the slot is empty. */
  hintArt?: string;
  /** The champion placed here. */
  filled?: {
    id: string;
    name?: string;
    art?: string;
    rarity?: Rarity;
    stars?: number;
  } | null;
  /** Rim colour for the required affinity. */
  color?: string;
}

export interface FusionPanelOptions extends BaseOptions {
  /** What the fusion produces. */
  result: {
    /** What the fused champion is called. */
    name: string;
    /** Manifest asset id for the result portrait. */
    art?: string;
    /** Rarity of the result, which colours its frame. */
    rarity?: Rarity;
    /** Star rating printed under the result. */
    stars?: number;
    /** Line under the name — affinity, role, a teaser stat. */
    note?: string;
  };
  /** The champions the recipe consumes. */
  slots: FusionSlot[];
  /** Heading over the panel. */
  title?: string;
  /** Seconds until the fusion event closes. */
  endsIn?: number;
  /** Label on the commit button. */
  action?: string;
  /** Warning line under the recipe. */
  warning?: string;
  /** Cell size in pixels. */
  size?: number;
}

/**
 * The fusion recipe: several specific champions consumed to summon a
 * guaranteed one. Distinct from `RankUpPanel`, which spends fodder to raise a
 * champion you already own — here the reward is a *new* unit and each slot has
 * its own requirement.
 *
 *   const fusion = new FusionPanel({
 *     title: 'Fusion — Emberwake',
 *     result: { name: 'Emberwake', art: 'fire-phoenix-rise', rarity: 'legendary', stars: 5 },
 *     slots: [
 *       { requirement: 'Rare · Fire', color: '#ff7a3d', filled: { id: 'a', art: 'fire-golden-flame', rarity: 'rare' } },
 *       { requirement: 'Epic · Void', color: '#a335ee' },
 *     ],
 *     endsIn: 86_400 * 5,
 *     warning: 'Fused champions are consumed permanently.',
 *   });
 *   fusion.on<number>('fusion:slot', (i) => openPicker(i));
 *
 * The commit button reports how many slots are still missing rather than simply
 * greying out, because "why can't I press this" is the question that panel
 * always has to answer.
 */
export class FusionPanel extends FuiComponent<FusionPanelOptions> {
  private grid: HTMLElement;
  private button: HTMLButtonElement;
  private progressEl: HTMLElement;

  constructor(opts: FusionPanelOptions) {
    const root = h('div', {
      class: 'fui fui-fusion',
      dataset: { rarity: opts.result.rarity ?? 'legendary' },
      style: { '--fui-fusion-size': `${opts.size ?? 66}px` },
    });
    super(root, opts);

    if (opts.title) {
      root.appendChild(h('p', { class: 'fui-fusion__title fui-title', text: opts.title }));
    }

    // ── Result ────────────────────────────────────────────────────────────
    const result = h('div', { class: 'fui-fusion__result' });
    const art = h('span', { class: 'fui-fusion__result-art' });
    if (opts.result.art) art.style.backgroundImage = `var(--fui-img-${opts.result.art})`;
    result.appendChild(art);

    const info = h('div', { class: 'fui-fusion__result-info' });
    info.appendChild(h('span', { class: 'fui-fusion__result-name fui-title', text: opts.result.name }));
    if (opts.result.stars) {
      info.appendChild(
        h('span', { class: 'fui-fusion__stars', text: '★'.repeat(opts.result.stars) }),
      );
    }
    if (opts.result.note) {
      info.appendChild(h('span', { class: 'fui-fusion__result-note', text: opts.result.note }));
    }
    if (opts.endsIn) {
      const days = Math.floor(opts.endsIn / 86400);
      const hours = Math.floor((opts.endsIn % 86400) / 3600);
      info.appendChild(
        h('span', {
          class: 'fui-fusion__ends fui-num',
          text: days > 0 ? `Ends in ${days}d ${hours}h` : `Ends in ${hours}h`,
        }),
      );
    }
    result.appendChild(info);
    root.appendChild(result);

    root.appendChild(h('span', { class: 'fui-fusion__arrow', text: '▲', attrs: { 'aria-hidden': 'true' } }));

    // ── Recipe ────────────────────────────────────────────────────────────
    this.grid = h('div', { class: 'fui-fusion__grid' });
    root.appendChild(this.grid);

    this.progressEl = h('p', { class: 'fui-fusion__progress fui-num' });
    root.appendChild(this.progressEl);

    if (opts.warning) {
      root.appendChild(h('p', { class: 'fui-fusion__warning', text: opts.warning }));
    }

    this.button = h('button', {
      class: 'fui-fusion__action',
      text: opts.action ?? 'Fuse',
      attrs: { type: 'button' },
    });
    this.button.addEventListener('click', () => {
      if (this.isReady()) this.emit('fusion:confirm', this.opts.slots);
    });
    root.appendChild(this.button);

    this.render();
  }

  private render(): void {
    clear(this.grid);

    this.opts.slots.forEach((slot, i) => {
      const cell = h('button', {
        class: 'fui-fusion__slot',
        dataset: { rarity: slot.filled?.rarity ?? 'empty' },
        style: slot.color ? { '--fui-fusion-ink': slot.color } : {},
        attrs: { type: 'button', title: slot.filled?.name ?? slot.requirement },
      });
      if (!slot.filled) cell.classList.add('is-empty');

      const art = h('span', { class: 'fui-fusion__slot-art' });
      if (slot.filled?.art) art.style.backgroundImage = `var(--fui-img-${slot.filled.art})`;
      else if (slot.hintArt) {
        art.classList.add('is-hint');
        art.style.backgroundImage = `var(--fui-img-${slot.hintArt})`;
      }
      cell.appendChild(art);

      if (slot.filled?.stars) {
        cell.appendChild(
          h('span', { class: 'fui-fusion__slot-stars', text: '★'.repeat(slot.filled.stars) }),
        );
      }
      cell.appendChild(h('span', { class: 'fui-fusion__req', text: slot.requirement }));

      cell.addEventListener('click', () => this.emit('fusion:slot', i));
      this.grid.appendChild(cell);
    });

    const filled = this.filledCount();
    const total = this.opts.slots.length;
    this.progressEl.textContent = `${commas(filled)} / ${commas(total)} champions placed`;
    this.progressEl.classList.toggle('is-ready', filled >= total);
    this.button.disabled = filled < total;
    // Saying what is missing beats greying out and leaving the player to guess.
    this.button.textContent =
      filled >= total ? (this.opts.action ?? 'Fuse') : `${total - filled} more needed`;
  }

  /** Put a champion in one slot, or clear it with `null`. */
  setSlot(index: number, unit: FusionSlot['filled']): this {
    const slot = this.opts.slots[index];
    if (!slot) return this;
    slot.filled = unit;
    this.render();
    this.emit('fusion:change', this.opts.slots);
    return this;
  }

  /** How many slots are filled. */
  filledCount(): number {
    return this.opts.slots.filter((s) => s.filled).length;
  }

  /** True once every slot has a champion in it. */
  isReady(): boolean {
    return this.filledCount() >= this.opts.slots.length;
  }
}
