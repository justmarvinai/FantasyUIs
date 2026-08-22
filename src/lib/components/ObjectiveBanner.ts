import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface ObjectiveBannerOptions extends BaseOptions {
  /** The line players must read, e.g. `'Defend the Gate'`. */
  title: string;
  /** Smaller line above the title — the label, e.g. `'New objective'`. */
  kicker?: string;
  /** Detail under the title. */
  detail?: string;
  /** Glyph asset id for the mark on the left. */
  icon?: string;
  /** What kind of news this is. */
  tone?: 'objective' | 'warning' | 'success' | 'failure' | 'lore';
  /** Milliseconds on screen before it leaves on its own. `0` keeps it. */
  linger?: number;
  /** Start hidden and wait for `show()`. */
  hidden?: boolean;
}

/**
 * The wide banner that sweeps across mid-mission to tell the player the rules
 * just changed — a new objective, a wave incoming, a timer that started.
 *
 *   const banner = new ObjectiveBanner({
 *     kicker: 'New objective', title: 'Defend the Gate',
 *     detail: 'Survive three waves · 02:00', icon: 'glyph-shield-block',
 *     tone: 'objective', linger: 4000, hidden: true,
 *   });
 *   mission.on('objective', (o) => banner.show({ title: o.name, detail: o.hint }));
 *
 * Announcements interrupt each other: `show()` while one is on screen re-runs
 * the entrance on the new text rather than queueing, because a player who has
 * just been told "the gate is falling" should not have to sit through the
 * previous banner first. The single expiry timer is replaced on every call and
 * cleared on destroy, so an interrupted banner cannot take the new one down
 * with it.
 */
export class ObjectiveBanner extends FuiComponent<ObjectiveBannerOptions> {
  private kickerEl: HTMLElement;
  private titleEl: HTMLElement;
  private detailEl: HTMLElement;
  private markEl: HTMLElement;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: ObjectiveBannerOptions) {
    const root = h('div', {
      class: 'fui fui-objbanner',
      dataset: { tone: opts.tone ?? 'objective', open: opts.hidden ? 'off' : 'on' },
      attrs: { role: 'status', 'aria-live': 'polite' },
    });
    super(root, opts);

    this.markEl = h('span', {
      class: 'fui-objbanner__mark',
      dataset: { glyph: opts.icon ? 'on' : 'off' },
      style: opts.icon ? { '--fui-obj-glyph': `var(--fui-img-${opts.icon})` } : undefined,
    });
    root.appendChild(this.markEl);

    const body = h('div', { class: 'fui-objbanner__body' });
    this.kickerEl = h('span', { class: 'fui-objbanner__kicker', text: opts.kicker ?? '' });
    this.titleEl = h('span', { class: 'fui-objbanner__title', text: opts.title });
    this.detailEl = h('span', { class: 'fui-objbanner__detail', text: opts.detail ?? '' });
    body.append(this.kickerEl, this.titleEl, this.detailEl);
    root.appendChild(body);

    root.appendChild(h('span', { class: 'fui-objbanner__sweep' }));

    this.paint();
    if (!opts.hidden) this.arm();
    this.onDestroy(() => this.disarm());
  }

  /** Show the banner, optionally with new text. Interrupts whatever is up. */
  show(next: Partial<Omit<ObjectiveBannerOptions, keyof BaseOptions>> = {}): this {
    Object.assign(this.opts, next);
    this.paint();
    // Re-trigger the entrance: drop the class, force a reflow, put it back.
    this.el.dataset.open = 'off';
    void this.el.offsetWidth;
    this.el.dataset.open = 'on';
    this.emit('objective:show', this.opts.title);
    this.arm();
    return this;
  }

  /** Take it away now. */
  hide(): this {
    this.disarm();
    this.el.dataset.open = 'off';
    this.emit('objective:hide', this.opts.title);
    return this;
  }

  private arm(): void {
    this.disarm();
    const linger = this.opts.linger ?? 0;
    if (linger > 0) this.timer = setTimeout(() => this.hide(), linger);
  }

  private disarm(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private paint(): void {
    const o = this.opts;
    this.el.dataset.tone = o.tone ?? 'objective';
    this.kickerEl.textContent = o.kicker ?? '';
    this.kickerEl.dataset.empty = o.kicker ? 'off' : 'on';
    this.titleEl.textContent = o.title;
    this.detailEl.textContent = o.detail ?? '';
    this.detailEl.dataset.empty = o.detail ? 'off' : 'on';
    this.markEl.dataset.glyph = o.icon ? 'on' : 'off';
    if (o.icon) this.markEl.style.setProperty('--fui-obj-glyph', `var(--fui-img-${o.icon})`);
    else this.markEl.style.removeProperty('--fui-obj-glyph');
  }
}
