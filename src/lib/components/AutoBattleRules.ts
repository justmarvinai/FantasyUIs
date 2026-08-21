import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface RuleOption {
  value: string;
  label: string;
}

export interface BattleRule {
  id: string;
  /** What the rule watches, e.g. `'ally-hp'`. */
  when: string;
  /** Comparison or qualifier, e.g. `'below'`. Optional for rules that need none. */
  test?: string;
  /** The threshold or target, e.g. `'40'`. */
  value?: string;
  /** What it does, e.g. `'skill-2'`. */
  then: string;
  /** Manifest asset id for the ability art. */
  art?: string;
  /** Rule is written but switched off. */
  off?: boolean;
}

export interface AutoBattleRulesOptions extends BaseOptions {
  /** The rules, in the order they fire. */
  rules: BattleRule[];
  /** Conditions offered by the `when` select. */
  conditions: RuleOption[];
  /** Comparisons offered by the `test` select. */
  tests?: RuleOption[];
  /** Actions offered by the `then` select. */
  actions: RuleOption[];
  /** Heading over the list. */
  title?: string;
  /** Sentence under the heading explaining the order rules fire in. */
  hint?: string;
  /** How many rules the player may have. */
  max?: number;
  /** Unit for the threshold field, e.g. `'%'`. */
  unit?: string;
  /** Label on the add button. */
  addLabel?: string;
  /** Line shown when no rules have been written. */
  emptyText?: string;
}

/**
 * The auto-battle rule editor — the "if this, then that" list a player writes
 * once and then trusts to farm for them overnight.
 *
 *   const rules = new AutoBattleRules({
 *     title: 'Auto-battle', max: 6, unit: '%',
 *     hint: 'Rules fire top to bottom. The first one that matches wins.',
 *     conditions: [{ value: 'ally-hp', label: 'An ally’s HP is' }, { value: 'turn', label: 'Turn number is' }],
 *     tests: [{ value: 'below', label: 'below' }, { value: 'above', label: 'above' }],
 *     actions: [{ value: 'skill-2', label: 'Cast Sanctuary' }, { value: 'basic', label: 'Basic attack' }],
 *     rules: [{ id: 'r1', when: 'ally-hp', test: 'below', value: '40', then: 'skill-2' }],
 *   });
 *   rules.on<BattleRule[]>('rules:change', (r) => save(r));
 *
 * Every rule reads as one English sentence across the row, because the thing a
 * player has to verify at a glance is what the rule *says*, not which dropdown
 * holds which half of it. The ordering is the semantics — first match wins — so
 * the row order is stated in the hint rather than left to be discovered.
 */
export class AutoBattleRules extends FuiComponent<AutoBattleRulesOptions> {
  private list: HTMLElement;
  private addBtn: HTMLButtonElement;
  private counter: HTMLElement | null = null;

  constructor(opts: AutoBattleRulesOptions) {
    const root = h('div', { class: 'fui fui-rules' });
    super(root, opts);

    const head = h('div', { class: 'fui-rules__head' });
    if (opts.title) {
      head.appendChild(h('span', { class: 'fui-rules__title fui-title', text: opts.title }));
    }
    if (opts.max != null) {
      this.counter = h('span', { class: 'fui-rules__count fui-num' });
      head.appendChild(this.counter);
    }
    if (head.childNodes.length) root.appendChild(head);

    if (opts.hint) {
      root.appendChild(h('p', { class: 'fui-rules__hint', text: opts.hint }));
    }

    this.list = h('div', { class: 'fui-rules__list' });
    root.appendChild(this.list);

    this.addBtn = h('button', {
      class: 'fui-rules__add',
      text: opts.addLabel ?? 'Add a rule',
      attrs: { type: 'button' },
    });
    this.addBtn.addEventListener('click', () => this.add());
    root.appendChild(this.addBtn);

    this.paint();
  }

  /** The rules as they stand, in firing order. */
  value(): BattleRule[] {
    return this.opts.rules;
  }

  /** True when the player has used every rule slot. */
  isFull(): boolean {
    return this.opts.max != null && this.opts.rules.length >= this.opts.max;
  }

  /** Append a rule, pre-filled with the first option of each select. */
  add(rule?: Partial<BattleRule>): this {
    if (this.isFull()) return this;
    const next: BattleRule = {
      id: rule?.id ?? `rule-${this.opts.rules.length + 1}-${this.opts.rules.length}`,
      when: rule?.when ?? this.opts.conditions[0]?.value ?? '',
      test: rule?.test ?? this.opts.tests?.[0]?.value,
      value: rule?.value ?? '',
      then: rule?.then ?? this.opts.actions[0]?.value ?? '',
      art: rule?.art,
    };
    this.opts.rules = [...this.opts.rules, next];
    this.paint();
    this.emit('rules:change', this.opts.rules);
    return this;
  }

  /** Drop a rule. */
  remove(id: string): this {
    this.opts.rules = this.opts.rules.filter((r) => r.id !== id);
    this.paint();
    this.emit('rules:change', this.opts.rules);
    return this;
  }

  /** Move a rule up or down, which changes which one wins a tie. */
  move(id: string, by: -1 | 1): this {
    const rules = [...this.opts.rules];
    const i = rules.findIndex((r) => r.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= rules.length) return this;
    [rules[i], rules[j]] = [rules[j], rules[i]];
    this.opts.rules = rules;
    this.paint();
    this.emit('rules:change', this.opts.rules);
    return this;
  }

  /** Change one field of one rule. */
  update(id: string, patch: Partial<BattleRule>): this {
    const rule = this.opts.rules.find((r) => r.id === id);
    if (!rule) return this;
    Object.assign(rule, patch);
    this.paint();
    this.emit('rules:change', this.opts.rules);
    return this;
  }

  private select(
    options: RuleOption[],
    value: string | undefined,
    onPick: (v: string) => void,
    label: string,
  ): HTMLElement {
    const sel = h('select', { class: 'fui-rules__select', attrs: { 'aria-label': label } });
    for (const o of options) {
      const opt = h('option', { text: o.label, attrs: { value: o.value } });
      if (o.value === value) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.addEventListener('change', () => onPick(sel.value));
    return sel;
  }

  private paint(): void {
    clear(this.list);

    if (this.opts.rules.length === 0) {
      this.list.appendChild(
        h('p', {
          class: 'fui-rules__empty',
          text: this.opts.emptyText ?? 'No rules yet — the team will just attack.',
        }),
      );
    }

    this.opts.rules.forEach((rule, index) => {
      const row = h('div', { class: 'fui-rules__row', dataset: { id: rule.id } });
      if (rule.off) row.classList.add('is-off');

      row.appendChild(h('span', { class: 'fui-rules__index fui-num', text: String(index + 1) }));

      const sentence = h('div', { class: 'fui-rules__sentence' });
      sentence.appendChild(h('span', { class: 'fui-rules__word', text: 'If' }));
      sentence.appendChild(
        this.select(this.opts.conditions, rule.when, (v) => this.update(rule.id, { when: v }), 'Condition'),
      );
      if (this.opts.tests?.length) {
        sentence.appendChild(
          this.select(this.opts.tests, rule.test, (v) => this.update(rule.id, { test: v }), 'Comparison'),
        );
      }
      const field = h('input', {
        class: 'fui-rules__value fui-num',
        attrs: { type: 'text', inputmode: 'numeric', value: rule.value ?? '', 'aria-label': 'Threshold' },
      });
      field.addEventListener('change', () => this.update(rule.id, { value: field.value }));
      sentence.appendChild(field);
      if (this.opts.unit) {
        sentence.appendChild(h('span', { class: 'fui-rules__unit', text: this.opts.unit }));
      }
      sentence.appendChild(h('span', { class: 'fui-rules__word', text: 'then' }));
      if (rule.art) {
        sentence.appendChild(
          h('span', {
            class: 'fui-rules__art',
            style: { backgroundImage: `var(--fui-img-${rule.art})` },
          }),
        );
      }
      sentence.appendChild(
        this.select(this.opts.actions, rule.then, (v) => this.update(rule.id, { then: v }), 'Action'),
      );
      row.appendChild(sentence);

      const tools = h('div', { class: 'fui-rules__tools' });
      const tool = (cls: string, label: string, run: () => void, disabled?: boolean) => {
        const btn = h('button', {
          class: `fui-rules__tool fui-rules__tool--${cls}`,
          attrs: { type: 'button', 'aria-label': label, title: label, disabled: disabled || undefined },
        });
        btn.addEventListener('click', run);
        return btn;
      };
      tools.append(
        tool('up', 'Move up', () => this.move(rule.id, -1), index === 0),
        tool('down', 'Move down', () => this.move(rule.id, 1), index === this.opts.rules.length - 1),
        tool('off', rule.off ? 'Enable rule' : 'Disable rule', () =>
          this.update(rule.id, { off: !rule.off }),
        ),
        tool('del', 'Delete rule', () => this.remove(rule.id)),
      );
      row.appendChild(tools);
      this.list.appendChild(row);
    });

    if (this.counter && this.opts.max != null) {
      this.counter.textContent = `${this.opts.rules.length} / ${this.opts.max}`;
    }
    this.addBtn.disabled = this.isFull();
    // A dead button with no explanation is the thing this library refuses to
    // ship, so the label carries the reason.
    this.addBtn.textContent = this.isFull()
      ? `All ${this.opts.max} rules used`
      : (this.opts.addLabel ?? 'Add a rule');
  }
}
