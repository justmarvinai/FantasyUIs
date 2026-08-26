import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface CardBackOptions extends BaseOptions {
  /** Name of the back, for the collection view. */
  name?: string;
  /** Glyph asset id for the sigil at the centre. */
  sigil?: string;
  /** Manifest asset id for a painted back. Replaces the drawn pattern. */
  art?: string;
  /** Primary colour of the weave. */
  color?: string;
  /** Second colour, for the rim. Defaults to a darker `color`. */
  edge?: string;
  /** Background weave. */
  pattern?: 'diagonal' | 'scales' | 'runes' | 'plain';
  /** Card width in pixels. */
  width?: number;
  /** Owned — used by a collection of backs. */
  owned?: boolean;
  /** The one currently in use. */
  equipped?: boolean;
  /** How it is earned, printed when not owned. */
  source?: string;
  /** Convenience shorthand for `.on('click', …)`. */
  onClick?: (ev: MouseEvent) => void;
}

/**
 * The reverse of a card — the deck skin. Every face-down card in a game shows
 * one: the opponent's hand, the draw pile, a secret, a mulligan before the
 * reveal.
 *
 *   const back = new CardBack({
 *     name: 'Ashfall Weave', sigil: 'glyph-magic-flame',
 *     color: '#8a3a20', pattern: 'scales', equipped: true,
 *   });
 *   back.on('back:select', () => profile.setCardBack('ashfall'));
 *
 * The patterns are drawn in CSS rather than shipped as art, which is what makes
 * a back a two-line data record — a colour and a sigil — instead of a new PNG
 * per skin. A game that sells card backs needs dozens of them, and thirty
 * gradients cost nothing where thirty images cost a download.
 *
 * `PlayingCard({ faceDown: true })` draws a plain back inline for a card that
 * happens to be hidden. This component is the back as a *thing* — named, owned,
 * equippable, browsable — which is what a collection screen needs.
 */
export class CardBack extends FuiComponent<CardBackOptions> {
  constructor(opts: CardBackOptions = {}) {
    const root = h('div', {
      class: 'fui fui-cardback',
      dataset: {
        pattern: opts.pattern ?? 'diagonal',
        owned: opts.owned === false ? 'off' : 'on',
        equipped: opts.equipped ? 'on' : 'off',
      },
      style: {
        '--fui-back-w': `${opts.width ?? 140}px`,
        ...(opts.color ? { '--fui-back-ink': opts.color } : {}),
        ...(opts.edge ? { '--fui-back-edge': opts.edge } : {}),
        ...(opts.art ? { '--fui-back-art': `var(--fui-img-${opts.art})` } : {}),
        ...(opts.sigil ? { '--fui-back-sigil': `var(--fui-img-${opts.sigil})` } : {}),
      },
      attrs: {
        role: opts.onClick || opts.name ? 'button' : 'presentation',
        tabindex: opts.name ? '0' : undefined,
        'aria-label': opts.name,
      },
    });
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-cardback__weave', attrs: { 'aria-hidden': 'true' } }));
    if (opts.sigil || opts.art) {
      root.appendChild(h('span', { class: 'fui-cardback__sigil', attrs: { 'aria-hidden': 'true' } }));
    }
    root.appendChild(h('span', { class: 'fui-cardback__rim', attrs: { 'aria-hidden': 'true' } }));

    if (opts.equipped) {
      root.appendChild(h('span', { class: 'fui-cardback__badge', text: 'In use' }));
    }
    if (opts.name) {
      root.appendChild(h('span', { class: 'fui-cardback__name', text: opts.name }));
    }
    if (opts.owned === false && opts.source) {
      root.appendChild(h('span', { class: 'fui-cardback__source', text: opts.source }));
    }

    if (opts.name) {
      root.addEventListener('click', () => this.emit('back:select', opts.name));
      root.addEventListener('keydown', (ev) => {
        const key = ev as KeyboardEvent;
        if (key.key === 'Enter' || key.key === ' ') {
          key.preventDefault();
          this.emit('back:select', opts.name);
        }
      });
    }
    if (opts.onClick) root.addEventListener('click', opts.onClick as EventListener);
  }

  /** Mark this back as the one in use. */
  setEquipped(equipped: boolean): this {
    this.opts.equipped = equipped;
    this.el.dataset.equipped = equipped ? 'on' : 'off';
    return this;
  }
}
