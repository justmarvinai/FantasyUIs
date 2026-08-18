import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface Gem {
  id: string;
  name: string;
  /** Manifest asset id for the gem art. */
  art?: string;
  rarity?: Rarity;
  /** What it grants once socketed, e.g. "+8% C.RATE". */
  effect?: string;
  /** Socket colour this gem fits. Omit to fit any. */
  colour?: string;
}

export interface Socket {
  /** Colour this socket accepts — matching gems get the bonus. */
  colour?: string;
  /** The gem currently in it. */
  gem?: Gem | null;
  /** Not yet unlocked; shown padlocked. */
  locked?: boolean;
}

export interface SocketPanelOptions extends BaseOptions {
  /** The piece being socketed. */
  itemName?: string;
  /** Manifest asset id for the item art. */
  itemArt?: string;
  itemRarity?: Rarity;
  sockets: Socket[];
  /** Bonus for filling every socket with a matching colour. */
  matchBonus?: string;
  /** Cost to unlock the next socket. */
  unlockCost?: string;
  /** Width of one socket hexagon in pixels. */
  size?: number;
}

/**
 * Gem and rune socketing — the second upgrade axis a gear screen adds on top of
 * levels, where the socket's colour and the gem's have to agree.
 *
 *   const panel = new SocketPanel({
 *     itemName: 'Bloodforged Cuirass', itemArt: 'weapon-warhammer', itemRarity: 'legendary',
 *     sockets: [
 *       { colour: '#d84b3a', gem: { id: 'g1', name: 'Ember Shard', art: 'fire-golden-flame', rarity: 'epic', effect: '+8% ATK', colour: '#d84b3a' } },
 *       { colour: '#4a8ede' },
 *       { locked: true },
 *     ],
 *     matchBonus: 'All matched: +12% C.DMG',
 *     unlockCost: '250,000 gold',
 *   });
 *   panel.on<number>('socket:pick', (i) => openGemPicker(i));
 *
 * A mismatched gem still socketed is drawn with a warning rim rather than
 * refused, because most games allow it and just withhold the bonus.
 */
export class SocketPanel extends FuiComponent<SocketPanelOptions> {
  private sockets: Socket[];
  private list: HTMLElement;
  private matchEl: HTMLElement | null = null;

  constructor(opts: SocketPanelOptions) {
    const root = h('div', {
      class: 'fui fui-sockets',
      style: { '--fui-socket-size': `${opts.size ?? 48}px` },
    });
    super(root, opts);
    this.sockets = opts.sockets.map((s) => ({ ...s }));

    if (opts.itemName) {
      const head = h('div', {
        class: 'fui-sockets__head',
        dataset: { rarity: opts.itemRarity ?? 'common' },
      });
      const art = h('span', { class: 'fui-sockets__item-art' });
      if (opts.itemArt) art.style.backgroundImage = `var(--fui-img-${opts.itemArt})`;
      head.append(art, h('span', { class: 'fui-sockets__item-name', text: opts.itemName }));
      root.appendChild(head);
    }

    this.list = h('div', { class: 'fui-sockets__list' });
    root.appendChild(this.list);

    if (opts.matchBonus) {
      this.matchEl = h('p', { class: 'fui-sockets__match', text: opts.matchBonus });
      root.appendChild(this.matchEl);
    }
    if (opts.unlockCost) {
      root.appendChild(
        h('p', { class: 'fui-sockets__unlock', text: `Next socket: ${opts.unlockCost}` }),
      );
    }
    this.render();
  }

  private render(): void {
    clear(this.list);
    this.sockets.forEach((socket, i) => {
      const matched = !!socket.gem && (!socket.colour || socket.gem.colour === socket.colour);
      const cell = h('button', {
        class: 'fui-sockets__socket',
        dataset: { rarity: socket.gem?.rarity ?? 'empty' },
        style: socket.colour ? { '--fui-socket-ink': socket.colour } : {},
        attrs: {
          type: 'button',
          disabled: socket.locked || undefined,
          title: socket.gem ? `${socket.gem.name} — ${socket.gem.effect ?? ''}`.trim() : 'Empty socket',
        },
      });
      if (socket.locked) cell.classList.add('is-locked');
      else if (!socket.gem) cell.classList.add('is-empty');
      if (socket.gem && !matched) cell.classList.add('is-mismatch');

      const gemEl = h('span', { class: 'fui-sockets__gem' });
      if (socket.gem?.art) gemEl.style.backgroundImage = `var(--fui-img-${socket.gem.art})`;
      cell.appendChild(gemEl);

      const label = h('span', { class: 'fui-sockets__label' });
      label.appendChild(
        h('span', {
          class: 'fui-sockets__effect',
          text: socket.locked ? 'Locked' : (socket.gem?.effect ?? 'Empty'),
        }),
      );
      cell.appendChild(label);

      if (!socket.locked) cell.addEventListener('click', () => this.emit('socket:pick', i));
      this.list.appendChild(cell);
    });

    if (this.matchEl) {
      const all = this.sockets.every(
        (s) => s.locked || (s.gem && (!s.colour || s.gem.colour === s.colour)),
      );
      this.matchEl.dataset.active = String(all);
    }
  }

  /** Put a gem in a socket, or clear it with `null`. */
  set(index: number, gem: Gem | null): this {
    const socket = this.sockets[index];
    if (!socket || socket.locked) return this;
    socket.gem = gem;
    this.render();
    this.emit('socket:change', this.sockets.map((s) => s.gem ?? null));
    return this;
  }

  /** Unlock a previously locked socket. */
  unlock(index: number): this {
    const socket = this.sockets[index];
    if (!socket) return this;
    socket.locked = false;
    this.render();
    this.emit('socket:unlock', index);
    return this;
  }

  /** Every socketed gem, in socket order; empty sockets are `null`. */
  get(): Array<Gem | null> {
    return this.sockets.map((s) => s.gem ?? null);
  }
}
