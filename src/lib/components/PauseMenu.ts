import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';
import { Button } from './Button.ts';
import type { MenuEntry } from './MainMenu.ts';

export interface PauseMenuOptions extends BaseOptions {
  title?: string;
  entries?: MenuEntry[];
  /** Small status lines shown under the buttons — playtime, zone, difficulty. */
  stats?: { label: string; value: string }[];
  /** Bind Escape to toggle the menu. Default true. */
  bindEscape?: boolean;
  /** Start visible. */
  open?: boolean;
}

/** The entries most games want, used when none are supplied. */
export const DEFAULT_PAUSE_ENTRIES: MenuEntry[] = [
  { id: 'resume', label: 'Resume', primary: true },
  { id: 'settings', label: 'Settings' },
  { id: 'save', label: 'Save Game' },
  { id: 'quit', label: 'Quit to Title' },
];

/**
 * The in-game pause overlay: a dimmed, blurred screen with a short menu and
 * optional run stats.
 *
 * Emits `pause:select` with the entry id, plus `pause:open` / `pause:close`.
 *
 *   const pause = new PauseMenu({ stats: [{ label: 'Playtime', value: '4h 12m' }] });
 *   pause.on('pause:select', ({ id }) => { if (id === 'resume') pause.close(); });
 */
export class PauseMenu extends FuiComponent<PauseMenuOptions> {
  private navEl: HTMLElement;

  constructor(opts: PauseMenuOptions = {}) {
    const root = h('div', {
      class: 'fui fui-pause',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title ?? 'Paused' },
    });
    super(root, opts);

    root.appendChild(h('div', { class: 'fui-pause__scrim', attrs: { 'aria-hidden': 'true' } }));

    const card = h('div', { class: 'fui-pause__card' });
    card.appendChild(h('h2', { class: 'fui-pause__title fui-title', text: opts.title ?? 'Paused' }));
    card.appendChild(h('div', { class: 'fui-pause__rule', attrs: { 'aria-hidden': 'true' } }));

    this.navEl = h('nav', { class: 'fui-pause__nav' });
    card.appendChild(this.navEl);

    if (opts.stats?.length) {
      const stats = h('dl', { class: 'fui-pause__stats' });
      for (const s of opts.stats) {
        stats.appendChild(h('dt', { text: s.label }));
        stats.appendChild(h('dd', { class: 'fui-num', text: s.value }));
      }
      card.appendChild(stats);
    }
    root.appendChild(card);

    this.setEntries(opts.entries ?? DEFAULT_PAUSE_ENTRIES);
    if (opts.open) this.open();

    if (opts.bindEscape !== false) {
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key !== 'Escape') return;
        ev.preventDefault();
        this.toggle();
      };
      const d = root.ownerDocument;
      d.addEventListener('keydown', onKey);
      this.onDestroy(() => d.removeEventListener('keydown', onKey));
    }
  }

  setEntries(entries: MenuEntry[]): this {
    clear(this.navEl);
    for (const entry of entries) {
      const btn = new Button({
        label: entry.label,
        icon: entry.icon,
        variant: entry.primary ? 'primary' : 'ghost',
        block: true,
        disabled: entry.disabled,
        onClick: () => this.emit('pause:select', { id: entry.id, entry }),
      });
      this.navEl.appendChild(btn.el);
    }
    return this;
  }

  get isOpen(): boolean {
    return this.el.classList.contains('is-open');
  }

  open(): this {
    this.el.classList.add('is-open');
    this.emit('pause:open');
    return this;
  }

  close(): this {
    this.el.classList.remove('is-open');
    this.emit('pause:close');
    return this;
  }

  toggle(): this {
    return this.isOpen ? this.close() : this.open();
  }
}
