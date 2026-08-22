import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface SignpostArm {
  id: string;
  /** Burned into the plank. */
  label: string;
  /** Small line under the label — a distance, a level range, a warning. */
  note?: string;
  /** Which way the plank points. */
  side?: 'left' | 'right';
  /** Glyph asset id burned in beside the text. */
  glyph?: string;
  /** Cannot be taken yet. */
  locked?: boolean;
  /** The way the player is being sent. */
  current?: boolean;
  /** Tilt in degrees, so a row of planks does not look machined. */
  tilt?: number;
}

export interface SignpostOptions extends BaseOptions {
  /** The planks, top to bottom. */
  arms: SignpostArm[];
  /** Carved into the post cap. */
  title?: string;
  /** Post height in pixels. */
  height?: number;
  /** Wood tone. */
  wood?: 'oak' | 'walnut' | 'ashen';
  /** Hang a lantern from the cap. */
  lantern?: boolean;
}

/**
 * The wooden signpost at a crossroads — a nav menu that belongs in the world
 * rather than in a panel. Hub towns, chapter select, "where to next".
 *
 *   const post = new Signpost({
 *     title: 'Crossroads', lantern: true, wood: 'walnut',
 *     arms: [
 *       { id: 'town', label: 'Emberwood', note: 'Lv 12 · half a day', side: 'left', glyph: 'glyph-holy-totem' },
 *       { id: 'mire', label: 'The Rotmire', note: 'Lv 32 · turn back', side: 'right', locked: true },
 *     ],
 *   });
 *   post.on<string>('sign:pick', (id) => travel.to(id));
 *
 * Each plank is a button clipped into an arrow by `clip-path`, pointing the way
 * its `side` says — so the shape carries the direction and the label does not
 * have to. Planks alternate sides on their own when `side` is left out, which
 * is what stops a five-way crossroads becoming a list.
 */
export class Signpost extends FuiComponent<SignpostOptions> {
  private post: HTMLElement;

  constructor(opts: SignpostOptions) {
    const root = h('div', {
      class: 'fui fui-sign',
      dataset: { wood: opts.wood ?? 'oak' },
      style: { '--fui-sign-h': `${opts.height ?? 300}px` },
    });
    super(root, opts);

    const cap = h('div', { class: 'fui-sign__cap' });
    if (opts.title) {
      cap.appendChild(h('span', { class: 'fui-sign__title', text: opts.title }));
    }
    if (opts.lantern) {
      const lantern = h('span', { class: 'fui-sign__lantern', attrs: { 'aria-hidden': 'true' } });
      lantern.appendChild(h('span', { class: 'fui-sign__flame' }));
      cap.appendChild(lantern);
    }
    root.appendChild(cap);

    this.post = h('div', { class: 'fui-sign__post' });
    root.appendChild(this.post);
    this.render();
  }

  /** Replace the planks. */
  setArms(arms: SignpostArm[]): this {
    this.opts.arms = arms;
    this.render();
    return this;
  }

  private render(): void {
    clear(this.post);
    this.opts.arms.forEach((arm, i) => {
      // Alternating is the default because a signpost with every plank on one
      // side is a list wearing a costume.
      const side = arm.side ?? (i % 2 === 0 ? 'left' : 'right');
      const tilt = arm.tilt ?? (i % 2 === 0 ? -1.6 : 1.4);
      const el = h(arm.locked ? 'div' : 'button', {
        class: 'fui-sign__arm',
        dataset: { side, state: arm.locked ? 'locked' : arm.current ? 'current' : 'open' },
        style: { '--fui-sign-tilt': `${tilt}deg` },
        attrs: {
          type: arm.locked ? undefined : 'button',
          'aria-label': arm.label,
          title: arm.locked ? 'Not yet' : arm.label,
        },
      });

      const plank = h('span', { class: 'fui-sign__plank' });
      if (arm.glyph) {
        plank.appendChild(
          h('span', {
            class: 'fui-sign__glyph',
            style: { '--fui-glyph-src': `var(--fui-img-${arm.glyph})` },
          }),
        );
      }
      const text = h('span', { class: 'fui-sign__text' });
      text.appendChild(h('span', { class: 'fui-sign__label', text: arm.label }));
      if (arm.note) text.appendChild(h('span', { class: 'fui-sign__note', text: arm.note }));
      plank.appendChild(text);
      el.appendChild(plank);

      if (!arm.locked) el.addEventListener('click', () => this.emit('sign:pick', arm.id));
      this.post.appendChild(el);
    });
  }
}
