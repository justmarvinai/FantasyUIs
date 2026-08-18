import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clamp, commas } from '../core/dom.ts';

export interface ShardCounterOptions extends BaseOptions {
  /** What the shards build toward. */
  name: string;
  /** Manifest asset id for the shard or fragment art. */
  art?: string;
  /** Shards held. */
  have: number;
  /** Shards required. */
  need: number;
  rarity?: Rarity;
  /** Label on the summon / claim button. Hidden when the button is not wanted. */
  action?: string;
  /** Where the shards drop, shown as a hint when short. */
  source?: string;
  size?: 'sm' | 'md';
}

/**
 * Fragment progress toward a guaranteed unlock — soul shards, hero fragments,
 * the pieces a game hands out so a player can earn a specific champion instead
 * of praying for one.
 *
 *   const shards = new ShardCounter({
 *     name: 'Emberwake', art: 'fire-phoenix-rise', rarity: 'legendary',
 *     have: 64, need: 100, action: 'Summon', source: 'Fire Keep 12+',
 *   });
 *   shards.on('shard:claim', () => summon('emberwake'));
 *
 * The button only unlocks at 100%, and `add()` animates the bar so a drop feels
 * like progress rather than a number changing.
 */
export class ShardCounter extends FuiComponent<ShardCounterOptions> {
  private have: number;
  private fill: HTMLElement;
  private countEl: HTMLElement;
  private button: HTMLButtonElement | null = null;

  constructor(opts: ShardCounterOptions) {
    const root = h('div', {
      class: 'fui fui-shards',
      dataset: { rarity: opts.rarity ?? 'rare', size: opts.size ?? 'md' },
    });
    super(root, opts);
    this.have = Math.max(0, opts.have);

    const art = h('div', { class: 'fui-shards__art' });
    if (opts.art) art.style.backgroundImage = `var(--fui-img-${opts.art})`;
    root.appendChild(art);

    const main = h('div', { class: 'fui-shards__main' });
    main.appendChild(h('span', { class: 'fui-shards__name fui-title', text: opts.name }));

    this.fill = h('span', { class: 'fui-shards__fill' });
    const track = h('div', { class: 'fui-shards__track' }, this.fill);
    this.countEl = h('span', { class: 'fui-shards__count fui-num' });
    track.appendChild(this.countEl);
    main.appendChild(track);

    if (opts.source) {
      main.appendChild(h('span', { class: 'fui-shards__source', text: opts.source }));
    }
    root.appendChild(main);

    if (opts.action) {
      this.button = h('button', {
        class: 'fui-shards__action',
        text: opts.action,
        attrs: { type: 'button' },
      });
      this.button.addEventListener('click', () => {
        if (this.have >= this.opts.need) this.emit('shard:claim', this.have);
      });
      root.appendChild(this.button);
    }
    this.paint();
  }

  get(): number {
    return this.have;
  }

  /** Add shards — the animated path a drop should take. */
  add(n: number): this {
    return this.set(this.have + n);
  }

  set(value: number, opts?: { silent?: boolean }): this {
    const was = this.have;
    this.have = Math.max(0, Math.round(value));
    this.paint();
    if (!opts?.silent) this.emit('shard:change', this.have);
    if (was < this.opts.need && this.have >= this.opts.need) this.emit('shard:full', this.have);
    return this;
  }

  private paint(): void {
    const pct = clamp(this.have / Math.max(1, this.opts.need), 0, 1);
    const full = this.have >= this.opts.need;
    this.fill.style.width = `${(pct * 100).toFixed(2)}%`;
    this.countEl.textContent = `${commas(Math.min(this.have, this.opts.need))} / ${commas(this.opts.need)}`;
    this.el.classList.toggle('is-full', full);
    if (this.button) this.button.disabled = !full;
  }
}
