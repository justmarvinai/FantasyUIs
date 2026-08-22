import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp } from '../core/dom.ts';

export interface AbilityButtonOptions extends BaseOptions {
  /** Painted icon asset id for the ability art. */
  art?: string;
  /** Ability name — the tooltip and accessible name. */
  name?: string;
  /** Keybind printed in the corner, e.g. `'Q'`. */
  key?: string;
  /** Seconds left on cooldown. `0` is ready. */
  cooldown?: number;
  /** Total cooldown, so the sweep knows how far round to start. */
  cooldownMax?: number;
  /** Stacked charges, printed as `2/3`. */
  charges?: number;
  /** Maximum charges. */
  chargesMax?: number;
  /** Resource cost, printed under the art. */
  cost?: number;
  /** Glyph asset id for the cost's resource. */
  costGlyph?: string;
  /** Resource the player actually has. Below `cost` the button greys out. */
  resource?: number;
  /** Why it cannot be used, printed in the tooltip instead of the name. */
  blocked?: string;
  /** Size in pixels. */
  size?: number;
  /** Currently channelling or queued. */
  active?: boolean;
  /** Convenience shorthand for `.on('click', ...)`. */
  onClick?: (ev: MouseEvent) => void;
}

/**
 * One skill button, with everything a player reads off it mid-fight: art,
 * keybind, cooldown sweep, charges, cost, and whether it can be pressed at all.
 * `ActionBar` is the whole hotbar; this is the single button, for a HUD corner,
 * a tooltip, a talent row or a mobile thumb control.
 *
 *   const dash = new AbilityButton({
 *     art: 'fire-flame-burst', name: 'Emberdash', key: 'Q', size: 64,
 *     cooldown: 3.2, cooldownMax: 8, cost: 30, costGlyph: 'glyph-magic-flame', resource: 45,
 *   });
 *   loop.on('tick', (dt) => dash.tick(dt));
 *   dash.on('ability:use', () => player.cast('emberdash'));
 *
 * `tick()` is driven from the caller's own loop rather than an internal timer:
 * a cooldown that keeps counting while the game is paused, or that drifts from
 * the server's number, is worse than no cooldown at all. The button refuses the
 * click itself when it is on cooldown, unaffordable or blocked, so a caller
 * never has to re-check the same three conditions in its handler — and the
 * reason lands in the tooltip rather than in a toast.
 */
export class AbilityButton extends FuiComponent<AbilityButtonOptions> {
  private sweep: HTMLElement;
  private timeEl: HTMLElement;
  private chargeEl: HTMLElement | null = null;

  constructor(opts: AbilityButtonOptions = {}) {
    const root = h('button', {
      class: 'fui fui-abilitybtn',
      style: {
        '--fui-ability-size': `${opts.size ?? 60}px`,
        ...(opts.art ? { '--fui-ability-art': `var(--fui-img-${opts.art})` } : {}),
      },
      attrs: { type: 'button', 'aria-label': opts.name ?? 'Ability' },
    });
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-abilitybtn__plate', attrs: { 'aria-hidden': 'true' } }));
    root.appendChild(h('span', { class: 'fui-abilitybtn__art' }));

    this.sweep = h('span', { class: 'fui-abilitybtn__sweep', attrs: { 'aria-hidden': 'true' } });
    root.appendChild(this.sweep);

    this.timeEl = h('span', { class: 'fui-abilitybtn__time fui-num' });
    root.appendChild(this.timeEl);

    if (opts.key) root.appendChild(h('kbd', { class: 'fui-abilitybtn__key', text: opts.key }));

    if (opts.chargesMax != null) {
      this.chargeEl = h('span', { class: 'fui-abilitybtn__charges fui-num' });
      root.appendChild(this.chargeEl);
    }

    if (opts.cost != null) {
      const cost = h('span', { class: 'fui-abilitybtn__cost' });
      if (opts.costGlyph) {
        cost.appendChild(
          h('span', {
            class: 'fui-abilitybtn__costglyph',
            style: { '--fui-ability-costglyph': `var(--fui-img-${opts.costGlyph})` },
          }),
        );
      }
      cost.appendChild(h('span', { class: 'fui-abilitybtn__costnum fui-num', text: String(opts.cost) }));
      root.appendChild(cost);
    }

    root.addEventListener('click', (ev) => {
      if (this.why()) {
        ev.stopImmediatePropagation();
        this.el.dataset.refused = 'on';
        // The refusal shake is one animation replayed on demand, so a second
        // press inside its duration re-triggers instead of being swallowed.
        void this.el.offsetWidth;
        this.el.dataset.refused = 'off';
        this.emit('ability:refused', this.why());
        return;
      }
      this.emit('ability:use', this.opts.name);
    });
    if (opts.onClick) root.addEventListener('click', opts.onClick as EventListener);

    this.paint();
  }

  /** Advance the cooldown by `dt` seconds. Call it from your own game loop. */
  tick(dt: number): this {
    if (!this.opts.cooldown) return this;
    const before = this.opts.cooldown;
    this.opts.cooldown = Math.max(0, before - dt);
    this.paint();
    if (before > 0 && this.opts.cooldown === 0) this.emit('ability:ready', this.opts.name);
    return this;
  }

  /** Put it on cooldown. Omit `seconds` to use the full duration. */
  trigger(seconds = this.opts.cooldownMax ?? 0): this {
    this.opts.cooldown = seconds;
    this.opts.cooldownMax = Math.max(seconds, this.opts.cooldownMax ?? seconds);
    if (this.opts.charges != null) this.opts.charges = Math.max(0, this.opts.charges - 1);
    this.paint();
    return this;
  }

  /** Update how much resource the player has. */
  setResource(resource: number): this {
    this.opts.resource = resource;
    this.paint();
    return this;
  }

  /** Set or clear the blocking reason — silenced, out of range, no target. */
  setBlocked(reason?: string): this {
    this.opts.blocked = reason;
    this.paint();
    return this;
  }

  /** Why the button will refuse a press, or null. */
  why(): string | null {
    const o = this.opts;
    if (o.blocked) return o.blocked;
    if (o.chargesMax != null && (o.charges ?? 0) <= 0) return 'No charges';
    if ((o.cooldown ?? 0) > 0) return `${o.cooldown!.toFixed(1)}s left`;
    if (o.cost != null && o.resource != null && o.resource < o.cost) return 'Not enough resource';
    return null;
  }

  private paint(): void {
    const o = this.opts;
    const left = o.cooldown ?? 0;
    const max = o.cooldownMax || left || 1;
    this.el.style.setProperty('--fui-ability-cd', String(clamp(left / max, 0, 1)));

    this.timeEl.textContent = left > 0 ? (left >= 10 ? String(Math.ceil(left)) : left.toFixed(1)) : '';
    this.sweep.dataset.on = left > 0 ? 'on' : 'off';

    if (this.chargeEl) {
      this.chargeEl.textContent = `${o.charges ?? 0}/${o.chargesMax}`;
      this.chargeEl.dataset.empty = (o.charges ?? 0) <= 0 ? 'on' : 'off';
    }

    const reason = this.why();
    this.el.dataset.state = reason ? (left > 0 ? 'cooling' : 'blocked') : o.active ? 'active' : 'ready';
    this.el.setAttribute('title', reason ? `${o.name ?? 'Ability'} — ${reason}` : (o.name ?? ''));
    this.el.setAttribute('aria-disabled', String(!!reason));
  }
}
