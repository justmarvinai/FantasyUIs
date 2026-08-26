import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export type MinionKeyword =
  | 'taunt'
  | 'divine-shield'
  | 'stealth'
  | 'frozen'
  | 'windfury'
  | 'poisonous'
  | 'lifesteal'
  | 'rush'
  | 'silenced'
  | 'immune';

export interface MinionOptions extends BaseOptions {
  /** Minion name, shown on hover and to screen readers. */
  name: string;
  /** Manifest asset id for the portrait. */
  art?: string;
  /** Attack power, printed in the left gem. */
  attack?: number;
  /** Current health, printed in the right gem. */
  health?: number;
  /** Printed health, so damage colours the number without a second field. */
  maxHealth?: number;
  /** Keywords, which drive the overlays. */
  keywords?: MinionKeyword[];
  /** Which side of the board it is on. */
  side?: 'friendly' | 'enemy';
  /** Cannot attack yet — freshly summoned. */
  asleep?: boolean;
  /** Already attacked this turn. */
  exhausted?: boolean;
  /** Legendary, which adds the elite rim. */
  elite?: boolean;
  /** Attack raised above its printed value. */
  buffed?: boolean;
  /** Diameter in pixels. */
  size?: number;
  /** Glyph asset ids for one-off enchantment markers. */
  enchantments?: string[];
}

const KEYWORD_TITLES: Record<MinionKeyword, string> = {
  taunt: 'Taunt',
  'divine-shield': 'Divine Shield',
  stealth: 'Stealth',
  frozen: 'Frozen',
  windfury: 'Windfury',
  poisonous: 'Poisonous',
  lifesteal: 'Lifesteal',
  rush: 'Rush',
  silenced: 'Silenced',
  immune: 'Immune',
};

/**
 * A minion in play. Not a card — a card is a rectangle in your hand, and the
 * moment it hits the board it becomes a round token with different rules, a
 * different silhouette and a stack of status overlays.
 *
 *   const drake = new Minion({
 *     name: 'Emberwing Drake', art: 'blood-plague-drake', attack: 4, health: 5, maxHealth: 5,
 *     keywords: ['taunt', 'divine-shield'], elite: true, side: 'friendly',
 *   });
 *   drake.on('minion:attack', () => combat.declare(drake));
 *   drake.damage(2);
 *
 * Keywords stack as separate layers on purpose — a taunt shield, a divine-shield
 * halo and a frozen sheet all read at once, which is exactly the case a single
 * "status" border cannot handle and the case that decides a turn.
 *
 * `asleep` and `exhausted` are different states with the same consequence, and
 * conflating them is the classic mistake: a sleeping minion becomes attackable
 * next turn, an exhausted one already attacked. The zzz and the grey-out say
 * which, so a player can plan the next turn rather than only this one.
 */
export class Minion extends FuiComponent<MinionOptions> {
  private attackEl: HTMLElement | null = null;
  private healthEl: HTMLElement | null = null;
  private keywordRow: HTMLElement;

  constructor(opts: MinionOptions) {
    const root = h('div', {
      class: 'fui fui-minion',
      dataset: {
        side: opts.side ?? 'friendly',
        asleep: opts.asleep ? 'on' : 'off',
        exhausted: opts.exhausted ? 'on' : 'off',
        elite: opts.elite ? 'on' : 'off',
        ...Object.fromEntries((opts.keywords ?? []).map((k) => [k.replace('-', ''), 'on'])),
      },
      style: {
        '--fui-minion-size': `${opts.size ?? 92}px`,
        ...(opts.art ? { '--fui-minion-art': `var(--fui-img-${opts.art})` } : {}),
      },
      attrs: {
        role: 'button',
        tabindex: '0',
        title: opts.name,
        'aria-label': `${opts.name}, ${opts.attack ?? 0} attack, ${opts.health ?? 0} health`,
      },
    });
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-minion__taunt', attrs: { 'aria-hidden': 'true' } }));
    root.appendChild(h('span', { class: 'fui-minion__portrait', attrs: { 'aria-hidden': 'true' } }));
    root.appendChild(h('span', { class: 'fui-minion__rim', attrs: { 'aria-hidden': 'true' } }));
    root.appendChild(h('span', { class: 'fui-minion__shield', attrs: { 'aria-hidden': 'true' } }));
    root.appendChild(h('span', { class: 'fui-minion__frost', attrs: { 'aria-hidden': 'true' } }));
    root.appendChild(h('span', { class: 'fui-minion__zzz', attrs: { 'aria-hidden': 'true' }, text: 'z' }));

    if (opts.attack != null) {
      this.attackEl = h('span', {
        class: 'fui-minion__attack fui-num',
        dataset: { buffed: opts.buffed ? 'on' : 'off' },
        text: String(opts.attack),
      });
      root.appendChild(this.attackEl);
    }
    if (opts.health != null) {
      this.healthEl = h('span', {
        class: 'fui-minion__health fui-num',
        dataset: { damaged: opts.maxHealth != null && opts.health < opts.maxHealth ? 'on' : 'off' },
        text: String(opts.health),
      });
      root.appendChild(this.healthEl);
    }

    this.keywordRow = h('span', { class: 'fui-minion__marks' });
    root.appendChild(this.keywordRow);
    this.paintMarks();

    root.appendChild(h('span', { class: 'fui-minion__name', text: opts.name }));

    root.addEventListener('click', () => this.emit('minion:attack', opts.name));
    root.addEventListener('keydown', (ev) => {
      const key = ev as KeyboardEvent;
      if (key.key === 'Enter' || key.key === ' ') {
        key.preventDefault();
        this.emit('minion:attack', opts.name);
      }
    });
  }

  /** Take damage. A divine shield eats the first hit and pops instead. */
  damage(amount: number): this {
    if (this.has('divine-shield')) {
      this.removeKeyword('divine-shield');
      this.el.dataset.popped = 'on';
      this.emit('minion:shield-break', this.opts.name);
      return this;
    }
    const health = Math.max(0, (this.opts.health ?? 0) - amount);
    this.setStats(undefined, health);
    this.el.dataset.hurt = 'on';
    // Replayed on demand so a second hit inside the animation still registers.
    void this.el.offsetWidth;
    this.el.dataset.hurt = 'off';
    if (health === 0) this.emit('minion:dies', this.opts.name);
    return this;
  }

  /** Set attack and health, colouring each against its printed value. */
  setStats(attack?: number, health?: number): this {
    if (attack != null) {
      this.opts.attack = attack;
      if (this.attackEl) this.attackEl.textContent = String(attack);
    }
    if (health != null) {
      this.opts.health = health;
      if (this.healthEl) {
        this.healthEl.textContent = String(health);
        const max = this.opts.maxHealth ?? health;
        this.healthEl.dataset.damaged = health < max ? 'on' : 'off';
      }
    }
    this.el.setAttribute(
      'aria-label',
      `${this.opts.name}, ${this.opts.attack ?? 0} attack, ${this.opts.health ?? 0} health`,
    );
    return this;
  }

  /** Whether it currently has a keyword. */
  has(keyword: MinionKeyword): boolean {
    return (this.opts.keywords ?? []).includes(keyword);
  }

  /** Give it a keyword. */
  addKeyword(keyword: MinionKeyword): this {
    if (this.has(keyword)) return this;
    this.opts.keywords = [...(this.opts.keywords ?? []), keyword];
    this.el.dataset[keyword.replace('-', '')] = 'on';
    this.paintMarks();
    return this;
  }

  /** Take a keyword away. */
  removeKeyword(keyword: MinionKeyword): this {
    this.opts.keywords = (this.opts.keywords ?? []).filter((k) => k !== keyword);
    delete this.el.dataset[keyword.replace('-', '')];
    this.paintMarks();
    return this;
  }

  /** Strip every keyword and enchantment. */
  silence(): this {
    for (const k of [...(this.opts.keywords ?? [])]) this.removeKeyword(k);
    this.opts.enchantments = [];
    this.addKeyword('silenced');
    this.emit('minion:silenced', this.opts.name);
    return this;
  }

  /** Wake it up at the start of your turn. */
  ready(): this {
    this.opts.asleep = false;
    this.opts.exhausted = false;
    this.el.dataset.asleep = 'off';
    this.el.dataset.exhausted = 'off';
    return this;
  }

  private paintMarks(): void {
    clear(this.keywordRow);
    // Only the keywords with no overlay of their own get a mark, or a taunt
    // would be announced twice — once by its shield and once by a chip.
    const marked: MinionKeyword[] = ['windfury', 'poisonous', 'lifesteal', 'rush', 'immune'];
    for (const k of this.opts.keywords ?? []) {
      if (!marked.includes(k)) continue;
      this.keywordRow.appendChild(
        h('span', {
          class: 'fui-minion__mark',
          dataset: { kw: k },
          attrs: { title: KEYWORD_TITLES[k] },
        }),
      );
    }
    for (const glyph of this.opts.enchantments ?? []) {
      this.keywordRow.appendChild(
        h('span', {
          class: 'fui-minion__mark',
          dataset: { kw: 'enchant' },
          style: { '--fui-minion-ench': `var(--fui-img-${glyph})` },
        }),
      );
    }
  }
}
