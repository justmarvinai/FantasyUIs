import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface KillFeedEntry {
  /** Who did it. */
  actor: string;
  /** Who it happened to. Omit for a solo event like an objective capture. */
  target?: string;
  /** Glyph asset id drawn between the two names — the weapon or spell used. */
  means?: string;
  /** Which side the actor is on. Colours the name. */
  actorSide?: 'ally' | 'enemy' | 'neutral';
  /** Which side the target is on. */
  targetSide?: 'ally' | 'enemy' | 'neutral';
  /** Verb for events with no target, e.g. `'captured the Shrine'`. */
  note?: string;
  /** Mark the blow as a critical. */
  crit?: boolean;
  /** Kill streak the actor is now on, printed as a badge. */
  streak?: number;
  /** Extra emphasis — a first blood, a boss kill, a wipe. */
  headline?: boolean;
}

export interface KillFeedOptions extends BaseOptions {
  /** Entries already in the feed, oldest first. */
  entries?: KillFeedEntry[];
  /** How many lines to keep. Older ones fall off the top. */
  max?: number;
  /** Milliseconds before a line fades out on its own. `0` keeps them forever. */
  linger?: number;
  /** Which edge the feed hangs from. */
  align?: 'left' | 'right';
  /** Drop the glyph and the streak badge for a tighter HUD. */
  compact?: boolean;
}

/**
 * The running record of who killed whom, the line every competitive game puts in
 * the top corner so a death is explained without pausing the fight.
 *
 *   const feed = new KillFeed({ align: 'right', max: 5, linger: 6000 });
 *   combat.on('kill', (k) => feed.push({
 *     actor: k.killer, target: k.victim, means: 'glyph-crossed-swords',
 *     actorSide: k.killer === me ? 'ally' : 'enemy', targetSide: 'enemy',
 *     crit: k.crit, streak: k.streak,
 *   }));
 *
 * Each line owns its own expiry timer rather than the feed sweeping on an
 * interval, so a line that arrives during a burst still gets its full reading
 * time instead of being cut short by a tick that was already in flight. Every
 * timer is registered for teardown; a feed that keeps firing after `destroy()`
 * is the classic HUD leak.
 */
export class KillFeed extends FuiComponent<KillFeedOptions> {
  private list: HTMLElement;
  private timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(opts: KillFeedOptions = {}) {
    const root = h('div', {
      class: 'fui fui-killfeed',
      dataset: { align: opts.align ?? 'right', compact: opts.compact ? 'on' : 'off' },
      attrs: { role: 'log', 'aria-live': 'polite', 'aria-label': 'Combat feed' },
    });
    super(root, opts);

    this.list = h('div', { class: 'fui-killfeed__list' });
    root.appendChild(this.list);

    for (const entry of opts.entries ?? []) this.push(entry, false);
    this.onDestroy(() => {
      for (const t of this.timers) clearTimeout(t);
      this.timers.clear();
    });
  }

  /** Add a line to the bottom of the feed. */
  push(entry: KillFeedEntry, animate = true): this {
    const row = this.render(entry);
    if (animate) row.classList.add('is-new');
    this.list.appendChild(row);
    this.emit('feed:push', entry);

    const max = this.opts.max ?? 6;
    while (this.list.children.length > max) this.list.firstElementChild?.remove();

    const linger = this.opts.linger ?? 0;
    if (linger > 0) {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        row.classList.add('is-gone');
        const done = setTimeout(() => {
          this.timers.delete(done);
          row.remove();
        }, 420);
        this.timers.add(done);
      }, linger);
      this.timers.add(timer);
    }
    return this;
  }

  /** Empty the feed. */
  flush(): this {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    clear(this.list);
    return this;
  }

  private render(e: KillFeedEntry): HTMLElement {
    const row = h('div', {
      class: 'fui-killfeed__row',
      dataset: { headline: e.headline ? 'on' : 'off' },
    });

    row.appendChild(
      h('span', {
        class: 'fui-killfeed__name',
        dataset: { side: e.actorSide ?? 'neutral' },
        text: e.actor,
      }),
    );

    if (e.streak && e.streak > 1 && !this.opts.compact) {
      row.appendChild(h('span', { class: 'fui-killfeed__streak fui-num', text: `×${e.streak}` }));
    }

    if (e.target) {
      // The glyph is the sentence's verb. Without art it degrades to an arrow
      // rather than collapsing the two names together.
      const means = h('span', {
        class: 'fui-killfeed__means',
        dataset: { crit: e.crit ? 'on' : 'off', glyph: e.means ? 'on' : 'off' },
        style: e.means ? { '--fui-killfeed-glyph': `var(--fui-img-${e.means})` } : undefined,
      });
      if (!e.means) means.textContent = '→';
      row.appendChild(means);
      row.appendChild(
        h('span', {
          class: 'fui-killfeed__name',
          dataset: { side: e.targetSide ?? 'neutral' },
          text: e.target,
        }),
      );
    } else if (e.note) {
      row.appendChild(h('span', { class: 'fui-killfeed__note', text: e.note }));
    }

    return row;
  }
}
