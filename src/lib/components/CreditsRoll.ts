import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface CreditsSection {
  /** Section heading, e.g. `'Design'`. */
  role: string;
  /** Everyone in it. */
  names: string[];
}

export interface CreditsRollOptions extends BaseOptions {
  /** Game title at the top of the roll. */
  title?: string;
  /** Line under the title. */
  subtitle?: string;
  /** Manifest asset id for a crest above the title. */
  crest?: string;
  /** The credits themselves, in order. */
  sections: CreditsSection[];
  /** Closing line, e.g. `'Thank you for playing.'`. */
  outro?: string;
  /** Seconds for one full pass. */
  duration?: number;
  /** Height of the viewport in pixels. */
  height?: number;
  /** Start scrolling immediately. */
  auto?: boolean;
  /** Show the skip button. */
  skipLabel?: string;
}

/**
 * The end-of-game credits roll: a slow scroll through the names, with a skip
 * that respects the player who has seen it before.
 *
 *   const credits = new CreditsRoll({
 *     title: 'Ashfall', subtitle: 'A tale of the Emberlands', crest: 'decor-crest',
 *     sections: creditSections, outro: 'Thank you for playing.',
 *     duration: 90, height: 420, skipLabel: 'Skip', auto: true,
 *   });
 *   credits.on('credits:end', () => game.toMainMenu());
 *   credits.on('credits:skip', () => game.toMainMenu());
 *
 * The scroll is a single CSS animation over the whole column — one composited
 * transform rather than a scroll position nudged on a timer, so it stays smooth
 * on a phone with a battle still unloading behind it. The travel distance is
 * expressed in the column's own height (`translateY(-100%)`), which means a
 * longer credits list scrolls further at the same speed instead of racing.
 */
export class CreditsRoll extends FuiComponent<CreditsRollOptions> {
  private column: HTMLElement;
  private endTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: CreditsRollOptions) {
    const root = h('div', {
      class: 'fui fui-credits',
      dataset: { running: 'off' },
      style: {
        '--fui-credits-h': `${opts.height ?? 420}px`,
        '--fui-credits-s': `${opts.duration ?? 60}s`,
      },
    });
    super(root, opts);

    const view = h('div', { class: 'fui-credits__view' });
    this.column = h('div', { class: 'fui-credits__column' });
    view.appendChild(this.column);
    root.appendChild(view);
    root.appendChild(h('span', { class: 'fui-credits__fade', dataset: { edge: 'top' } }));
    root.appendChild(h('span', { class: 'fui-credits__fade', dataset: { edge: 'bottom' } }));

    if (opts.skipLabel) {
      const skip = h('button', {
        class: 'fui-credits__skip',
        attrs: { type: 'button' },
        text: opts.skipLabel,
      });
      skip.addEventListener('click', () => {
        this.stop();
        this.emit('credits:skip');
      });
      root.appendChild(skip);
    }

    this.build();
    this.onDestroy(() => this.clearTimer());
    if (opts.auto) this.start();
  }

  /** Start (or restart) the roll. */
  start(): this {
    this.clearTimer();
    this.el.dataset.running = 'off';
    void this.el.offsetWidth;
    this.el.dataset.running = 'on';
    this.emit('credits:start');
    this.endTimer = setTimeout(() => this.emit('credits:end'), (this.opts.duration ?? 60) * 1000);
    return this;
  }

  /** Stop it where it is. */
  stop(): this {
    this.clearTimer();
    this.el.dataset.running = 'off';
    return this;
  }

  /** Replace the credits. */
  setSections(sections: CreditsSection[]): this {
    this.opts.sections = sections;
    this.build();
    return this;
  }

  private clearTimer(): void {
    if (this.endTimer) clearTimeout(this.endTimer);
    this.endTimer = null;
  }

  private build(): void {
    clear(this.column);
    const o = this.opts;

    if (o.crest) {
      this.column.appendChild(
        h('span', {
          class: 'fui-credits__crest',
          style: { '--fui-credits-crest': `var(--fui-img-${o.crest})` },
        }),
      );
    }
    if (o.title) this.column.appendChild(h('h2', { class: 'fui-credits__title', text: o.title }));
    if (o.subtitle) {
      this.column.appendChild(h('p', { class: 'fui-credits__subtitle', text: o.subtitle }));
    }

    for (const section of o.sections) {
      const block = h('div', { class: 'fui-credits__section' });
      block.appendChild(h('h3', { class: 'fui-credits__role', text: section.role }));
      for (const name of section.names) {
        block.appendChild(h('p', { class: 'fui-credits__name', text: name }));
      }
      this.column.appendChild(block);
    }

    if (o.outro) this.column.appendChild(h('p', { class: 'fui-credits__outro', text: o.outro }));
  }
}
