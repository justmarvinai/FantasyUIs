import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface CheckItem {
  /** Value reported when this row is on. */
  value: string;
  label: string;
  /** Second line under the label. */
  note?: string;
  /** Glyph asset id drawn before the label. */
  glyph?: string;
  disabled?: boolean;
  checked?: boolean;
}

export interface CheckListOptions extends BaseOptions {
  /** The options. `radio` mode makes them mutually exclusive. */
  items: CheckItem[];
  /** `check` allows any number on, `radio` allows exactly one. */
  mode?: 'check' | 'radio';
  /** Values on at construction. Overrides each item's own `checked`. */
  value?: string[];
  /** Heading above the rows. */
  label?: string;
  /** Lay the rows out in this many columns. */
  columns?: number;
  /** Draw each row as a bordered plate rather than a bare line. */
  boxed?: boolean;
  /** Box size in pixels. */
  size?: 'sm' | 'md';
}

/**
 * A group of checkboxes or radio buttons — the primitive `Toggle` is not, since
 * a switch says "on or off" while this says "which of these".
 *
 *   const opts = new CheckList({
 *     label: 'Auto-battle rules',
 *     items: [
 *       { value: 'revive', label: 'Use revives', note: 'Spends one gem per revive' },
 *       { value: 'skip', label: 'Skip animations', checked: true },
 *     ],
 *   });
 *   opts.on<string[]>('check:change', (values) => save(values));
 *
 * Rows are real `<input>` elements inside `<label>`, so keyboard, screen
 * readers and form submission all work without extra handling; the tick itself
 * is drawn on a pseudo-element because the native control cannot be themed.
 */
export class CheckList extends FuiComponent<CheckListOptions> {
  private inputs = new Map<string, HTMLInputElement>();
  private name: string;

  constructor(opts: CheckListOptions) {
    const root = h('div', {
      class: 'fui fui-checklist',
      dataset: { mode: opts.mode ?? 'check', size: opts.size ?? 'md' },
      style: opts.columns ? { '--fui-check-cols': String(opts.columns) } : {},
      attrs: { role: opts.mode === 'radio' ? 'radiogroup' : 'group' },
    });
    if (opts.boxed) root.classList.add('fui-checklist--boxed');
    super(root, opts);

    // A radio group needs one shared name; deriving it from the values keeps it
    // stable across a server render and the browser rehydrating the same list.
    this.name = `fui-check-${Math.abs(hash(opts.items.map((i) => i.value).join('|')))}`;

    if (opts.label) {
      root.appendChild(h('span', { class: 'fui-checklist__label fui-label', text: opts.label }));
    }

    const list = h('div', { class: 'fui-checklist__items' });
    const preset = opts.value ? new Set(opts.value) : null;

    for (const item of opts.items) {
      const on = preset ? preset.has(item.value) : !!item.checked;
      const row = h('label', { class: 'fui-checklist__row' });
      if (item.disabled) row.classList.add('is-disabled');

      const input = h('input', {
        class: 'fui-checklist__input',
        attrs: {
          type: opts.mode === 'radio' ? 'radio' : 'checkbox',
          name: opts.mode === 'radio' ? this.name : undefined,
          value: item.value,
          disabled: item.disabled || undefined,
        },
      });
      input.checked = on;
      input.addEventListener('change', () => this.emit('check:change', this.get()));
      this.inputs.set(item.value, input);
      row.appendChild(input);

      row.appendChild(h('span', { class: 'fui-checklist__box', attrs: { 'aria-hidden': 'true' } }));

      const text = h('span', { class: 'fui-checklist__text' });
      const line = h('span', { class: 'fui-checklist__line' });
      if (item.glyph) {
        line.appendChild(
          h('span', {
            class: 'fui-checklist__glyph',
            style: { '--fui-glyph-src': `var(--fui-img-${item.glyph})` },
          }),
        );
      }
      line.appendChild(h('span', { text: item.label }));
      text.appendChild(line);
      if (item.note) text.appendChild(h('span', { class: 'fui-checklist__note', text: item.note }));
      row.appendChild(text);

      list.appendChild(row);
    }
    root.appendChild(list);
  }

  /** Values currently on, in item order. */
  get(): string[] {
    return this.opts.items.filter((i) => this.inputs.get(i.value)?.checked).map((i) => i.value);
  }

  /** Turn one row on or off. Radio mode clears the others. */
  set(value: string, on = true, opts?: { silent?: boolean }): this {
    const input = this.inputs.get(value);
    if (!input) return this;
    if (this.opts.mode === 'radio' && on) {
      for (const other of this.inputs.values()) other.checked = false;
    }
    input.checked = on;
    if (!opts?.silent) this.emit('check:change', this.get());
    return this;
  }

  /** Turn everything off. */
  clear(opts?: { silent?: boolean }): this {
    for (const input of this.inputs.values()) input.checked = false;
    if (!opts?.silent) this.emit('check:change', this.get());
    return this;
  }
}

/** Tiny stable string hash, so a radio group's `name` survives a re-render. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}
