import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export type TurnState = 'yours' | 'waiting' | 'theirs' | 'mulligan';

export interface EndTurnButtonOptions extends BaseOptions {
  /** Whose turn it is. */
  state?: TurnState;
  /** How many cards in hand can still be played. Drives the nudge. */
  playable?: number;
  /** Label when it is your turn and you have nothing left to do. */
  doneLabel?: string;
  /** Label when it is your turn and you still have plays. */
  busyLabel?: string;
  /** Label while the server is resolving your end of turn. */
  waitingLabel?: string;
  /** Label during the opponent's turn. */
  theirsLabel?: string;
  /** Width in pixels. */
  width?: number;
}

/**
 * The end-turn button. Four states, and the difference between them is the
 * whole component: your turn with plays left, your turn with nothing left,
 * waiting on the server, and the opponent's turn.
 *
 *   const end = new EndTurnButton({ state: 'yours', playable: 2 });
 *   end.on('turn:end', () => game.endTurn());
 *   hand.on('change', () => end.setPlayable(hand.playableCount()));
 *
 * `playable` is what makes it useful rather than decorative. With cards you can
 * still play it stays quiet and says "End turn"; at zero it turns gold and says
 * so, which is the single best hint a card game can give a new player — most
 * wasted mana is a player not noticing they had a two-drop left.
 *
 * The opponent's turn is not a disabled button. It is a different, unpressable
 * panel with its own text, because a greyed-out "End turn" invites clicking and
 * a player who clicks it learns nothing about whose turn it is.
 */
export class EndTurnButton extends FuiComponent<EndTurnButtonOptions> {
  private labelEl: HTMLElement;

  constructor(opts: EndTurnButtonOptions = {}) {
    const root = h('button', {
      class: 'fui fui-endturn',
      dataset: { state: opts.state ?? 'yours', nudge: 'off' },
      style: { '--fui-endturn-w': `${opts.width ?? 132}px` },
      attrs: { type: 'button' },
    });
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-endturn__plate', attrs: { 'aria-hidden': 'true' } }));
    root.appendChild(h('span', { class: 'fui-endturn__glow', attrs: { 'aria-hidden': 'true' } }));
    this.labelEl = h('span', { class: 'fui-endturn__label' });
    root.appendChild(this.labelEl);

    root.addEventListener('click', () => {
      if ((this.opts.state ?? 'yours') !== 'yours') return;
      this.emit('turn:end');
    });

    this.paint();
  }

  /** Move to another turn state. */
  setState(state: TurnState): this {
    this.opts.state = state;
    this.paint();
    this.emit('turn:state', state);
    return this;
  }

  /** How many cards in hand can still be played. */
  setPlayable(playable: number): this {
    this.opts.playable = playable;
    this.paint();
    return this;
  }

  private paint(): void {
    const o = this.opts;
    const state = o.state ?? 'yours';
    const nothingLeft = state === 'yours' && (o.playable ?? 0) === 0;

    const label =
      state === 'yours'
        ? nothingLeft
          ? (o.doneLabel ?? 'End turn')
          : (o.busyLabel ?? 'End turn')
        : state === 'waiting'
          ? (o.waitingLabel ?? 'Waiting…')
          : state === 'mulligan'
            ? 'Confirm'
            : (o.theirsLabel ?? 'Enemy turn');

    this.labelEl.textContent = label;
    this.el.dataset.state = state;
    // Gold and nudging only when there is genuinely nothing left to do — most
    // wasted mana is a player not noticing they still had a two-drop.
    this.el.dataset.nudge = nothingLeft ? 'on' : 'off';
    (this.el as HTMLButtonElement).disabled = state === 'theirs' || state === 'waiting';
    this.el.setAttribute(
      'aria-label',
      nothingLeft ? 'End turn — no cards left to play' : label,
    );
  }
}
