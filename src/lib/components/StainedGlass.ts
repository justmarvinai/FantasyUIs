import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, append, type Child } from '../core/dom.ts';

export interface GlassPane {
  /** Pane colour. */
  color: string;
  /** How wide this pane is relative to its neighbours. */
  span?: number;
  /** Glyph asset id leaded into the pane. */
  glyph?: string;
  /** Lit panes glow; a dark one reads as a chapter not yet reached. */
  dark?: boolean;
}

export interface StainedGlassOptions extends BaseOptions {
  /** Rows of panes, top to bottom. */
  rows?: GlassPane[][];
  /** Content laid over the window. */
  content?: Child | Child[];
  /** Height in pixels, or any CSS length. */
  height?: number | string;
  /** Arch shape at the top. `none` is a plain rectangle. */
  arch?: 'gothic' | 'round' | 'none';
  /** Lead came thickness in pixels. */
  lead?: number;
  /** How strongly light pours through, 0–1. */
  light?: number;
  /** Glyph asset id for the rose window at the centre of the arch. */
  rose?: string;
}

const DEFAULT_ROWS: GlassPane[][] = [
  [{ color: '#3b6ea5' }, { color: '#c9502a', span: 1.4 }, { color: '#3b6ea5' }],
  [{ color: '#c9a248', span: 1.2 }, { color: '#2f6b53' }, { color: '#7a3d8f', span: 1.2 }],
  [{ color: '#2f6b53' }, { color: '#3b6ea5', span: 1.4 }, { color: '#c9502a' }],
];

/**
 * The cathedral window: leaded panes of coloured glass with light coming
 * through. A temple screen, a paladin order's hall, a chapter-select where each
 * pane is a chapter and a dark pane is one you have not reached.
 *
 *   new StainedGlass({
 *     arch: 'gothic', height: 320, light: 0.7, rose: 'glyph-holy-cross',
 *     rows: [
 *       [{ color: '#3b6ea5' }, { color: '#c9502a', span: 1.4, glyph: 'glyph-holy-totem' }],
 *       [{ color: '#c9a248' }, { color: '#2f6b53', dark: true }],
 *     ],
 *   });
 *
 * The lead came is the gap: panes sit in a flex grid over a dark ground, so the
 * background shows through between them and no border has to be drawn twice at
 * every join. The arch is a `clip-path` on the whole window, which means the
 * panes need to know nothing about the shape they are being cut into.
 */
export class StainedGlass extends FuiComponent<StainedGlassOptions> {
  readonly overlay: HTMLElement;

  constructor(opts: StainedGlassOptions = {}) {
    const root = h('div', {
      class: 'fui fui-glass',
      dataset: { arch: opts.arch ?? 'gothic' },
      style: {
        '--fui-glass-lead': `${opts.lead ?? 4}px`,
        '--fui-glass-light': String(opts.light ?? 0.6),
        ...(opts.height != null
          ? { height: typeof opts.height === 'number' ? `${opts.height}px` : opts.height }
          : {}),
      },
    });
    super(root, opts);

    const window_ = h('div', { class: 'fui-glass__window', attrs: { 'aria-hidden': 'true' } });
    for (const row of opts.rows ?? DEFAULT_ROWS) {
      const rowEl = h('div', { class: 'fui-glass__row' });
      for (const pane of row) {
        const paneEl = h('div', {
          class: 'fui-glass__pane',
          dataset: { dark: String(!!pane.dark) },
          style: { '--fui-glass-ink': pane.color, flexGrow: String(pane.span ?? 1) },
        });
        if (pane.glyph) {
          paneEl.appendChild(
            h('span', {
              class: 'fui-glass__glyph',
              style: { '--fui-glyph-src': `var(--fui-img-${pane.glyph})` },
            }),
          );
        }
        rowEl.appendChild(paneEl);
      }
      window_.appendChild(rowEl);
    }
    root.appendChild(window_);

    if (opts.rose) {
      root.appendChild(
        h('span', {
          class: 'fui-glass__rose',
          style: { '--fui-glyph-src': `var(--fui-img-${opts.rose})` },
          attrs: { 'aria-hidden': 'true' },
        }),
      );
    }

    // The shaft of light is drawn over the glass, not under it, so content laid
    // on the window still sits above it.
    root.appendChild(h('span', { class: 'fui-glass__shaft', attrs: { 'aria-hidden': 'true' } }));

    this.overlay = h('div', { class: 'fui-glass__overlay' });
    if (opts.content != null) {
      append(this.overlay, ...(Array.isArray(opts.content) ? opts.content : [opts.content]));
    }
    root.appendChild(this.overlay);
  }

  /** How strongly light pours through, 0–1. */
  setLight(light: number): this {
    this.opts.light = light;
    this.el.style.setProperty('--fui-glass-light', String(light));
    return this;
  }
}
