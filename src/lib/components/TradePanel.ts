import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear, commas } from '../core/dom.ts';

export interface TradeItem {
  id: string;
  name?: string;
  /** Manifest asset id for the item art. */
  art?: string;
  rarity?: Rarity;
  qty?: number;
}

export interface TradeSide {
  /** Whose half of the window this is. */
  name: string;
  /** Avatar asset id. */
  avatar?: string;
  level?: number;
  /** Items offered. */
  items?: Array<TradeItem | null>;
  /** Currency offered alongside the items. */
  gold?: number;
  /** This side has locked their offer in. */
  locked?: boolean;
  /** This side has pressed accept. */
  accepted?: boolean;
}

export interface TradePanelOptions extends BaseOptions {
  /** The local player's half. Its slots are editable. */
  you: TradeSide;
  /** The other party's half. Read-only. */
  them: TradeSide;
  /** Slots per side. */
  slots?: number;
  /** Warning line under the offers. */
  warning?: string;
  /** Cell size in pixels. */
  size?: number;
}

/**
 * The two-sided trade window: your offer, theirs, and the lock-then-accept
 * handshake that stops the classic swap-at-the-last-moment scam.
 *
 *   const trade = new TradePanel({
 *     you: { name: 'You', items: [sword, null, null], gold: 12_000 },
 *     them: { name: 'Rhogar', avatar: 'tech-mech-suit', items: [shard], accepted: false },
 *     warning: 'Both sides must lock before either can accept.',
 *   });
 *   trade.on<number>('trade:slot', (i) => openBagPicker(i));
 *   trade.on('trade:accept', () => server.accept());
 *
 * Accept stays disabled until both sides have locked, and any change to your
 * offer clears both accepts — which is the rule that makes the window safe
 * rather than merely pretty.
 */
export class TradePanel extends FuiComponent<TradePanelOptions> {
  private yourSlots: HTMLElement;
  private lockBtn: HTMLButtonElement;
  private acceptBtn: HTMLButtonElement;
  private theirBoard: HTMLElement;

  constructor(opts: TradePanelOptions) {
    const root = h('div', {
      class: 'fui fui-trade',
      style: { '--fui-trade-size': `${opts.size ?? 52}px` },
    });
    super(root, opts);

    const board = h('div', { class: 'fui-trade__board' });
    const yours = this.makeSide(opts.you, true);
    this.yourSlots = yours.querySelector('.fui-trade__slots') as HTMLElement;
    board.appendChild(yours);

    board.appendChild(h('span', { class: 'fui-trade__swap', text: '⇄', attrs: { 'aria-hidden': 'true' } }));

    this.theirBoard = this.makeSide(opts.them, false);
    board.appendChild(this.theirBoard);
    root.appendChild(board);

    if (opts.warning) {
      root.appendChild(h('p', { class: 'fui-trade__warning', text: opts.warning }));
    }

    const actions = h('div', { class: 'fui-trade__actions' });
    this.lockBtn = h('button', {
      class: 'fui-trade__lock',
      text: 'Lock offer',
      attrs: { type: 'button' },
    });
    this.lockBtn.addEventListener('click', () => this.setLocked(!this.opts.you.locked));

    this.acceptBtn = h('button', {
      class: 'fui-trade__accept',
      text: 'Accept',
      attrs: { type: 'button' },
    });
    this.acceptBtn.addEventListener('click', () => {
      if (this.acceptBtn.disabled) return;
      this.opts.you.accepted = true;
      this.paint();
      this.emit('trade:accept');
    });

    const cancel = h('button', { class: 'fui-trade__cancel', text: 'Cancel', attrs: { type: 'button' } });
    cancel.addEventListener('click', () => this.emit('trade:cancel'));

    actions.append(cancel, this.lockBtn, this.acceptBtn);
    root.appendChild(actions);
    this.paint();
  }

  private makeSide(side: TradeSide, mine: boolean): HTMLElement {
    const el = h('div', { class: 'fui-trade__side', dataset: { mine: String(mine) } });

    const head = h('div', { class: 'fui-trade__head' });
    const avatar = h('span', { class: 'fui-trade__avatar' });
    if (side.avatar) avatar.style.backgroundImage = `var(--fui-img-${side.avatar})`;
    head.appendChild(avatar);
    const names = h('div', { class: 'fui-trade__names' });
    names.appendChild(h('span', { class: 'fui-trade__name', text: side.name }));
    if (side.level != null) {
      names.appendChild(h('span', { class: 'fui-trade__level', text: `Lv ${side.level}` }));
    }
    head.appendChild(names);
    head.appendChild(h('span', { class: 'fui-trade__status' }));
    el.appendChild(head);

    const slots = h('div', { class: 'fui-trade__slots' });
    el.appendChild(slots);
    this.fillSlots(slots, side, mine);

    const gold = h('div', { class: 'fui-trade__gold' });
    gold.appendChild(h('span', { class: 'fui-trade__gold-label fui-label', text: 'Gold' }));
    gold.appendChild(
      h('span', { class: 'fui-trade__gold-value fui-num', text: commas(side.gold ?? 0) }),
    );
    el.appendChild(gold);
    return el;
  }

  private fillSlots(host: HTMLElement, side: TradeSide, mine: boolean): void {
    clear(host);
    const count = this.opts.slots ?? 6;
    for (let i = 0; i < count; i++) {
      const item = side.items?.[i] ?? null;
      const cell = h(mine ? 'button' : 'div', {
        class: 'fui-trade__slot',
        dataset: { rarity: item?.rarity ?? 'empty' },
        attrs: {
          type: mine ? 'button' : undefined,
          title: item?.name ?? 'Empty',
          disabled: mine && side.locked ? true : undefined,
        },
      });
      if (!item) cell.classList.add('is-empty');
      if (item?.art) cell.style.backgroundImage = `var(--fui-img-${item.art})`;
      if (item?.qty != null && item.qty > 1) {
        cell.appendChild(h('span', { class: 'fui-trade__qty fui-num', text: `×${item.qty}` }));
      }
      if (mine) cell.addEventListener('click', () => this.emit('trade:slot', i));
      host.appendChild(cell);
    }
  }

  /**
   * Put an item in one of your slots. Any change to the offer clears both
   * accepts — the whole point of the handshake.
   */
  setItem(index: number, item: TradeItem | null): this {
    if (this.opts.you.locked) return this;
    const items = (this.opts.you.items ??= []);
    items[index] = item;
    this.opts.you.accepted = false;
    this.opts.them.accepted = false;
    this.fillSlots(this.yourSlots, this.opts.you, true);
    this.paint();
    this.emit('trade:change', this.opts.you);
    return this;
  }

  /** Lock or unlock your side. Unlocking clears both accepts. */
  setLocked(locked: boolean): this {
    this.opts.you.locked = locked;
    if (!locked) {
      this.opts.you.accepted = false;
      this.opts.them.accepted = false;
    }
    this.fillSlots(this.yourSlots, this.opts.you, true);
    this.paint();
    this.emit(locked ? 'trade:lock' : 'trade:unlock');
    return this;
  }

  /** Apply the other side's state as the server reports it. */
  setThem(them: Partial<TradeSide>): this {
    Object.assign(this.opts.them, them);
    const slots = this.theirBoard.querySelector('.fui-trade__slots');
    if (slots) this.fillSlots(slots as HTMLElement, this.opts.them, false);
    this.paint();
    return this;
  }

  private paint(): void {
    const { you, them } = this.opts;
    const bothLocked = !!you.locked && !!them.locked;

    this.lockBtn.textContent = you.locked ? 'Unlock' : 'Lock offer';
    this.lockBtn.classList.toggle('is-on', !!you.locked);
    this.acceptBtn.disabled = !bothLocked || !!you.accepted;
    this.acceptBtn.textContent = you.accepted ? 'Waiting…' : 'Accept';

    const sides = Array.from(this.el.querySelectorAll('.fui-trade__side')) as HTMLElement[];
    for (const el of sides) {
      const side = el.dataset.mine === 'true' ? you : them;
      el.dataset.state = side.accepted ? 'accepted' : side.locked ? 'locked' : 'open';
      const status = el.querySelector('.fui-trade__status');
      if (status) {
        status.textContent = side.accepted ? 'Accepted' : side.locked ? 'Locked' : 'Editing';
      }
    }
  }
}
