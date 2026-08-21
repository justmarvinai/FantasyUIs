import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp } from '../core/dom.ts';

export type ConnectionState = 'online' | 'unstable' | 'reconnecting' | 'offline';

export interface ConnectionStatusOptions extends BaseOptions {
  /** Round-trip time in milliseconds. Drives the bars when no state is forced. */
  ping?: number;
  /** Force a state instead of deriving it from `ping`. */
  state?: ConnectionState;
  /** Print the millisecond figure beside the bars. */
  showPing?: boolean;
  /** Server or region name. */
  server?: string;
  /** Milliseconds above which the connection counts as unstable. */
  warnAt?: number;
  /** Milliseconds above which it counts as bad. */
  badAt?: number;
  /** `bars` is the signal-strength stack; `dot` is a single pip; `banner` is a full-width strip. */
  variant?: 'bars' | 'dot' | 'banner';
  /** Manifest asset id for a decorative orb, `banner` variant only. */
  orb?: string;
  /** Message shown in the banner when not online. */
  message?: string;
  /** Offer a retry button while reconnecting or offline. */
  retryable?: boolean;
}

/**
 * The connection indicator every live game needs in a corner — latency as
 * signal bars, and a banner when the socket actually drops.
 *
 *   const net = new ConnectionStatus({ ping: 48, showPing: true, server: 'EU-1' });
 *   socket.on('pong', (ms) => net.setPing(ms));
 *   socket.on('close', () => net.setState('reconnecting'));
 *
 * State is derived from the ping unless you force it, so the common case is one
 * `setPing()` call per heartbeat and nothing else. Four bars fill in proportion
 * to how good the connection is, which is the shape players already read
 * without a legend.
 */
export class ConnectionStatus extends FuiComponent<ConnectionStatusOptions> {
  private ping: number;
  private forced: ConnectionState | null;
  private pingEl: HTMLElement | null = null;
  private messageEl: HTMLElement | null = null;

  constructor(opts: ConnectionStatusOptions = {}) {
    const root = h('div', {
      class: 'fui fui-net',
      dataset: { variant: opts.variant ?? 'bars' },
      attrs: { role: 'status', 'aria-live': 'polite' },
    });
    super(root, opts);
    this.ping = Math.max(0, opts.ping ?? 0);
    this.forced = opts.state ?? null;

    if (opts.variant === 'banner' && opts.orb) {
      root.appendChild(
        h('span', {
          class: 'fui-net__orb',
          style: { backgroundImage: `var(--fui-img-${opts.orb})` },
          attrs: { 'aria-hidden': 'true' },
        }),
      );
    }

    const bars = h('span', { class: 'fui-net__bars', attrs: { 'aria-hidden': 'true' } });
    for (let i = 0; i < 4; i++) {
      bars.appendChild(h('span', { class: 'fui-net__bar', style: { '--fui-net-i': String(i) } }));
    }
    root.appendChild(bars);

    const text = h('div', { class: 'fui-net__text' });
    if (opts.server) text.appendChild(h('span', { class: 'fui-net__server', text: opts.server }));
    if (opts.showPing) {
      this.pingEl = h('span', { class: 'fui-net__ping fui-num' });
      text.appendChild(this.pingEl);
    }
    if (opts.variant === 'banner') {
      this.messageEl = h('span', { class: 'fui-net__message' });
      text.appendChild(this.messageEl);
    }
    if (text.childNodes.length) root.appendChild(text);

    if (opts.retryable) {
      const retry = h('button', {
        class: 'fui-net__retry',
        text: 'Retry',
        attrs: { type: 'button' },
      });
      retry.addEventListener('click', () => this.emit('net:retry'));
      root.appendChild(retry);
    }
    this.paint();
  }

  /** The state being shown, forced or derived. */
  getState(): ConnectionState {
    if (this.forced) return this.forced;
    const warn = this.opts.warnAt ?? 120;
    const bad = this.opts.badAt ?? 250;
    if (this.ping >= bad) return 'unstable';
    if (this.ping >= warn) return 'unstable';
    return 'online';
  }

  /** Report a fresh round-trip time. Clears any forced state. */
  setPing(ms: number, opts?: { silent?: boolean }): this {
    const was = this.getState();
    this.ping = Math.max(0, ms);
    this.forced = null;
    this.paint();
    if (!opts?.silent && this.getState() !== was) this.emit('net:state', this.getState());
    return this;
  }

  /** Force a state — what a socket close or reconnect handler calls. */
  setState(state: ConnectionState): this {
    const was = this.getState();
    this.forced = state;
    this.paint();
    if (state !== was) this.emit('net:state', state);
    return this;
  }

  private paint(): void {
    const state = this.getState();
    const warn = this.opts.warnAt ?? 120;
    const bad = this.opts.badAt ?? 250;

    // Bars fall off as latency climbs: full below the warn mark, none once the
    // socket is gone.
    const strength =
      state === 'offline' ? 0
        : state === 'reconnecting' ? 1
          : this.ping >= bad ? 1
            : this.ping >= warn ? 2
              : this.ping >= warn / 2 ? 3
                : 4;

    this.el.dataset.state = state;
    this.el.style.setProperty('--fui-net-strength', String(clamp(strength, 0, 4)));
    if (this.pingEl) {
      this.pingEl.textContent = state === 'offline' ? '—' : `${Math.round(this.ping)} ms`;
    }
    if (this.messageEl) {
      this.messageEl.textContent =
        this.opts.message ??
        (state === 'offline'
          ? 'Connection lost.'
          : state === 'reconnecting'
            ? 'Reconnecting…'
            : state === 'unstable'
              ? 'Unstable connection.'
              : 'Connected.');
    }
    this.el.setAttribute(
      'aria-label',
      `Connection ${state}${this.opts.showPing ? `, ${Math.round(this.ping)} milliseconds` : ''}`,
    );
  }
}
