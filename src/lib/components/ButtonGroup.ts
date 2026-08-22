import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, append, type Child } from '../core/dom.ts';

export interface ButtonGroupOptions extends BaseOptions {
  /** The buttons. Pass `.el` from any button component, or raw elements. */
  buttons?: Child | Child[];
  /** Lay them out down the screen instead of across it. */
  vertical?: boolean;
  /** How tightly they sit. `joined` butts them into one bar. */
  gap?: 'joined' | 'tight' | 'loose';
  /** Stretch every button to share the width evenly. */
  fill?: boolean;
  /** Which end the group hugs. */
  align?: 'start' | 'center' | 'end' | 'between';
  /** Accessible group label, e.g. `'Battle actions'`. */
  label?: string;
  /** Wrap onto a second row rather than overflowing. */
  wrap?: boolean;
}

/**
 * Puts buttons in a row and makes them behave as one control: a dialog's
 * Cancel / Confirm pair, a battle HUD's action bar, a shop's quantity picker.
 *
 *   const footer = new ButtonGroup({
 *     label: 'Confirm sale', gap: 'tight', align: 'end',
 *     buttons: [new Button({ label: 'Cancel', variant: 'ghost' }).el,
 *               new CostButton({ label: 'Sell', cost: 240, currencyGlyph: 'glyph-trophy-cup' }).el],
 *   });
 *
 * `fill` is what a dialog footer wants and a toolbar does not: it makes every
 * button share the width evenly, so a two-word label and a six-word one still
 * produce a symmetrical pair. `joined` butts them into a single bar with the
 * inner corners squared off, which is the shape a segmented action bar needs
 * without pretending to be `SegmentedControl` — these are still independent
 * buttons, each with its own handler and its own disabled state.
 *
 * The group is a `role="group"` rather than a toolbar: a toolbar promises arrow
 * -key roving focus, and claiming that without implementing it is worse for a
 * screen-reader user than claiming nothing.
 */
export class ButtonGroup extends FuiComponent<ButtonGroupOptions> {
  constructor(opts: ButtonGroupOptions = {}) {
    const root = h('div', {
      class: 'fui fui-btngroup',
      dataset: {
        axis: opts.vertical ? 'y' : 'x',
        gap: opts.gap ?? 'tight',
        fill: opts.fill ? 'on' : 'off',
        align: opts.align ?? 'start',
        wrap: opts.wrap ? 'on' : 'off',
      },
      attrs: { role: 'group', 'aria-label': opts.label },
    });
    super(root, opts);
    if (opts.buttons) this.add(opts.buttons as Child | Child[]);
  }

  /** Append one or more buttons. Accepts a single child or an array of them. */
  add(...buttons: Array<Child | Child[]>): this {
    for (const item of buttons) append(this.el, ...(Array.isArray(item) ? item : [item]));
    return this;
  }

  /** Empty the group. */
  clear(): this {
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild);
    return this;
  }
}
