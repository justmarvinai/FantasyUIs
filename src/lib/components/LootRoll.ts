import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clamp, clear } from '../core/dom.ts';

export type RollChoice = 'need' | 'greed' | 'pass';

export interface RollParticipant {
  id: string;
  name: string;
  /** Avatar asset id. */
  art?: string;
  /** What they picked. Undefined means still deciding. */
  choice?: RollChoice;
  /** Their rolled number, once revealed. */
  roll?: number;
  /** Marks the winner once the roll resolves. */
  winner?: boolean;
}

export interface LootRollOptions extends BaseOptions {
  /** The item being rolled for. */
  itemName: string;
  /** Manifest asset id for the item art. */
  itemArt?: string;
  itemRarity?: Rarity;
  /** Stat line under the name. */
  itemNote?: string;
  /** Seconds to decide. Counts down on its own. */
  seconds?: number;
  /** Everyone in the roll, including the local player. */
  participants?: RollParticipant[];
  /** The local player's pick, if already made. */
  choice?: RollChoice;
  /** Hide the Need button when the item is unusable by this class. */
  canNeed?: boolean;
}

const CHOICE_LABEL: Record<RollChoice, string> = {
  need: 'Need',
  greed: 'Greed',
  pass: 'Pass',
};

/**
 * The group loot roll — Need, Greed or Pass on a timer, with everyone else's
 * pick appearing as they commit. The classic party-RPG moment `LootWindow`
 * does not cover, because that one is a solo pickup.
 *
 *   const roll = new LootRoll({
 *     itemName: 'Bloodforged Cuirass',
 *     itemArt: 'weapon-warhammer', itemRarity: 'legendary',
 *     itemNote: 'Plate chest · +48% ATK',
 *     seconds: 30, canNeed: true,
 *     participants: [
 *       { id: 'a', name: 'Rhogar', art: 'tech-mech-suit', choice: 'need' },
 *       { id: 'b', name: 'Nell', art: 'fire-phoenix-rise' },
 *     ],
 *   });
 *   roll.on<RollChoice>('roll:choose', (choice) => socket.send(choice));
 *   roll.reveal([{ id: 'a', name: 'Rhogar', choice: 'need', roll: 84, winner: true }]);
 *
 * The countdown owns its interval and clears it on `destroy()`, and choosing
 * stops it early — a resolved roll never keeps ticking in the background.
 */
export class LootRoll extends FuiComponent<LootRollOptions> {
  private remaining: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private bar: HTMLElement | null = null;
  private timeEl: HTMLElement | null = null;
  private buttons = new Map<RollChoice, HTMLButtonElement>();
  private list: HTMLElement;
  private participants: RollParticipant[];
  private choice: RollChoice | null;

  constructor(opts: LootRollOptions) {
    const root = h('div', {
      class: 'fui fui-roll',
      dataset: { rarity: opts.itemRarity ?? 'rare' },
    });
    super(root, opts);
    this.remaining = opts.seconds ?? 0;
    this.participants = [...(opts.participants ?? [])];
    this.choice = opts.choice ?? null;

    // ── Item ──────────────────────────────────────────────────────────────
    const head = h('div', { class: 'fui-roll__head' });
    const art = h('span', { class: 'fui-roll__art' });
    if (opts.itemArt) art.style.backgroundImage = `var(--fui-img-${opts.itemArt})`;
    head.appendChild(art);

    const info = h('div', { class: 'fui-roll__info' });
    info.appendChild(h('span', { class: 'fui-roll__name fui-title', text: opts.itemName }));
    if (opts.itemNote) info.appendChild(h('span', { class: 'fui-roll__note', text: opts.itemNote }));
    head.appendChild(info);
    root.appendChild(head);

    // ── Timer ─────────────────────────────────────────────────────────────
    if (opts.seconds) {
      this.bar = h('span', { class: 'fui-roll__timer-fill' });
      this.timeEl = h('span', { class: 'fui-roll__timer-text fui-num' });
      root.appendChild(h('div', { class: 'fui-roll__timer' }, this.bar, this.timeEl));
      this.timer = setInterval(() => this.tick(), 1000);
      this.onDestroy(() => this.stop());
      this.tick(false);
    }

    // ── Choices ───────────────────────────────────────────────────────────
    const choices = h('div', { class: 'fui-roll__choices' });
    const options: RollChoice[] = opts.canNeed === false ? ['greed', 'pass'] : ['need', 'greed', 'pass'];
    for (const choice of options) {
      const btn = h('button', {
        class: 'fui-roll__choice',
        dataset: { choice },
        text: CHOICE_LABEL[choice],
        attrs: { type: 'button' },
      });
      btn.addEventListener('click', () => this.choose(choice));
      this.buttons.set(choice, btn);
      choices.appendChild(btn);
    }
    root.appendChild(choices);

    // ── Participants ──────────────────────────────────────────────────────
    this.list = h('div', { class: 'fui-roll__party' });
    root.appendChild(this.list);
    this.renderParty();
    this.paintChoice();
  }

  /** Commit the local player's pick. Stops the countdown. */
  choose(choice: RollChoice): this {
    if (this.choice) return this;
    this.choice = choice;
    this.stop();
    this.paintChoice();
    this.emit('roll:choose', choice);
    return this;
  }

  /** The local player's pick, or null while still deciding. */
  getChoice(): RollChoice | null {
    return this.choice;
  }

  /** Show everyone's numbers once the server has resolved the roll. */
  reveal(participants: RollParticipant[]): this {
    this.participants = [...participants];
    this.stop();
    this.el.classList.add('is-resolved');
    this.renderParty();
    const winner = participants.find((p) => p.winner);
    if (winner) this.emit('roll:resolved', winner);
    return this;
  }

  /** Stop the countdown early. Called on choose, reveal and destroy. */
  stop(): this {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    return this;
  }

  private tick(advance = true): void {
    if (advance && this.remaining > 0) this.remaining -= 1;
    const total = this.opts.seconds ?? 1;
    const pct = clamp(this.remaining / total, 0, 1);
    if (this.bar) this.bar.style.width = `${(pct * 100).toFixed(1)}%`;
    if (this.timeEl) this.timeEl.textContent = `${this.remaining}s`;
    this.el.classList.toggle('is-urgent', this.remaining > 0 && this.remaining <= 5);
    if (advance && this.remaining <= 0) {
      this.stop();
      // Not choosing is a pass — the same thing every party game does when the
      // timer runs out.
      if (!this.choice) {
        this.choice = 'pass';
        this.paintChoice();
      }
      this.emit('roll:expired');
    }
  }

  private paintChoice(): void {
    for (const [choice, btn] of this.buttons) {
      btn.classList.toggle('is-on', this.choice === choice);
      btn.disabled = this.choice != null;
    }
    this.el.classList.toggle('is-chosen', this.choice != null);
  }

  private renderParty(): void {
    clear(this.list);
    for (const p of this.participants) {
      const row = h('div', {
        class: 'fui-roll__member',
        dataset: { choice: p.choice ?? 'waiting' },
      });
      if (p.winner) row.classList.add('is-winner');

      const avatar = h('span', { class: 'fui-roll__avatar' });
      if (p.art) avatar.style.backgroundImage = `var(--fui-img-${p.art})`;
      row.appendChild(avatar);
      row.appendChild(h('span', { class: 'fui-roll__member-name', text: p.name }));

      if (p.roll != null) {
        row.appendChild(h('span', { class: 'fui-roll__number fui-num', text: String(p.roll) }));
      }
      row.appendChild(
        h('span', {
          class: 'fui-roll__member-choice',
          text: p.choice ? CHOICE_LABEL[p.choice] : '…',
        }),
      );
      this.list.appendChild(row);
    }
  }
}
