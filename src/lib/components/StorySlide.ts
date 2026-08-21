import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp } from '../core/dom.ts';

export interface StorySlideOptions extends BaseOptions {
  /** The narration or dialogue for this beat. */
  text: string;
  /** Who is speaking. Omit for narration. */
  speaker?: string;
  /** Chapter or scene label across the top. */
  chapter?: string;
  /** Background art asset id. */
  art?: string;
  /** Character art asset id, drawn large to one side. */
  figure?: string;
  /** Which side the figure stands on. */
  figureSide?: 'left' | 'right';
  /** Frame art asset id drawn around the figure. */
  figureFrame?: string;
  /** Type the text out at this many characters per second. 0 shows it at once. */
  typing?: number;
  /** Which beat this is, 1-based. */
  step?: number;
  /** Total beats in the scene. */
  steps?: number;
  /** Label on the advance button. */
  nextLabel?: string;
  /** Show a skip link. Emits `story:skip`. */
  skippable?: boolean;
  /** Height in pixels, or any CSS length such as `'70vh'`. */
  height?: number | string;
}

/**
 * One beat of a cutscene: key art, a character, a line of narration typed out,
 * and a way forward. String several together and you have an intro.
 *
 *   const slide = new StorySlide({
 *     chapter: 'Chapter I — The Sunken Gate',
 *     text: 'Three generations held this gate shut. Tonight, something on the other side is knocking.',
 *     speaker: 'Elder Rowan',
 *     art: 'bg-tall', figure: 'silhouette-warrior-f', figureFrame: 'frame-tall',
 *     typing: 42, step: 1, steps: 4, skippable: true,
 *   });
 *   slide.on('story:next', () => scene.advance());
 *
 * Clicking anywhere finishes the line first and only advances on a second
 * click, which is the interaction every visual novel settled on: one tap should
 * never skip text you have not read.
 */
export class StorySlide extends FuiComponent<StorySlideOptions> {
  private textEl: HTMLElement;
  private box: HTMLElement;
  private speakerEl: HTMLElement | null = null;
  private pips: HTMLElement | null = null;
  private nextBtn: HTMLButtonElement;
  private typer: ReturnType<typeof setInterval> | null = null;
  private shown = 0;

  constructor(opts: StorySlideOptions) {
    const root = h('div', {
      class: 'fui fui-story',
      dataset: { figure: opts.figureSide ?? 'right' },
      style: {
        ...(opts.art ? { '--fui-story-art': `var(--fui-img-${opts.art})` } : {}),
        ...(opts.figure ? { '--fui-story-figure': `var(--fui-img-${opts.figure})` } : {}),
        ...(opts.figureFrame ? { '--fui-story-frame': `var(--fui-img-${opts.figureFrame})` } : {}),
        ...(opts.height != null
          ? { height: typeof opts.height === 'number' ? `${opts.height}px` : opts.height }
          : {}),
      },
    });
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-story__art', attrs: { 'aria-hidden': 'true' } }));

    if (opts.figure) {
      const stage = h('div', { class: 'fui-story__stage', attrs: { 'aria-hidden': 'true' } });
      stage.appendChild(h('span', { class: 'fui-story__figure' }));
      if (opts.figureFrame) stage.appendChild(h('span', { class: 'fui-story__frame' }));
      root.appendChild(stage);
    }

    if (opts.chapter) {
      root.appendChild(h('p', { class: 'fui-story__chapter fui-title', text: opts.chapter }));
    }

    const box = h('div', { class: 'fui-story__box' });
    this.box = box;
    if (opts.speaker) {
      this.speakerEl = h('span', { class: 'fui-story__speaker fui-title', text: opts.speaker });
      box.appendChild(this.speakerEl);
    }
    this.textEl = h('p', { class: 'fui-story__text fui-body' });
    box.appendChild(this.textEl);

    const foot = h('div', { class: 'fui-story__foot' });
    if (opts.steps) {
      this.pips = h('div', { class: 'fui-story__pips' });
      foot.appendChild(this.pips);
      this.paintPips();
    }
    if (opts.skippable) {
      const skip = h('button', { class: 'fui-story__skip', text: 'Skip', attrs: { type: 'button' } });
      skip.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.emit('story:skip');
      });
      foot.appendChild(skip);
    }
    const last = opts.steps != null && (opts.step ?? 1) >= opts.steps;
    this.nextBtn = h('button', {
      class: 'fui-story__next',
      text: opts.nextLabel ?? (last ? 'Begin' : 'Continue'),
      attrs: { type: 'button' },
    });
    this.nextBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.advance();
    });
    foot.appendChild(this.nextBtn);
    box.appendChild(foot);
    root.appendChild(box);

    if (opts.typing && opts.typing > 0) {
      this.typer = setInterval(() => this.step(), 1000 / clamp(opts.typing, 1, 200));
    } else {
      this.textEl.textContent = opts.text;
      this.shown = opts.text.length;
    }

    // One tap finishes the line; the next one advances. No player ever wants a
    // stray click to skip text they have not read.
    root.addEventListener('click', () => this.advance());
    this.onDestroy(() => this.stop());
  }

  /** Finish the line if it is still typing, otherwise move on. */
  advance(): this {
    if (this.typer) {
      this.skip();
      return this;
    }
    const last = this.opts.steps != null && (this.opts.step ?? 1) >= this.opts.steps;
    this.emit(last ? 'story:done' : 'story:next', this.opts.step ?? 1);
    return this;
  }

  /** Show the whole line immediately. */
  skip(): this {
    if (!this.typer) return this;
    this.stop();
    this.textEl.textContent = this.opts.text;
    this.shown = this.opts.text.length;
    this.emit('story:typed');
    return this;
  }

  /**
   * Swap in the next beat of the scene and retype it. Everything the beat does
   * not mention is left alone, so a run of narration lines only passes `text`.
   */
  setBeat(beat: { text: string; speaker?: string; chapter?: string; step?: number }): this {
    this.stop();
    this.opts.text = beat.text;
    if (beat.step != null) this.opts.step = beat.step;
    else if (this.opts.step != null) this.opts.step += 1;

    if ('speaker' in beat) {
      this.opts.speaker = beat.speaker;
      if (beat.speaker && !this.speakerEl) {
        this.speakerEl = h('span', { class: 'fui-story__speaker fui-title' });
        this.box.insertBefore(this.speakerEl, this.textEl);
      }
      if (this.speakerEl) {
        this.speakerEl.textContent = beat.speaker ?? '';
        this.speakerEl.hidden = !beat.speaker;
      }
    }
    if (beat.chapter != null) {
      this.opts.chapter = beat.chapter;
      const chapter = this.el.querySelector('.fui-story__chapter');
      if (chapter) chapter.textContent = beat.chapter;
    }

    this.paintPips();
    const last = this.opts.steps != null && (this.opts.step ?? 1) >= this.opts.steps;
    this.nextBtn.textContent = this.opts.nextLabel ?? (last ? 'Begin' : 'Continue');

    this.shown = 0;
    this.textEl.textContent = '';
    if (this.opts.typing && this.opts.typing > 0) {
      this.typer = setInterval(() => this.step(), 1000 / clamp(this.opts.typing, 1, 200));
    } else {
      this.textEl.textContent = beat.text;
      this.shown = beat.text.length;
    }
    return this;
  }

  private paintPips(): void {
    if (!this.pips) return;
    clear(this.pips);
    const at = this.opts.step ?? 1;
    for (let i = 1; i <= (this.opts.steps ?? 0); i++) {
      const pip = h('span', { class: 'fui-story__pip' });
      if (i === at) pip.classList.add('is-on');
      if (i < at) pip.classList.add('is-done');
      this.pips.appendChild(pip);
    }
  }

  private step(): void {
    this.shown += 1;
    this.textEl.textContent = this.opts.text.slice(0, this.shown);
    if (this.shown >= this.opts.text.length) {
      this.stop();
      this.emit('story:typed');
    }
  }

  private stop(): void {
    if (this.typer) clearInterval(this.typer);
    this.typer = null;
  }
}
