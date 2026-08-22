import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface KeycapButtonOptions extends BaseOptions {
  /** What is printed on the cap — `'W'`, `'Space'`, `'⇧'`, `'LMB'`. */
  cap: string;
  /** What the key does, printed beside the cap. */
  action?: string;
  /** Glyph asset id for the action. */
  glyph?: string;
  /** Cap shape. `wide` suits Space, `tall` suits Enter. */
  shape?: 'square' | 'wide' | 'tall';
  /** Cap size in pixels. */
  size?: number;
  /** Held down right now — for a live control diagram. */
  held?: boolean;
  /** Waiting for the player to press a key, for a rebinding row. */
  listening?: boolean;
  /** This binding clashes with another. */
  conflict?: boolean;
  /** Read-only: a legend, not a control. */
  readonly?: boolean;
}

/**
 * A keycap: the physical-looking key used in control diagrams, tutorial
 * prompts and rebinding lists. Press it to start listening for a new binding.
 *
 *   const jump = new KeycapButton({ cap: 'Space', action: 'Jump', shape: 'wide' });
 *   jump.on('key:listen', () => input.captureNext());
 *   jump.on<string>('key:bind', (key) => settings.bind('jump', key));
 *
 * The three states this has to get right are *bound*, *listening* and
 * *clashing*, and games routinely conflate the last two. Listening is a live
 * invitation with the cap pressed in and a caret; a clash is a finished binding
 * that is wrong, and stays readable in red so the player can see what it
 * collided with. `held` is separate again — that is a live input readout, and a
 * control diagram lighting up as you press keys is the fastest way to explain
 * a scheme.
 *
 * While listening, keystrokes are captured on the button itself rather than on
 * the document, so a rebinding screen with twelve rows does not end up with
 * twelve global handlers fighting over one keypress.
 */
export class KeycapButton extends FuiComponent<KeycapButtonOptions> {
  private capEl: HTMLElement;

  constructor(opts: KeycapButtonOptions) {
    const root = h(opts.readonly ? 'div' : 'button', {
      class: 'fui fui-keycap',
      dataset: {
        shape: opts.shape ?? 'square',
        held: opts.held ? 'on' : 'off',
        listening: opts.listening ? 'on' : 'off',
        conflict: opts.conflict ? 'on' : 'off',
        readonly: opts.readonly ? 'on' : 'off',
      },
      style: { '--fui-keycap-size': `${opts.size ?? 38}px` },
      attrs: opts.readonly
        ? { role: 'img', 'aria-label': `${opts.cap}${opts.action ? `: ${opts.action}` : ''}` }
        : { type: 'button', 'aria-label': `${opts.action ?? 'Key'}, bound to ${opts.cap}` },
    }) as HTMLElement;
    super(root, opts);

    const cap = h('span', { class: 'fui-keycap__cap' });
    this.capEl = h('span', { class: 'fui-keycap__glyphtext', text: opts.cap });
    cap.appendChild(this.capEl);
    root.appendChild(cap);

    if (opts.action || opts.glyph) {
      const meta = h('span', { class: 'fui-keycap__meta' });
      if (opts.glyph) {
        meta.appendChild(
          h('span', {
            class: 'fui-keycap__glyph',
            style: { '--fui-keycap-glyph': `var(--fui-img-${opts.glyph})` },
          }),
        );
      }
      if (opts.action) meta.appendChild(h('span', { class: 'fui-keycap__action', text: opts.action }));
      root.appendChild(meta);
    }

    if (!opts.readonly) {
      root.addEventListener('click', () => this.listen());
      // Captured on the button, not the document: a rebinding screen with
      // twelve rows must not end up with twelve global handlers.
      root.addEventListener('keydown', (ev) => {
        if (!this.opts.listening) return;
        const key = ev as KeyboardEvent;
        key.preventDefault();
        key.stopPropagation();
        if (key.key === 'Escape') return this.stop();
        this.bind(key.key === ' ' ? 'Space' : key.key.length === 1 ? key.key.toUpperCase() : key.key);
      });
      root.addEventListener('blur', () => this.stop());
    }
  }

  /** Start waiting for a keypress. */
  listen(): this {
    this.opts.listening = true;
    this.el.dataset.listening = 'on';
    this.capEl.textContent = 'Press a key';
    this.emit('key:listen', this.opts.action);
    return this;
  }

  /** Stop waiting and put the old binding back. */
  stop(): this {
    if (!this.opts.listening) return this;
    this.opts.listening = false;
    this.el.dataset.listening = 'off';
    this.capEl.textContent = this.opts.cap;
    return this;
  }

  /** Accept a binding. */
  bind(cap: string): this {
    this.opts.cap = cap;
    this.opts.listening = false;
    this.el.dataset.listening = 'off';
    this.capEl.textContent = cap;
    this.el.setAttribute('aria-label', `${this.opts.action ?? 'Key'}, bound to ${cap}`);
    this.emit('key:bind', cap);
    return this;
  }

  /** Mark (or clear) a clash with another binding. */
  setConflict(conflict: boolean): this {
    this.opts.conflict = conflict;
    this.el.dataset.conflict = conflict ? 'on' : 'off';
    return this;
  }

  /** Light the cap as physically held — for a live control diagram. */
  setHeld(held: boolean): this {
    this.opts.held = held;
    this.el.dataset.held = held ? 'on' : 'off';
    return this;
  }
}
