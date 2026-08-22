import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear, clamp, duration } from '../core/dom.ts';

export interface CompanionSkill {
  label: string;
  /** Glyph or manifest asset id for the skill. */
  art?: string;
  /** Locked until this bond level. */
  at?: number;
  /** Already unlocked. */
  unlocked?: boolean;
}

export interface CompanionPanelOptions extends BaseOptions {
  /** The companion's name. */
  name: string;
  /** What it is — "Dire Wolf", "Ashen Drake", "Warhorse". */
  species?: string;
  /** Manifest asset id for the portrait. */
  art?: string;
  /** Rarity, which tints the frame. */
  rarity?: Rarity;
  /** Current level. */
  level?: number;
  /** Level cap, for the progress readout. */
  maxLevel?: number;
  /** Bond or loyalty, 0–1. */
  bond?: number;
  /** How fed it is, 0–1. A starving companion stops helping. */
  fullness?: number;
  /** Seconds until it is hungry again. */
  hungryIn?: number;
  /** Stat bonuses it grants while summoned. */
  bonuses?: Array<{ label: string; value: string }>;
  /** What it can do, and at what bond. */
  skills?: CompanionSkill[];
  /** Currently out with the player. */
  summoned?: boolean;
  /** Away on an errand — cannot be summoned until it returns. */
  awayFor?: number;
  /** Label on the feed button. */
  feedLabel?: string;
  /** What feeding costs. */
  feedCost?: string;
}

/**
 * The pet, mount or familiar page: what it is, how it feels about you, what it
 * gives you, and whether it has been fed.
 *
 *   const pet = new CompanionPanel({
 *     name: 'Ashfang', species: 'Dire Wolf', art: 'hunt-dire-wolf', rarity: 'epic',
 *     level: 14, maxLevel: 30, bond: 0.62, fullness: 0.3, hungryIn: 5400,
 *     bonuses: [{ label: 'Attack', value: '+8%' }],
 *     skills: [{ label: 'Rend', at: 1, unlocked: true }, { label: 'Pack Howl', at: 5 }],
 *     summoned: true, feedLabel: 'Feed', feedCost: '2 Rations',
 *   });
 *   pet.on('pet:feed', () => bag.spend('ration'));
 *
 * Hunger is the mechanic this screen lives on, so it is the loudest thing here:
 * a companion below a quarter full says so in the warning colour and its bonus
 * list is struck through, because a bonus that is not currently applying must
 * never read as one that is.
 */
export class CompanionPanel extends FuiComponent<CompanionPanelOptions> {
  private body: HTMLElement;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: CompanionPanelOptions) {
    const root = h('div', {
      class: 'fui fui-pet',
      dataset: { rarity: opts.rarity ?? 'common' },
    });
    super(root, opts);

    this.body = h('div', { class: 'fui-pet__body' });
    root.appendChild(this.body);

    if (opts.hungryIn != null || opts.awayFor != null) {
      this.timer = setInterval(() => this.tick(), 1000);
      this.onDestroy(() => this.stop());
    }
    this.render();
  }

  /** True while the companion is too hungry to give its bonuses. */
  isStarving(): boolean {
    return (this.opts.fullness ?? 1) < 0.25;
  }

  /** True while it is out on an errand. */
  isAway(): boolean {
    return (this.opts.awayFor ?? 0) > 0;
  }

  /** Skills unlocked at the current bond. */
  unlockedSkills(): CompanionSkill[] {
    const level = Math.floor((this.opts.bond ?? 0) * 10);
    return (this.opts.skills ?? []).filter((s) => s.unlocked || (s.at ?? 0) <= level);
  }

  /** Fill it up and redraw. */
  feed(by = 1): this {
    this.opts.fullness = clamp((this.opts.fullness ?? 0) + by, 0, 1);
    this.opts.hungryIn = 6 * 3600;
    this.render();
    this.emit('pet:feed', this.opts.fullness);
    return this;
  }

  /** Send it out or call it back. */
  toggleSummon(): this {
    if (this.isAway()) return this;
    this.opts.summoned = !this.opts.summoned;
    this.render();
    this.emit(this.opts.summoned ? 'pet:summon' : 'pet:dismiss', this.opts.name);
    return this;
  }

  /** Stop the hunger clock. Called on destroy. */
  stop(): this {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    return this;
  }

  private tick(): void {
    let dirty = false;
    if (this.opts.hungryIn != null && this.opts.hungryIn > 0) {
      this.opts.hungryIn -= 1;
      dirty = true;
    }
    if (this.opts.awayFor != null && this.opts.awayFor > 0) {
      this.opts.awayFor -= 1;
      dirty = true;
    }
    if (dirty) this.render();
  }

  private render(): void {
    clear(this.body);
    const { opts } = this;
    const starving = this.isStarving();

    const head = h('div', { class: 'fui-pet__head' });
    const portrait = h('div', { class: 'fui-pet__portrait' });
    const art = h('span', { class: 'fui-pet__art' });
    if (opts.art) art.style.backgroundImage = `var(--fui-img-${opts.art})`;
    portrait.appendChild(art);
    if (opts.level != null) {
      portrait.appendChild(
        h('span', {
          class: 'fui-pet__level fui-num',
          text: opts.maxLevel ? `${opts.level} / ${opts.maxLevel}` : String(opts.level),
        }),
      );
    }
    if (opts.summoned) {
      portrait.appendChild(h('span', { class: 'fui-pet__out', text: 'Out' }));
    }
    head.appendChild(portrait);

    const names = h('div', { class: 'fui-pet__names' });
    names.appendChild(h('h3', { class: 'fui-pet__name fui-title', text: opts.name }));
    if (opts.species) {
      names.appendChild(h('span', { class: 'fui-pet__species', text: opts.species }));
    }

    for (const [label, value, kind] of [
      ['Bond', opts.bond, 'bond'],
      ['Fed', opts.fullness, 'food'],
    ] as Array<[string, number | undefined, string]>) {
      if (value == null) continue;
      const meter = h('div', {
        class: 'fui-pet__meter',
        dataset: { kind, low: String(kind === 'food' && value < 0.25) },
        style: { '--fui-pet-p': clamp(value, 0, 1).toFixed(3) },
      });
      meter.appendChild(h('span', { class: 'fui-pet__meter-label', text: label }));
      const bar = h('span', { class: 'fui-pet__bar' });
      bar.appendChild(h('span', { class: 'fui-pet__fill' }));
      meter.appendChild(bar);
      meter.appendChild(
        h('span', { class: 'fui-pet__meter-value fui-num', text: `${Math.round(value * 100)}%` }),
      );
      names.appendChild(meter);
    }
    head.appendChild(names);
    this.body.appendChild(head);

    // Hunger is the mechanic this screen lives on, so it is the loudest thing
    // on it when it matters.
    if (starving) {
      this.body.appendChild(
        h('p', {
          class: 'fui-pet__warning',
          text: `${opts.name} is too hungry to help. Its bonuses are not applying.`,
        }),
      );
    } else if (opts.hungryIn != null && opts.hungryIn > 0) {
      this.body.appendChild(
        h('p', {
          class: 'fui-pet__timer fui-num',
          text: `Hungry again in ${duration(opts.hungryIn)}`,
        }),
      );
    }

    if (opts.bonuses?.length) {
      const list = h('div', { class: 'fui-pet__bonuses', dataset: { off: String(starving) } });
      for (const bonus of opts.bonuses) {
        const chip = h('span', { class: 'fui-pet__bonus' });
        chip.appendChild(h('span', { class: 'fui-pet__bonus-label', text: bonus.label }));
        chip.appendChild(h('span', { class: 'fui-pet__bonus-value fui-num', text: bonus.value }));
        list.appendChild(chip);
      }
      this.body.appendChild(list);
    }

    if (opts.skills?.length) {
      const skills = h('div', { class: 'fui-pet__skills' });
      const bondLevel = Math.floor((opts.bond ?? 0) * 10);
      for (const skill of opts.skills) {
        const locked = !skill.unlocked && (skill.at ?? 0) > bondLevel;
        const cell = h('div', {
          class: 'fui-pet__skill',
          dataset: { locked: String(locked) },
          attrs: { title: locked ? `Unlocks at bond ${skill.at}` : skill.label },
        });
        const face = h('span', { class: 'fui-pet__skill-art' });
        if (skill.art) face.style.backgroundImage = `var(--fui-img-${skill.art})`;
        cell.appendChild(face);
        cell.appendChild(h('span', { class: 'fui-pet__skill-label', text: skill.label }));
        if (locked) {
          cell.appendChild(
            h('span', { class: 'fui-pet__skill-at fui-num', text: `Bond ${skill.at}` }),
          );
        }
        skills.appendChild(cell);
      }
      this.body.appendChild(skills);
    }

    const actions = h('div', { class: 'fui-pet__actions' });
    if (opts.feedLabel) {
      const feed = h('button', { class: 'fui-pet__feed', attrs: { type: 'button' } });
      feed.appendChild(h('span', { text: opts.feedLabel }));
      if (opts.feedCost) {
        feed.appendChild(h('span', { class: 'fui-pet__feed-cost', text: opts.feedCost }));
      }
      feed.addEventListener('click', () => this.feed());
      actions.appendChild(feed);
    }
    const summon = h('button', {
      class: 'fui-pet__summon',
      // A dead button says why: away and dismissed are different problems.
      text: this.isAway()
        ? `Back in ${duration(opts.awayFor ?? 0)}`
        : opts.summoned
          ? 'Dismiss'
          : 'Summon',
      attrs: { type: 'button', disabled: this.isAway() || undefined },
    });
    summon.addEventListener('click', () => this.toggleSummon());
    actions.appendChild(summon);
    this.body.appendChild(actions);
  }
}
