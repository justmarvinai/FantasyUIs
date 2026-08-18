import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface ChatMessage {
  id?: string;
  /** Who spoke. Omit for system lines. */
  author?: string;
  text: string;
  /** Clock time, e.g. "20:14". */
  time?: string;
  /** Avatar asset id. */
  avatar?: string;
  /** Colour for the author's name — clan rank, VIP tier, moderator. */
  color?: string;
  /** Rank tag before the name, e.g. "Officer". */
  tag?: string;
  /** This is the local player's own message. */
  mine?: boolean;
  /** A system announcement rather than a player line. */
  system?: boolean;
}

export interface ChatChannel {
  id: string;
  label: string;
  /** Unread count on the tab. */
  unread?: number;
}

export interface ChatPanelOptions extends BaseOptions {
  channels?: ChatChannel[];
  /** Channel selected first. */
  channel?: string;
  messages?: ChatMessage[];
  /** Height of the scrolling body. */
  height?: number | string;
  /** Show the composer at the bottom. */
  composer?: boolean;
  placeholder?: string;
  /** Cap on retained messages per panel. */
  limit?: number;
}

/**
 * Clan and world chat: channel tabs, a scrolling transcript with rank tags, and
 * a composer.
 *
 *   const chat = new ChatPanel({
 *     channels: [{ id: 'clan', label: 'Clan' }, { id: 'world', label: 'World', unread: 4 }],
 *     height: 260, composer: true,
 *   });
 *   chat.on<{ channel: string; text: string }>('chat:send', ({ channel, text }) => socket.send(channel, text));
 *   chat.push({ author: 'Ashvale', tag: 'Officer', text: 'Boss up in 10', time: '20:14' });
 *
 * Messages are held per channel, so switching tabs does not lose the other
 * channel's history.
 */
export class ChatPanel extends FuiComponent<ChatPanelOptions> {
  private body: HTMLElement;
  private tabs = new Map<string, HTMLElement>();
  private history = new Map<string, ChatMessage[]>();
  private channel: string;
  private input: HTMLInputElement | null = null;

  constructor(opts: ChatPanelOptions = {}) {
    const root = h('div', { class: 'fui fui-chat' });
    super(root, opts);

    const channels = opts.channels ?? [{ id: 'default', label: 'Chat' }];
    this.channel = opts.channel ?? channels[0].id;
    for (const ch of channels) this.history.set(ch.id, []);

    if (channels.length > 1 || opts.channels) {
      const bar = h('div', { class: 'fui-chat__tabs', attrs: { role: 'tablist' } });
      for (const ch of channels) {
        const tab = h('button', {
          class: 'fui-chat__tab',
          attrs: { type: 'button', role: 'tab', 'data-channel': ch.id },
        });
        tab.appendChild(h('span', { text: ch.label }));
        if (ch.unread) {
          tab.appendChild(h('span', { class: 'fui-chat__unread fui-num', text: String(ch.unread) }));
        }
        tab.addEventListener('click', () => this.select(ch.id));
        this.tabs.set(ch.id, tab);
        bar.appendChild(tab);
      }
      root.appendChild(bar);
    }

    this.body = h('div', { class: 'fui-chat__body fui-scroll' });
    if (opts.height != null) {
      this.body.style.height = typeof opts.height === 'number' ? `${opts.height}px` : opts.height;
    }
    root.appendChild(this.body);

    if (opts.composer ?? true) {
      const form = h('form', { class: 'fui-chat__composer' });
      this.input = h('input', {
        class: 'fui-chat__input',
        attrs: {
          type: 'text',
          placeholder: opts.placeholder ?? 'Say something…',
          'aria-label': 'Message',
          maxlength: 200,
        },
      });
      const send = h('button', { class: 'fui-chat__send', text: 'Send', attrs: { type: 'submit' } });
      form.append(this.input, send);
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const text = this.input?.value.trim();
        if (!text) return;
        this.emit('chat:send', { channel: this.channel, text });
        if (this.input) this.input.value = '';
      });
      root.appendChild(form);
    }

    for (const msg of opts.messages ?? []) this.push(msg, { silent: true });
    this.paintTabs();
    this.render();
  }

  /** The channel currently on screen. */
  getChannel(): string {
    return this.channel;
  }

  select(channel: string): this {
    if (!this.history.has(channel) || channel === this.channel) return this;
    this.channel = channel;
    const tab = this.tabs.get(channel);
    const badge = tab?.querySelector('.fui-chat__unread');
    // Opening a channel is what clears its unread count.
    if (badge) badge.remove();
    this.paintTabs();
    this.render();
    this.emit('chat:channel', channel);
    return this;
  }

  /** Append a message to a channel (the current one unless `channel` is given). */
  push(msg: ChatMessage, opts?: { channel?: string; silent?: boolean }): this {
    const channel = opts?.channel ?? this.channel;
    const list = this.history.get(channel);
    if (!list) return this;
    list.push(msg);
    const limit = this.opts.limit ?? 150;
    if (list.length > limit) list.splice(0, list.length - limit);
    if (channel === this.channel && !opts?.silent) this.render();
    return this;
  }

  /** Every retained message in a channel. */
  getMessages(channel = this.channel): ChatMessage[] {
    return [...(this.history.get(channel) ?? [])];
  }

  private paintTabs(): void {
    for (const [id, tab] of this.tabs) {
      const on = id === this.channel;
      tab.classList.toggle('is-on', on);
      tab.setAttribute('aria-selected', String(on));
    }
  }

  private render(): void {
    clear(this.body);
    for (const msg of this.history.get(this.channel) ?? []) {
      if (msg.system) {
        this.body.appendChild(h('p', { class: 'fui-chat__system', text: msg.text }));
        continue;
      }
      const row = h('div', { class: 'fui-chat__msg' });
      if (msg.mine) row.classList.add('is-mine');
      if (msg.color) row.style.setProperty('--fui-chat-ink', msg.color);

      if (msg.avatar) {
        row.appendChild(
          h('span', {
            class: 'fui-chat__avatar',
            style: { backgroundImage: `var(--fui-img-${msg.avatar})` },
          }),
        );
      }
      const bubble = h('div', { class: 'fui-chat__bubble' });
      const head = h('div', { class: 'fui-chat__meta' });
      if (msg.tag) head.appendChild(h('span', { class: 'fui-chat__tag', text: msg.tag }));
      if (msg.author) head.appendChild(h('span', { class: 'fui-chat__author', text: msg.author }));
      if (msg.time) head.appendChild(h('span', { class: 'fui-chat__time', text: msg.time }));
      if (head.childNodes.length) bubble.appendChild(head);
      bubble.appendChild(h('p', { class: 'fui-chat__text', text: msg.text }));
      row.appendChild(bubble);
      this.body.appendChild(row);
    }
    this.body.scrollTop = this.body.scrollHeight;
  }
}
