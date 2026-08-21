import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp } from '../core/dom.ts';

export interface SpeechBubbleOptions extends BaseOptions {
  /** What is said. */
  text: string;
  /** Who is saying it. */
  speaker?: string;
  /** Manifest asset id for a small portrait beside the text. */
  art?: string;
  /** Which side the tail points from. */
  tail?: 'bottom' | 'top' | 'left' | 'right' | 'none';
  /** Tone changes the bubble's colour and shape. */
  tone?: 'say' | 'shout' | 'think' | 'whisper' | 'system';
  /** Type the text out at this many characters per second. 0 shows it at once. */
  typing?: number;
  /** Auto-dismiss after this many milliseconds. */
  duration?: number;
  /** Max width in pixels, or any CSS length such as `'100%'`. */
  width?: number | string;
  /** Position it over a unit at these viewport coordinates. */
  at?: { x: number; y: number };
}

/**
 * The floating line of dialogue over a character's head — a barks system, a
 * tutorial aside, a boss taunt mid-fight. `DialogueBox` is the full
 * conversation panel; this is one line, in the world.
 *
 *   const bark = new SpeechBubble({
 *     text: 'You should not have come here.',
 *     speaker: 'Gravebound Revenant',
 *     tone: 'shout', typing: 40, duration: 4000,
 *     at: { x: 420, y: 260 },
 *     mount: document.body,
 *   });
 *   bark.on('bubble:done', () => bark.destroy());
 *
 * The typewriter runs on one interval that clears itself on completion and on
 * `destroy()`, and `skip()` finishes the line immediately — which is what a
 * click during a bark should do.
 */
export class SpeechBubble extends FuiComponent<SpeechBubbleOptions> {
  private textEl: HTMLElement;
  private typer: ReturnType<typeof setInterval> | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private shown = 0;

  constructor(opts: SpeechBubbleOptions) {
    const root = h('div', {
      class: 'fui fui-bubble',
      dataset: { tail: opts.tail ?? 'bottom', tone: opts.tone ?? 'say' },
      style: {
        ...(opts.width != null
          ? { '--fui-bubble-w': typeof opts.width === 'number' ? `${opts.width}px` : opts.width }
          : {}),
        ...(opts.at ? { left: `${opts.at.x}px`, top: `${opts.at.y}px` } : {}),
      },
      attrs: { role: 'status' },
    });
    if (opts.at) root.classList.add('is-pinned');
    super(root, opts);

    const body = h('div', { class: 'fui-bubble__body' });

    if (opts.art) {
      body.appendChild(
        h('span', {
          class: 'fui-bubble__art',
          style: { backgroundImage: `var(--fui-img-${opts.art})` },
        }),
      );
    }

    const stack = h('div', { class: 'fui-bubble__stack' });
    if (opts.speaker) {
      stack.appendChild(h('span', { class: 'fui-bubble__speaker', text: opts.speaker }));
    }
    this.textEl = h('p', { class: 'fui-bubble__text' });
    stack.appendChild(this.textEl);
    body.appendChild(stack);

    root.appendChild(body);
    root.appendChild(h('span', { class: 'fui-bubble__tail', attrs: { 'aria-hidden': 'true' } }));

    if (opts.typing && opts.typing > 0) {
      this.textEl.textContent = '';
      const every = 1000 / clamp(opts.typing, 1, 200);
      this.typer = setInterval(() => this.step(), every);
    } else {
      this.textEl.textContent = opts.text;
      this.shown = opts.text.length;
      this.arm();
    }

    root.addEventListener('click', () => this.skip());
    this.onDestroy(() => this.stop());
  }

  /** Finish typing immediately. A click during a bark does this. */
  skip(): this {
    if (this.typer) {
      this.stopTyping();
      this.textEl.textContent = this.opts.text;
      this.shown = this.opts.text.length;
      this.emit('bubble:typed');
      this.arm();
    }
    return this;
  }

  /** Replace the line and start again. */
  setText(text: string): this {
    this.stop();
    this.opts.text = text;
    this.shown = 0;
    this.textEl.textContent = this.opts.typing ? '' : text;
    if (this.opts.typing) {
      this.typer = setInterval(() => this.step(), 1000 / clamp(this.opts.typing, 1, 200));
    } else {
      this.arm();
    }
    return this;
  }

  private step(): void {
    this.shown += 1;
    this.textEl.textContent = this.opts.text.slice(0, this.shown);
    if (this.shown >= this.opts.text.length) {
      this.stopTyping();
      this.emit('bubble:typed');
      this.arm();
    }
  }

  /** Start the auto-dismiss countdown, once the line is fully shown. */
  private arm(): void {
    if (!this.opts.duration) return;
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.el.classList.add('is-leaving');
      this.emit('bubble:done');
    }, this.opts.duration);
  }

  private stopTyping(): void {
    if (this.typer) clearInterval(this.typer);
    this.typer = null;
  }

  private stop(): void {
    this.stopTyping();
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = null;
  }
}
