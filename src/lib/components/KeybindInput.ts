import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface KeybindInputOptions extends BaseOptions {
  /** What this binding does — "Attack", "Open inventory". */
  action: string;
  /** Current binding as a display string, e.g. `'Shift + Q'`. */
  binding?: string;
  /** Glyph asset id for the action's icon. */
  glyph?: string;
  /** Bindings already taken elsewhere; capturing one of them warns. */
  taken?: string[];
  /** Show the clear button. */
  clearable?: boolean;
  /** Second slot for an alternate binding. */
  secondary?: string;
  /** Width of the key field in pixels. */
  size?: 'sm' | 'md';
}

/** Turn a keyboard event into the string a player expects to read. */
function describe(ev: KeyboardEvent): string {
  const parts: string[] = [];
  if (ev.ctrlKey) parts.push('Ctrl');
  if (ev.altKey) parts.push('Alt');
  if (ev.shiftKey) parts.push('Shift');
  if (ev.metaKey) parts.push('Meta');
  const key = ev.key;
  // Modifier-only presses are not a binding yet — the player is mid-chord.
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return parts.join(' + ');
  const named: Record<string, string> = {
    ' ': 'Space', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Escape: 'Esc', Enter: 'Enter', Backspace: 'Backspace', Tab: 'Tab', Delete: 'Del',
  };
  parts.push(named[key] ?? (key.length === 1 ? key.toUpperCase() : key));
  return parts.join(' + ');
}

/**
 * The key-capture row a controls screen is made of: click the slot, press a
 * combination, and it is bound.
 *
 *   const bind = new KeybindInput({
 *     action: 'Open inventory',
 *     glyph: 'glyph-burning-scroll',
 *     binding: 'I',
 *     taken: ['Esc', 'Tab'],
 *     clearable: true,
 *   });
 *   bind.on<{ action: string; binding: string }>('keybind:set', save);
 *
 * Escape cancels the capture rather than binding itself, which is what every
 * player expects and what makes the control safe to click by accident. A
 * combination already used elsewhere still binds, but the row flags it, because
 * refusing silently is worse than showing the conflict.
 */
export class KeybindInput extends FuiComponent<KeybindInputOptions> {
  private slot: HTMLButtonElement;
  private alt: HTMLButtonElement | null = null;
  private capturing: HTMLButtonElement | null = null;
  private release: (() => void) | null = null;

  constructor(opts: KeybindInputOptions) {
    const root = h('div', { class: 'fui fui-keybind', dataset: { size: opts.size ?? 'md' } });
    super(root, opts);

    const label = h('div', { class: 'fui-keybind__label' });
    if (opts.glyph) {
      label.appendChild(
        h('span', {
          class: 'fui-keybind__glyph',
          style: { '--fui-glyph-src': `var(--fui-img-${opts.glyph})` },
        }),
      );
    }
    label.appendChild(h('span', { class: 'fui-keybind__action', text: opts.action }));
    root.appendChild(label);

    this.slot = this.makeSlot(opts.binding ?? '', 'primary');
    root.appendChild(this.slot);

    if (opts.secondary !== undefined) {
      this.alt = this.makeSlot(opts.secondary, 'secondary');
      root.appendChild(this.alt);
    }

    if (opts.clearable) {
      const clear = h('button', {
        class: 'fui-keybind__clear',
        text: '×',
        attrs: { type: 'button', 'aria-label': `Clear binding for ${opts.action}` },
      });
      clear.addEventListener('click', () => {
        this.setBinding('', 'primary');
        this.emit('keybind:clear', opts.action);
      });
      root.appendChild(clear);
    }

    this.onDestroy(() => this.stop());
  }

  private makeSlot(binding: string, which: 'primary' | 'secondary'): HTMLButtonElement {
    const btn = h('button', {
      class: 'fui-keybind__slot',
      dataset: { slot: which },
      attrs: { type: 'button' },
    });
    btn.appendChild(h('span', { class: 'fui-keybind__key', text: binding || 'Unbound' }));
    if (!binding) btn.classList.add('is-empty');
    btn.addEventListener('click', () => this.capture(btn));
    return btn;
  }

  /** Begin listening for the next key press. */
  private capture(btn: HTMLButtonElement): void {
    this.stop();
    this.capturing = btn;
    btn.classList.add('is-capturing');
    this.setKeyText(btn, 'Press a key…');

    const onKey = (ev: KeyboardEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      // Escape backs out — a binding screen that traps the player is a trap.
      if (ev.key === 'Escape') {
        this.stop(true);
        return;
      }
      const text = describe(ev);
      if (!text || ['Ctrl', 'Alt', 'Shift', 'Meta'].includes(text)) {
        this.setKeyText(btn, `${text} …`);
        return;
      }
      const which = (btn.dataset.slot as 'primary' | 'secondary') ?? 'primary';
      this.stop();
      this.setBinding(text, which);
      this.emit('keybind:set', { action: this.opts.action, binding: text, slot: which });
    };

    const doc = this.el.ownerDocument;
    doc.addEventListener('keydown', onKey, true);
    const onBlur = () => this.stop(true);
    btn.addEventListener('blur', onBlur);
    this.release = () => {
      doc.removeEventListener('keydown', onKey, true);
      btn.removeEventListener('blur', onBlur);
    };
  }

  /** Stop capturing. `restore` puts the previous binding text back. */
  private stop(restore = false): void {
    this.release?.();
    this.release = null;
    const btn = this.capturing;
    this.capturing = null;
    if (!btn) return;
    btn.classList.remove('is-capturing');
    if (restore) {
      const which = (btn.dataset.slot as 'primary' | 'secondary') ?? 'primary';
      const current = which === 'primary' ? this.opts.binding : this.opts.secondary;
      this.setKeyText(btn, current || 'Unbound');
      btn.classList.toggle('is-empty', !current);
      this.emit('keybind:cancel', this.opts.action);
    }
  }

  /** Set a binding directly, e.g. when restoring defaults. */
  setBinding(binding: string, which: 'primary' | 'secondary' = 'primary'): this {
    const btn = which === 'secondary' ? this.alt : this.slot;
    if (!btn) return this;
    if (which === 'secondary') this.opts.secondary = binding;
    else this.opts.binding = binding;
    this.setKeyText(btn, binding || 'Unbound');
    btn.classList.toggle('is-empty', !binding);
    btn.classList.toggle('is-conflict', !!binding && (this.opts.taken ?? []).includes(binding));
    return this;
  }

  /** The current bindings. */
  get(): { primary: string; secondary?: string } {
    return { primary: this.opts.binding ?? '', secondary: this.opts.secondary };
  }

  private setKeyText(btn: HTMLElement, text: string): void {
    const key = btn.querySelector('.fui-keybind__key');
    if (key) key.textContent = text;
  }
}
