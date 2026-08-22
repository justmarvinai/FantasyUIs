import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, commas } from '../core/dom.ts';

export interface JoinRequest {
  id: string;
  /** Applicant's name. */
  name: string;
  /** Manifest asset id for the portrait. */
  art?: string;
  /** Character level. */
  level?: number;
  /** Combat power or gear score. */
  power?: number;
  /** Free-text application. */
  message?: string;
  /** When it arrived, already formatted — `'3h ago'`. */
  when?: string;
  /** Extra facts printed as chips, e.g. `['EU', 'Daily player']`. */
  tags?: string[];
  /** Fails the guild's requirements — still listed, marked. */
  belowBar?: boolean;
}

export interface RequestListOptions extends BaseOptions {
  /** Pending applications, newest first. */
  requests: JoinRequest[];
  /** Heading. */
  title?: string;
  /** Free seats in the guild. Zero disables accepting. */
  seats?: number;
  /** Minimum level the guild asks for, printed in the header. */
  minLevel?: number;
  /** Label for the accept button. */
  acceptLabel?: string;
  /** Label for the decline button. */
  declineLabel?: string;
}

/**
 * The applications queue an officer works through: who wants in, whether they
 * clear the bar, and how many seats are left to give away.
 *
 *   const queue = new RequestList({
 *     title: 'Applications', requests: pending, seats: 3, minLevel: 40,
 *   });
 *   queue.on<JoinRequest>('request:accept', (r) => guild.invite(r.id));
 *   queue.on<JoinRequest>('request:decline', (r) => guild.reject(r.id));
 *
 * Seats are counted down in the header and every Accept disables at zero,
 * because the failure an officer must not hit is accepting four people into
 * three seats. Applicants below the guild's requirements stay in the list and
 * get a marker rather than being filtered out — an officer letting someone in
 * anyway is a normal decision, and hiding the row takes it away from them.
 */
export class RequestList extends FuiComponent<RequestListOptions> {
  private list: HTMLElement;
  private seatsEl: HTMLElement | null = null;

  constructor(opts: RequestListOptions) {
    const root = h('div', { class: 'fui fui-requests' });
    super(root, opts);

    const head = h('div', { class: 'fui-requests__head' });
    head.appendChild(h('h3', { class: 'fui-requests__title', text: opts.title ?? 'Applications' }));
    if (opts.minLevel != null) {
      head.appendChild(
        h('span', { class: 'fui-requests__bar', text: `Requires level ${opts.minLevel}` }),
      );
    }
    if (opts.seats != null) {
      this.seatsEl = h('span', { class: 'fui-requests__seats fui-num' });
      head.appendChild(this.seatsEl);
    }
    root.appendChild(head);

    this.list = h('div', { class: 'fui-requests__list' });
    root.appendChild(this.list);
    this.build();
  }

  /** Accept or decline one application and drop it from the list. */
  resolve(id: string, verdict: 'accept' | 'decline'): this {
    const request = this.opts.requests.find((r) => r.id === id);
    if (!request) return this;
    if (verdict === 'accept' && this.full()) return this;

    this.opts.requests = this.opts.requests.filter((r) => r.id !== id);
    if (verdict === 'accept' && this.opts.seats != null) this.opts.seats -= 1;
    this.build();
    this.emit(`request:${verdict}`, request);
    return this;
  }

  /** Replace the queue — call after a refresh. */
  setRequests(requests: JoinRequest[]): this {
    this.opts.requests = requests;
    this.build();
    return this;
  }

  private full(): boolean {
    return this.opts.seats != null && this.opts.seats <= 0;
  }

  private build(): void {
    if (this.seatsEl) {
      const seats = this.opts.seats ?? 0;
      this.seatsEl.textContent = seats > 0 ? `${seats} seats free` : 'Guild is full';
      this.seatsEl.dataset.full = this.full() ? 'on' : 'off';
    }

    clear(this.list);
    if (!this.opts.requests.length) {
      this.list.appendChild(
        h('p', { class: 'fui-requests__empty', text: 'No applications waiting.' }),
      );
      return;
    }

    for (const request of this.opts.requests) {
      const row = h('article', {
        class: 'fui-requests__row',
        dataset: { bar: request.belowBar ? 'below' : 'ok' },
      });

      row.appendChild(
        h('span', {
          class: 'fui-requests__art',
          style: request.art ? { '--fui-req-art': `var(--fui-img-${request.art})` } : undefined,
        }),
      );

      const body = h('div', { class: 'fui-requests__body' });
      const line = h('div', { class: 'fui-requests__line' });
      line.appendChild(h('span', { class: 'fui-requests__name', text: request.name }));
      if (request.level != null) {
        line.appendChild(h('span', { class: 'fui-requests__level fui-num', text: `Lv ${request.level}` }));
      }
      if (request.power != null) {
        line.appendChild(h('span', { class: 'fui-requests__power fui-num', text: commas(request.power) }));
      }
      if (request.when) line.appendChild(h('span', { class: 'fui-requests__when', text: request.when }));
      body.appendChild(line);

      if (request.message) {
        body.appendChild(h('p', { class: 'fui-requests__message', text: `“${request.message}”` }));
      }
      if (request.tags?.length || request.belowBar) {
        const chips = h('div', { class: 'fui-requests__chips' });
        for (const tag of request.tags ?? []) {
          chips.appendChild(h('span', { class: 'fui-requests__chip', text: tag }));
        }
        if (request.belowBar) {
          chips.appendChild(
            h('span', { class: 'fui-requests__chip', dataset: { warn: 'on' }, text: 'Below requirements' }),
          );
        }
        body.appendChild(chips);
      }
      row.appendChild(body);

      const actions = h('div', { class: 'fui-requests__actions' });
      const accept = h('button', {
        class: 'fui-requests__act',
        dataset: { act: 'accept' },
        attrs: { type: 'button', disabled: this.full() },
        text: this.opts.acceptLabel ?? 'Accept',
      });
      accept.addEventListener('click', () => this.resolve(request.id, 'accept'));
      const decline = h('button', {
        class: 'fui-requests__act',
        dataset: { act: 'decline' },
        attrs: { type: 'button' },
        text: this.opts.declineLabel ?? 'Decline',
      });
      decline.addEventListener('click', () => this.resolve(request.id, 'decline'));
      actions.append(accept, decline);
      row.appendChild(actions);

      this.list.appendChild(row);
    }
  }
}
