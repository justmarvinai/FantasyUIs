import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp, commas } from '../core/dom.ts';

export interface ClanCardOptions extends BaseOptions {
  name: string;
  /** Crest / emblem asset id. */
  crest?: string;
  /** Short tag in brackets, e.g. "ASH". */
  tag?: string;
  level?: number;
  /** Current member count. */
  members?: number;
  /** Member cap. */
  capacity?: number;
  /** One-line description or recruitment blurb. */
  motto?: string;
  /** Requirement to join, e.g. "180k power". */
  requirement?: string;
  /** Weekly activity, 0–1, drawn as a bar. */
  activity?: number;
  /** Boss tier the clan clears, e.g. "Nightmare". */
  bossTier?: string;
  /** `open` joins instantly, `apply` needs approval, `closed` is invite-only. */
  entry?: 'open' | 'apply' | 'closed';
  /** Label for the join button. Hidden when `entry` is `closed`. */
  action?: string;
  /** Accent colour drawn from the crest. */
  color?: string;
}

/**
 * A guild summary — the row a clan browser is made of, and the header a clan
 * screen opens with.
 *
 *   new ClanCard({
 *     name: 'Ashvale Covenant', tag: 'ASH', crest: 'glyph-phoenix', level: 18,
 *     members: 28, capacity: 30, bossTier: 'Nightmare',
 *     requirement: '180k power', activity: 0.82, entry: 'apply', action: 'Apply',
 *   });
 *
 * Members-against-capacity and the entry mode are the two facts a player
 * actually decides on, so both are impossible to miss.
 */
export class ClanCard extends FuiComponent<ClanCardOptions> {
  constructor(opts: ClanCardOptions) {
    const root = h('div', {
      class: 'fui fui-clan',
      dataset: { entry: opts.entry ?? 'open' },
      style: {
        ...(opts.color ? { '--fui-clan-ink': opts.color } : {}),
        ...(opts.activity != null
          ? { '--fui-clan-activity': String(clamp(opts.activity, 0, 1)) }
          : {}),
      },
    });
    super(root, opts);

    const crest = h('div', { class: 'fui-clan__crest' });
    if (opts.crest) crest.style.setProperty('--fui-glyph-src', `var(--fui-img-${opts.crest})`);
    if (opts.level != null) {
      crest.appendChild(h('span', { class: 'fui-clan__level fui-num', text: String(opts.level) }));
    }
    root.appendChild(crest);

    const main = h('div', { class: 'fui-clan__main' });

    const head = h('div', { class: 'fui-clan__head' });
    head.appendChild(h('span', { class: 'fui-clan__name fui-title', text: opts.name }));
    if (opts.tag) head.appendChild(h('span', { class: 'fui-clan__tag', text: `[${opts.tag}]` }));
    main.appendChild(head);

    if (opts.motto) main.appendChild(h('p', { class: 'fui-clan__motto', text: opts.motto }));

    const stats = h('div', { class: 'fui-clan__stats' });
    if (opts.members != null) {
      const full = opts.capacity != null && opts.members >= opts.capacity;
      stats.appendChild(
        h('span', {
          class: 'fui-clan__members fui-num',
          dataset: { full: String(full) },
          text: opts.capacity != null
            ? `${commas(opts.members)}/${commas(opts.capacity)}`
            : commas(opts.members),
        }),
      );
    }
    if (opts.bossTier) {
      stats.appendChild(h('span', { class: 'fui-clan__boss', text: opts.bossTier }));
    }
    if (opts.requirement) {
      stats.appendChild(h('span', { class: 'fui-clan__req', text: opts.requirement }));
    }
    if (stats.childNodes.length) main.appendChild(stats);

    if (opts.activity != null) {
      main.appendChild(
        h('div', { class: 'fui-clan__activity' }, h('span', { class: 'fui-clan__activity-fill' })),
      );
    }
    root.appendChild(main);

    if (opts.entry !== 'closed' && opts.action) {
      const btn = h('button', {
        class: 'fui-clan__action',
        text: opts.action,
        attrs: { type: 'button' },
      });
      btn.addEventListener('click', () => this.emit('clan:join', opts.entry ?? 'open'));
      root.appendChild(btn);
    } else if (opts.entry === 'closed') {
      root.appendChild(h('span', { class: 'fui-clan__closed', text: 'Invite only' }));
    }
  }
}
