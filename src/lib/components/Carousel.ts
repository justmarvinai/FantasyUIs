import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp, type Child } from '../core/dom.ts';

export interface CarouselOptions extends BaseOptions {
  /** One element per slide. */
  slides: Child[];
  /** Slide index shown first. */
  index?: number;
  /** How many slides are visible at once. Defaults to 1. */
  perView?: number;
  gap?: number;
  /** Show the dot pager under the track. */
  dots?: boolean;
  /** Show the previous / next arrows. */
  arrows?: boolean;
  /** Wrap around at both ends. */
  loop?: boolean;
  /** Advance automatically every N milliseconds. */
  autoplay?: number;
  /** Aspect ratio for the viewport, e.g. `'16 / 7'`. */
  ratio?: string;
}

/**
 * A horizontal slider for anything a game rotates through: featured summon
 * banners, event promos, the news carousel on a title screen, a champion's
 * skill pages.
 *
 *   const banners = new Carousel({
 *     slides: [bannerA, bannerB, bannerC],
 *     autoplay: 5000,
 *     loop: true,
 *     ratio: '16 / 7',
 *   });
 *   banners.on<number>('carousel:change', (i) => track('banner', i));
 *
 * Autoplay pauses on hover and on focus, and stops for good the moment the
 * player takes manual control.
 */
export class Carousel extends FuiComponent<CarouselOptions> {
  private index: number;
  private track: HTMLElement;
  private dots: HTMLElement[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: CarouselOptions) {
    const perView = Math.max(1, opts.perView ?? 1);
    const root = h('div', {
      class: 'fui fui-carousel',
      style: {
        '--fui-car-per': String(perView),
        '--fui-car-gap': `${opts.gap ?? 12}px`,
        ...(opts.ratio ? { '--fui-car-ratio': opts.ratio } : {}),
      },
      attrs: { role: 'group', 'aria-roledescription': 'carousel' },
    });
    super(root, opts);

    this.index = clamp(opts.index ?? 0, 0, Math.max(0, opts.slides.length - perView));
    this.track = h('div', { class: 'fui-carousel__track' });

    for (const slide of opts.slides) {
      const cell = h('div', { class: 'fui-carousel__slide' });
      if (slide != null && slide !== false) {
        cell.appendChild(typeof slide === 'object' ? slide : this.el.ownerDocument.createTextNode(String(slide)));
      }
      this.track.appendChild(cell);
    }
    root.appendChild(h('div', { class: 'fui-carousel__viewport' }, this.track));

    if (opts.arrows ?? true) {
      root.appendChild(this.makeArrow('prev'));
      root.appendChild(this.makeArrow('next'));
    }
    if (opts.dots ?? true) {
      const pager = h('div', { class: 'fui-carousel__dots' });
      for (let i = 0; i < this.pages(); i++) {
        const dot = h('button', {
          class: 'fui-carousel__dot',
          attrs: { type: 'button', 'aria-label': `Slide ${i + 1}` },
        });
        dot.addEventListener('click', () => this.go(i, { manual: true }));
        this.dots.push(dot);
        pager.appendChild(dot);
      }
      root.appendChild(pager);
    }

    if (opts.autoplay) {
      this.timer = setInterval(() => this.next(), opts.autoplay);
      // Pausing on hover and focus keeps a banner from sliding away mid-read.
      root.addEventListener('pointerenter', () => this.pause());
      root.addEventListener('focusin', () => this.pause());
    }
    this.onDestroy(() => this.pause());
    this.paint();
  }

  /** Number of distinct scroll positions, given `perView`. */
  private pages(): number {
    return Math.max(1, this.opts.slides.length - Math.max(1, this.opts.perView ?? 1) + 1);
  }

  private makeArrow(dir: 'prev' | 'next'): HTMLElement {
    const btn = h('button', {
      class: `fui-carousel__arrow fui-carousel__arrow--${dir}`,
      attrs: { type: 'button', 'aria-label': dir === 'prev' ? 'Previous' : 'Next' },
    });
    btn.addEventListener('click', () => (dir === 'prev' ? this.prev(true) : this.next(true)));
    return btn;
  }

  get(): number {
    return this.index;
  }

  next(manual = false): this {
    const last = this.pages() - 1;
    const at = this.index >= last;
    return this.go(at ? (this.opts.loop ? 0 : last) : this.index + 1, { manual });
  }

  prev(manual = false): this {
    const last = this.pages() - 1;
    const at = this.index <= 0;
    return this.go(at ? (this.opts.loop ? last : 0) : this.index - 1, { manual });
  }

  go(index: number, opts?: { manual?: boolean; silent?: boolean }): this {
    // Manual control wins: once the player drives, autoplay stops for good.
    if (opts?.manual) this.pause();
    const next = clamp(index, 0, this.pages() - 1);
    if (next === this.index) return this;
    this.index = next;
    this.paint();
    if (!opts?.silent) this.emit('carousel:change', next);
    return this;
  }

  /** Stop autoplay. Called automatically on hover, focus and manual input. */
  pause(): this {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    return this;
  }

  private paint(): void {
    this.el.style.setProperty('--fui-car-index', String(this.index));
    this.dots.forEach((d, i) => {
      d.classList.toggle('is-on', i === this.index);
      d.setAttribute('aria-current', String(i === this.index));
    });
  }
}
