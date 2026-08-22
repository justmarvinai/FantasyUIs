import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, commas } from '../core/dom.ts';

export interface AbilityScore {
  /** Three-letter key — STR, DEX, CON, INT, WIS, CHA, or your own. */
  key: string;
  value: number;
  /** Modifier. Worked out from the score when left off. */
  mod?: number;
}

export interface StatBlockTrait {
  name: string;
  text: string;
  /** Actions read as things the creature does on its turn. */
  kind?: 'trait' | 'action' | 'reaction' | 'legendary';
}

export interface StatBlockOptions extends BaseOptions {
  /** Creature or character name. */
  name: string;
  /** Size, type and alignment — "Large aberration, chaotic evil". */
  kind?: string;
  /** Manifest asset id for the portrait. */
  art?: string;
  /** Armour class, with an optional source in brackets. */
  ac?: number | string;
  /** Hit points. */
  hp?: number | string;
  /** Movement line. */
  speed?: string;
  /** The six scores, or however many your system has. */
  scores?: AbilityScore[];
  /** Lines between the scores and the traits — saves, senses, languages. */
  lines?: Array<{ label: string; value: string }>;
  /** Challenge rating or power level. */
  challenge?: string;
  /** Traits, actions and reactions. */
  traits?: StatBlockTrait[];
  /** Colour of the rules and the heading. */
  color?: string;
  /** Two columns instead of one, for a wide creature. */
  wide?: boolean;
}

/** The classic score-to-modifier curve, so a game need only give the score. */
function modifierOf(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * The creature stat block — the densest, most-read page in any tabletop-derived
 * RPG. A bestiary entry, a boss preview, a summon's card, a GM screen.
 *
 *   new StatBlock({
 *     name: 'Gravebound Revenant', kind: 'Large undead, chaotic evil',
 *     art: 'blood-necromancer', ac: '17 (natural armour)', hp: '187 (22d10 + 66)',
 *     speed: '30 ft., fly 40 ft. (hover)', challenge: 'CR 12 · 8,400 XP',
 *     scores: [{ key: 'STR', value: 20 }, { key: 'DEX', value: 14 }],
 *     lines: [{ label: 'Damage immunities', value: 'poison, necrotic' }],
 *     traits: [{ name: 'Grave Bound', text: 'Cannot be moved more than 60 ft. from its barrow.' }],
 *   });
 *
 * Modifiers are worked out from the scores unless a game overrides them, so the
 * common case is six numbers and nothing else. Traits group themselves by kind
 * under their own headings — a block where actions and passive traits run
 * together is the one thing that makes this layout unreadable.
 */
export class StatBlock extends FuiComponent<StatBlockOptions> {
  private body: HTMLElement;

  constructor(opts: StatBlockOptions) {
    const root = h('div', {
      class: 'fui fui-block',
      dataset: { wide: String(!!opts.wide) },
      style: opts.color ? { '--fui-block-ink': opts.color } : {},
    });
    super(root, opts);

    const head = h('header', { class: 'fui-block__head' });
    if (opts.art) {
      head.appendChild(
        h('span', {
          class: 'fui-block__art',
          style: { backgroundImage: `var(--fui-img-${opts.art})` },
        }),
      );
    }
    const titles = h('div', { class: 'fui-block__titles' });
    titles.appendChild(h('h3', { class: 'fui-block__name fui-title', text: opts.name }));
    if (opts.kind) titles.appendChild(h('p', { class: 'fui-block__kind', text: opts.kind }));
    head.appendChild(titles);
    root.appendChild(head);

    root.appendChild(h('span', { class: 'fui-block__rule', attrs: { 'aria-hidden': 'true' } }));

    this.body = h('div', { class: 'fui-block__body' });
    root.appendChild(this.body);
    this.render();
  }

  /** A score's modifier, from the override or the standard curve. */
  modifier(key: string): number {
    const score = this.opts.scores?.find((s) => s.key === key);
    if (!score) return 0;
    return score.mod ?? modifierOf(score.value);
  }

  /** Replace the traits without rebuilding the header. */
  setTraits(traits: StatBlockTrait[]): this {
    this.opts.traits = traits;
    this.render();
    return this;
  }

  private render(): void {
    clear(this.body);
    const { opts } = this;

    const top = h('div', { class: 'fui-block__top' });
    for (const [label, value] of [
      ['Armour Class', opts.ac],
      ['Hit Points', opts.hp],
      ['Speed', opts.speed],
    ] as Array<[string, string | number | undefined]>) {
      if (value == null) continue;
      top.appendChild(
        h(
          'p',
          { class: 'fui-block__line' },
          h('span', { class: 'fui-block__key', text: label }),
          h('span', { class: 'fui-block__val', text: typeof value === 'number' ? commas(value) : value }),
        ),
      );
    }
    if (top.childNodes.length) this.body.appendChild(top);

    if (opts.scores?.length) {
      this.body.appendChild(h('span', { class: 'fui-block__rule', attrs: { 'aria-hidden': 'true' } }));
      const grid = h('div', { class: 'fui-block__scores' });
      for (const score of opts.scores) {
        const mod = score.mod ?? modifierOf(score.value);
        const cell = h('div', { class: 'fui-block__score' });
        cell.appendChild(h('span', { class: 'fui-block__score-key', text: score.key }));
        cell.appendChild(h('span', { class: 'fui-block__score-val fui-num', text: String(score.value) }));
        cell.appendChild(
          h('span', {
            class: 'fui-block__score-mod fui-num',
            dataset: { sign: mod >= 0 ? 'up' : 'down' },
            text: `${mod >= 0 ? '+' : '−'}${Math.abs(mod)}`,
          }),
        );
        grid.appendChild(cell);
      }
      this.body.appendChild(grid);
    }

    if (opts.lines?.length || opts.challenge) {
      this.body.appendChild(h('span', { class: 'fui-block__rule', attrs: { 'aria-hidden': 'true' } }));
      const rest = h('div', { class: 'fui-block__lines' });
      for (const line of opts.lines ?? []) {
        rest.appendChild(
          h(
            'p',
            { class: 'fui-block__line' },
            h('span', { class: 'fui-block__key', text: line.label }),
            h('span', { class: 'fui-block__val', text: line.value }),
          ),
        );
      }
      if (opts.challenge) {
        rest.appendChild(
          h(
            'p',
            { class: 'fui-block__line fui-block__line--cr' },
            h('span', { class: 'fui-block__key', text: 'Challenge' }),
            h('span', { class: 'fui-block__val fui-num', text: opts.challenge }),
          ),
        );
      }
      this.body.appendChild(rest);
    }

    // Grouping by kind is what keeps the block readable: a page where passive
    // traits and actions run together is the classic unreadable stat block.
    const groups: Array<[NonNullable<StatBlockTrait['kind']>, string]> = [
      ['trait', ''],
      ['action', 'Actions'],
      ['reaction', 'Reactions'],
      ['legendary', 'Legendary Actions'],
    ];
    for (const [kind, heading] of groups) {
      const list = (opts.traits ?? []).filter((t) => (t.kind ?? 'trait') === kind);
      if (!list.length) continue;
      if (heading) {
        this.body.appendChild(
          h('h4', { class: 'fui-block__heading fui-title', text: heading }),
        );
      }
      const wrap = h('div', { class: 'fui-block__traits' });
      for (const trait of list) {
        wrap.appendChild(
          h(
            'p',
            { class: 'fui-block__trait' },
            h('span', { class: 'fui-block__trait-name', text: `${trait.name}.` }),
            h('span', { class: 'fui-block__trait-text', text: ` ${trait.text}` }),
          ),
        );
      }
      this.body.appendChild(wrap);
    }
  }
}
