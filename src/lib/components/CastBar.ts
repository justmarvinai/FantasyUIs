import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp } from '../core/dom.ts';

export interface CastBarOptions extends BaseOptions {
  /** Width in pixels. */
  width?: number;
  /** Show the elapsed / total seconds readout. Default true. */
  showTime?: boolean;
  /** Fill drains right-to-left instead — channelled spells. */
  channel?: boolean;
}

/**
 * The spell cast bar: a timed fill with the ability's name and icon, plus
 * `interrupt()` for when the cast is broken.
 *
 * Emits `cast:complete` on success and `cast:interrupt` when broken.
 *
 *   const cast = new CastBar();
 *   cast.start({ name: 'Firebolt', icon: 'skill-firehand', duration: 2.5 });
 *   cast.on('cast:complete', () => dealDamage());
 */
export class CastBar extends FuiComponent<CastBarOptions> {
  private fill: HTMLElement;
  private nameEl: HTMLElement;
  private iconEl: HTMLElement;
  private timeEl: HTMLElement;
  private raf = 0;

  constructor(opts: CastBarOptions = {}) {
    const root = h('div', {
      class: 'fui fui-cast',
      style: { width: `${opts.width ?? 300}px` },
      attrs: { role: 'progressbar' },
    });
    super(root, opts);

    root.appendChild(h('div', { class: 'fui-cast__track', attrs: { 'aria-hidden': 'true' } }));
    this.fill = h('div', { class: 'fui-cast__fill' });
    root.appendChild(h('div', { class: 'fui-cast__well' }, this.fill));

    this.iconEl = h('span', { class: 'fui-cast__icon', attrs: { 'aria-hidden': 'true' } });
    this.nameEl = h('span', { class: 'fui-cast__name' });
    this.timeEl = h('span', { class: 'fui-cast__time fui-num' });
    root.appendChild(h('div', { class: 'fui-cast__text' }, this.iconEl, this.nameEl, this.timeEl));
  }

  /** Begin a cast. Calling again restarts with the new spell. */
  start(spell: { name: string; icon?: string; duration: number; interruptible?: boolean }): this {
    this.stop();
    this.el.classList.add('is-casting');
    this.el.classList.toggle('is-locked', spell.interruptible === false);
    this.nameEl.textContent = spell.name;
    this.iconEl.style.backgroundImage = spell.icon ? `var(--fui-img-${spell.icon})` : '';
    this.iconEl.style.display = spell.icon ? '' : 'none';

    const total = spell.duration * 1000;
    const started = performance.now();
    const channel = this.opts.channel === true;

    const step = (now: number) => {
      const elapsed = now - started;
      const pct = clamp(elapsed / total, 0, 1);
      this.fill.style.width = `${(channel ? 1 - pct : pct) * 100}%`;
      if (this.opts.showTime !== false) {
        this.timeEl.textContent = `${((total - elapsed) / 1000).toFixed(1)}s`;
      }
      if (pct >= 1) {
        this.el.classList.remove('is-casting');
        this.emit('cast:complete', spell);
        return;
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
    this.onDestroy(() => this.stop());
    return this;
  }

  /** Break the cast — pushback, stun, movement. */
  interrupt(reason = 'Interrupted'): this {
    if (!this.el.classList.contains('is-casting')) return this;
    this.stop();
    this.nameEl.textContent = reason;
    this.el.classList.add('is-interrupted');
    setTimeout(() => this.el.classList.remove('is-interrupted'), 700);
    this.emit('cast:interrupt', reason);
    return this;
  }

  stop(): this {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.el.classList.remove('is-casting');
    return this;
  }
}
