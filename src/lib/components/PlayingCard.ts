import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h } from '../core/dom.ts';

export type CardKind = 'minion' | 'spell' | 'weapon' | 'hero' | 'location';

export interface PlayingCardOptions extends BaseOptions {
  /** Card name on the plate. */
  name: string;
  /** Mana cost in the corner gem. */
  cost?: number;
  /** What kind of card it is — drives the whole frame. */
  kind?: CardKind;
  /** Manifest asset id for the illustration. */
  art?: string;
  /** Attack, for minions and weapons. */
  attack?: number;
  /** Health, for minions and heroes. */
  health?: number;
  /** Durability, for weapons. Replaces health in the right gem. */
  durability?: number;
  /** Rules text. Bold runs with `**…**`, keywords with `*…*`. */
  text?: string;
  /** Italic flavour under the rules, shown only in a collection view. */
  flavour?: string;
  /** Tribe or subtype printed under the art — `'Beast'`, `'Fire'`. */
  tribe?: string;
  /** Rarity, which sets the gem below the name. */
  rarity?: Rarity;
  /** Class colour, e.g. a hex or a token. Tints the frame. */
  color?: string;
  /** Golden foil treatment. */
  golden?: boolean;
  /** Elite: the legendary dragon flourish around the portrait. */
  elite?: boolean;
  /** Card width in pixels. Everything else scales from it. */
  width?: number;
  /** Playable right now — lit edge and a lift on hover. */
  playable?: boolean;
  /** Attack or health raised above its printed value, so it prints green. */
  buffed?: { attack?: boolean; health?: boolean };
  /** Damaged: health prints red. */
  damaged?: boolean;
  /** Face down. Nothing but the back is rendered. */
  faceDown?: boolean;
  /** Convenience shorthand for `.on('click', …)`. */
  onClick?: (ev: MouseEvent) => void;
}

/** Turns `**bold**` and `*keyword*` into markup, escaping everything else. */
function richText(raw: string): string {
  const esc = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return esc
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\*([^*]+)\*/g, '<i>$1</i>');
}

/**
 * The card. Everything else in this collection exists to hold one of these,
 * draw one, cost one or count one.
 *
 *   const card = new PlayingCard({
 *     name: 'Emberwing Drake', cost: 5, kind: 'minion', attack: 4, health: 5,
 *     art: 'blood-plague-drake', tribe: 'Dragon', rarity: 'epic',
 *     text: '**Battlecry:** Deal *2* damage to all enemy minions.',
 *     elite: true, playable: true, width: 200,
 *   });
 *   card.on('card:play', () => board.play(card));
 *
 * Every dimension is derived from `width`, in `em` off a font size the root
 * sets — so one number scales the whole card and a 90px hand card and a 300px
 * collection card are the same component rather than two stylesheets. That is
 * what makes `CardHand`, `DiscoverPicker`, `MulliganTray` and `CollectionGrid`
 * able to share it.
 *
 * `kind` is not decoration: a spell has no attack or health gems and a wider
 * text box, a weapon prints durability in the right gem instead of health, and
 * a hero card carries armour. Rendering all five from one template with hidden
 * gems is what makes card frames drift out of alignment as they are edited.
 *
 * Rules text takes `**bold**` for keywords like Battlecry and `*italic*` for
 * the numbers a card mentions, escaped first — card text comes from game data
 * and often from players in custom formats, so it is never trusted as markup.
 */
export class PlayingCard extends FuiComponent<PlayingCardOptions> {
  private attackEl: HTMLElement | null = null;
  private healthEl: HTMLElement | null = null;
  private costEl: HTMLElement | null = null;

  constructor(opts: PlayingCardOptions) {
    const kind = opts.kind ?? 'minion';
    const root = h('div', {
      class: 'fui fui-card',
      dataset: {
        kind,
        rarity: opts.rarity ?? 'common',
        golden: opts.golden ? 'on' : 'off',
        elite: opts.elite ? 'on' : 'off',
        playable: opts.playable ? 'on' : 'off',
        face: opts.faceDown ? 'down' : 'up',
      },
      style: {
        '--fui-card-w': `${opts.width ?? 180}px`,
        ...(opts.color ? { '--fui-card-ink': opts.color } : {}),
        ...(opts.art ? { '--fui-card-art': `var(--fui-img-${opts.art})` } : {}),
      },
      attrs: {
        role: 'button',
        tabindex: '0',
        'aria-label': opts.faceDown
          ? 'Face-down card'
          : `${opts.name}, ${opts.cost ?? 0} mana ${kind}`,
      },
    });
    super(root, opts);

    if (opts.faceDown) {
      root.appendChild(h('span', { class: 'fui-card__back', attrs: { 'aria-hidden': 'true' } }));
      return;
    }

    // Card stock first, portrait over it: painting order does the layering, so
    // no layer needs a z-index that could escape the card's stacking context.
    root.appendChild(h('span', { class: 'fui-card__frame', attrs: { 'aria-hidden': 'true' } }));
    root.appendChild(h('span', { class: 'fui-card__art', attrs: { 'aria-hidden': 'true' } }));
    if (opts.elite) {
      root.appendChild(h('span', { class: 'fui-card__elite', attrs: { 'aria-hidden': 'true' } }));
    }

    // ── Mana gem ──
    if (opts.cost != null) {
      this.costEl = h('span', { class: 'fui-card__cost fui-num', text: String(opts.cost) });
      root.appendChild(this.costEl);
    }

    // ── Name plate ──
    root.appendChild(h('span', { class: 'fui-card__nameplate', attrs: { 'aria-hidden': 'true' } }));
    root.appendChild(h('span', { class: 'fui-card__name', text: opts.name }));

    // ── Rarity gem and tribe ──
    if (opts.rarity && opts.rarity !== 'common') {
      root.appendChild(h('span', { class: 'fui-card__gem', attrs: { 'aria-hidden': 'true' } }));
    }
    if (opts.tribe) root.appendChild(h('span', { class: 'fui-card__tribe', text: opts.tribe }));

    // ── Text box ──
    const body = h('div', { class: 'fui-card__body' });
    if (opts.text) body.appendChild(h('p', { class: 'fui-card__text', html: richText(opts.text) }));
    if (opts.flavour) body.appendChild(h('p', { class: 'fui-card__flavour', text: opts.flavour }));
    root.appendChild(body);

    // ── Stat gems. A weapon prints durability where a minion prints health. ──
    if (opts.attack != null) {
      this.attackEl = h('span', {
        class: 'fui-card__attack fui-num',
        dataset: { buffed: opts.buffed?.attack ? 'on' : 'off' },
        text: String(opts.attack),
      });
      root.appendChild(this.attackEl);
    }
    const right = opts.durability ?? opts.health;
    if (right != null) {
      this.healthEl = h('span', {
        class: 'fui-card__health fui-num',
        dataset: {
          slot: opts.durability != null ? 'durability' : 'health',
          buffed: opts.buffed?.health ? 'on' : 'off',
          damaged: opts.damaged ? 'on' : 'off',
        },
        text: String(right),
      });
      root.appendChild(this.healthEl);
    }

    root.addEventListener('click', () => this.emit('card:play', this.opts));
    root.addEventListener('keydown', (ev) => {
      const key = ev as KeyboardEvent;
      if (key.key === 'Enter' || key.key === ' ') {
        key.preventDefault();
        this.emit('card:play', this.opts);
      }
    });
    if (opts.onClick) root.addEventListener('click', opts.onClick as EventListener);
  }

  /** Set attack and health, colouring each against its printed value. */
  setStats(attack?: number, health?: number, printed?: { attack?: number; health?: number }): this {
    if (attack != null && this.attackEl) {
      this.attackEl.textContent = String(attack);
      const base = printed?.attack ?? this.opts.attack ?? attack;
      this.attackEl.dataset.buffed = attack > base ? 'on' : 'off';
    }
    if (health != null && this.healthEl) {
      this.healthEl.textContent = String(health);
      const base = printed?.health ?? this.opts.health ?? health;
      this.healthEl.dataset.buffed = health > base ? 'on' : 'off';
      this.healthEl.dataset.damaged = health < base ? 'on' : 'off';
    }
    return this;
  }

  /** Change the mana cost, marking it as discounted when it drops. */
  setCost(cost: number): this {
    const printed = this.opts.cost ?? cost;
    if (this.costEl) {
      this.costEl.textContent = String(cost);
      this.costEl.dataset.discounted = cost < printed ? 'on' : 'off';
    }
    return this;
  }

  /** Whether the player can afford and legally play it right now. */
  setPlayable(playable: boolean): this {
    this.opts.playable = playable;
    this.el.dataset.playable = playable ? 'on' : 'off';
    return this;
  }
}
