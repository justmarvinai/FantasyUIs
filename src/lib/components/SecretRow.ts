import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface Secret {
  id: string;
  /** Name, shown only when the secret is yours or has fired. */
  name?: string;
  /** What triggers it, shown to its owner. */
  trigger?: string;
  /** Glyph asset id for the sigil. */
  glyph?: string;
  /** Class colour. */
  color?: string;
  /** Just triggered — flashes and reveals itself. */
  fired?: boolean;
}

export interface SecretRowOptions extends BaseOptions {
  /** The face-down secrets, left to right. */
  secrets: Secret[];
  /** Yours, so the names are legible; the opponent's stay hidden. */
  own?: boolean;
  /** Sigil size in pixels. */
  size?: number;
  /** Cap, e.g. 5. Past it a new secret cannot be set. */
  limit?: number;
}

/**
 * The row of face-down secrets above a hero. The opponent's are anonymous
 * sigils; yours are labelled, because you already know what you played and
 * hiding it from you is just friction.
 *
 *   const secrets = new SecretRow({ secrets: mine, own: true, limit: 5 });
 *   secrets.on<Secret>('secret:fire', (s) => log.push(`${s.name} triggered!`));
 *   secrets.fire('counterspell');
 *
 * That asymmetry is the whole component. A secret is information the opponent
 * must not have and you must: one flag flips the row between the two readings,
 * so a game does not need a second component for its own side. `fire()` reveals
 * the sigil, flashes it, and leaves it revealed for a beat — a secret that
 * vanishes the instant it triggers is a secret nobody ever learns the name of.
 */
export class SecretRow extends FuiComponent<SecretRowOptions> {
  private row: HTMLElement;

  constructor(opts: SecretRowOptions) {
    const root = h('div', {
      class: 'fui fui-secretrow',
      dataset: { own: opts.own ? 'on' : 'off' },
      style: { '--fui-secret-size': `${opts.size ?? 30}px` },
      attrs: {
        role: 'list',
        'aria-label': opts.own ? 'Your secrets' : 'Opponent secrets',
      },
    });
    super(root, opts);

    this.row = h('div', { class: 'fui-secretrow__row' });
    root.appendChild(this.row);
    this.build();
  }

  /** Replace the row. */
  setSecrets(secrets: Secret[]): this {
    this.opts.secrets = secrets;
    this.build();
    return this;
  }

  /** Set a new secret. Returns false when the cap is reached. */
  add(secret: Secret): boolean {
    if (this.opts.limit != null && this.opts.secrets.length >= this.opts.limit) return false;
    this.opts.secrets = [...this.opts.secrets, secret];
    this.build();
    (this.row.lastElementChild as HTMLElement | null)?.classList.add('is-set');
    return true;
  }

  /** Trigger a secret: reveal it, flash it, then take it off the row. */
  fire(id: string): this {
    const secret = this.opts.secrets.find((s) => s.id === id);
    if (!secret) return this;
    secret.fired = true;
    this.build();
    this.emit('secret:fire', secret);

    const view = this.el.ownerDocument.defaultView;
    if (!view) return this;
    // Revealed for a beat before it leaves — a secret that vanishes the instant
    // it triggers is one nobody ever learns the name of.
    const timer = view.setTimeout(() => {
      this.opts.secrets = this.opts.secrets.filter((s) => s.id !== id);
      this.build();
    }, 1600);
    this.onDestroy(() => view.clearTimeout(timer));
    return this;
  }

  private build(): void {
    clear(this.row);
    for (const secret of this.opts.secrets) {
      const reveal = this.opts.own || secret.fired;
      const cell = h('div', {
        class: 'fui-secretrow__secret',
        dataset: { fired: secret.fired ? 'on' : 'off', reveal: reveal ? 'on' : 'off' },
        style: {
          ...(secret.color ? { '--fui-secret-ink': secret.color } : {}),
          ...(secret.glyph ? { '--fui-secret-glyph': `var(--fui-img-${secret.glyph})` } : {}),
        },
        attrs: {
          role: 'listitem',
          title: reveal ? [secret.name, secret.trigger].filter(Boolean).join(' — ') : 'A secret',
          'aria-label': reveal ? (secret.name ?? 'Secret') : 'Hidden secret',
        },
      });
      cell.appendChild(h('span', { class: 'fui-secretrow__sigil', attrs: { 'aria-hidden': 'true' } }));
      if (reveal && secret.name) {
        cell.appendChild(h('span', { class: 'fui-secretrow__name', text: secret.name }));
      }
      this.row.appendChild(cell);
    }
    this.el.dataset.empty = this.opts.secrets.length ? 'off' : 'on';
  }
}
