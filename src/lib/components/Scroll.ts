import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, append, clear, type Child } from '../core/dom.ts';

export interface ScrollOptions extends BaseOptions {
  /** Heading written across the top of the sheet. */
  title?: string;
  /** Line under the title — a sender, a date, a chapter number. */
  subtitle?: string;
  /** Body text. Blank lines become paragraph breaks. */
  text?: string;
  /** Arbitrary content instead of (or after) `text`. */
  content?: Child | Child[];
  /** Signature line at the foot, right-aligned. */
  signature?: string;
  /** Show the rolled caps at top and bottom. */
  rolled?: boolean;
  /** Wax seal in the corner, tinted this colour. */
  seal?: string;
  /** Glyph asset id stamped inside the seal. */
  sealGlyph?: string;
  /** Sheet width in pixels, or any CSS length such as `'100%'`. */
  width?: number | string;
  /** Cap the height in pixels (or any CSS length) and scroll the body inside. */
  maxHeight?: number | string;
  /** Slightly rotate the sheet, as if dropped on a table. */
  tilt?: number;
}

/**
 * A parchment sheet for text that is meant to be *read* rather than scanned —
 * a letter from an NPC, a lore entry, a quest brief, an in-world notice.
 *
 *   new Scroll({
 *     title: 'The Sunken Gate',
 *     subtitle: 'From Elder Rowan, of Emberwood',
 *     text: 'A gate lies beneath the marsh.\n\nIt has stayed shut for three generations.',
 *     signature: '— Rowan',
 *     rolled: true,
 *     seal: '#8c2a20',
 *     sealGlyph: 'glyph-holy-totem',
 *   });
 *
 * The body sets its own serif measure and generous leading, because the whole
 * point of this surface is a block of prose that someone will actually read;
 * every other panel in the library is optimised for scanning instead.
 */
export class Scroll extends FuiComponent<ScrollOptions> {
  readonly body: HTMLElement;

  constructor(opts: ScrollOptions = {}) {
    const root = h('div', {
      class: 'fui fui-scrollsheet',
      style: {
        ...(opts.width != null
          ? { width: typeof opts.width === 'number' ? `${opts.width}px` : opts.width }
          : {}),
        ...(opts.tilt ? { transform: `rotate(${opts.tilt}deg)` } : {}),
        ...(opts.seal ? { '--fui-scroll-seal': opts.seal } : {}),
      },
    });
    if (opts.rolled) root.classList.add('fui-scrollsheet--rolled');
    // The wax sits in the corner the signature runs into, so the sheet has to
    // know it is there and leave room.
    if (opts.seal || opts.sealGlyph) root.classList.add('fui-scrollsheet--sealed');
    super(root, opts);

    if (opts.rolled) {
      root.appendChild(h('span', { class: 'fui-scrollsheet__roll fui-scrollsheet__roll--top', attrs: { 'aria-hidden': 'true' } }));
    }

    const sheet = h('div', { class: 'fui-scrollsheet__sheet' });

    if (opts.title) {
      sheet.appendChild(h('p', { class: 'fui-scrollsheet__title fui-title', text: opts.title }));
    }
    if (opts.subtitle) {
      sheet.appendChild(h('p', { class: 'fui-scrollsheet__subtitle', text: opts.subtitle }));
    }
    if (opts.title || opts.subtitle) {
      sheet.appendChild(h('span', { class: 'fui-scrollsheet__rule', attrs: { 'aria-hidden': 'true' } }));
    }

    this.body = h('div', { class: 'fui-scrollsheet__body fui-scroll' });
    if (opts.maxHeight != null) {
      this.body.style.maxHeight =
        typeof opts.maxHeight === 'number' ? `${opts.maxHeight}px` : opts.maxHeight;
    }
    // A blank line is the paragraph break every writer already types.
    for (const para of (opts.text ?? '').split(/\n{2,}/).filter(Boolean)) {
      this.body.appendChild(h('p', { class: 'fui-scrollsheet__para', text: para.trim() }));
    }
    if (opts.content) {
      append(this.body, ...(Array.isArray(opts.content) ? opts.content : [opts.content]));
    }
    sheet.appendChild(this.body);

    if (opts.signature) {
      sheet.appendChild(h('p', { class: 'fui-scrollsheet__signature', text: opts.signature }));
    }
    root.appendChild(sheet);

    if (opts.seal || opts.sealGlyph) {
      const seal = h('span', { class: 'fui-scrollsheet__seal', attrs: { 'aria-hidden': 'true' } });
      if (opts.sealGlyph) seal.style.setProperty('--fui-glyph-src', `var(--fui-img-${opts.sealGlyph})`);
      root.appendChild(seal);
    }

    if (opts.rolled) {
      root.appendChild(h('span', { class: 'fui-scrollsheet__roll fui-scrollsheet__roll--bottom', attrs: { 'aria-hidden': 'true' } }));
    }
  }

  /** Replace the prose without rebuilding the sheet. */
  setText(text: string): this {
    clear(this.body);
    for (const para of text.split(/\n{2,}/).filter(Boolean)) {
      this.body.appendChild(h('p', { class: 'fui-scrollsheet__para', text: para.trim() }));
    }
    return this;
  }

  add(...children: Child[]): this {
    append(this.body, ...children);
    return this;
  }
}
