import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, commas } from '../core/dom.ts';

export interface PartyRole {
  /** Role name — Tank, Healer, DPS, Support. */
  label: string;
  /** Glyph asset id for the role marker. */
  glyph?: string;
  color?: string;
  /** How many of this role the group wants. */
  need: number;
  /** How many are already in. */
  filled?: number;
}

export interface PartyListing {
  id: string;
  /** What the group is running. */
  title: string;
  /** Difficulty, wing, or any short qualifier. */
  note?: string;
  /** Who put the group up. */
  leader?: string;
  /** Avatar asset id for the leader. */
  art?: string;
  /** Minimum power the group is asking for. */
  requirement?: number;
  /** The roles and how full each is. */
  roles: PartyRole[];
  /** Seconds since the group was listed. */
  age?: number;
  /** The player already applied. */
  applied?: boolean;
  /** Voice chat required. */
  voice?: boolean;
}

export interface PartyFinderOptions extends BaseOptions {
  /** The groups currently looking. */
  listings: PartyListing[];
  /** Heading over the list. */
  title?: string;
  /** The player's power, used to flag groups they cannot join. */
  power?: number;
  /** Roles the player can fill. A group with none of them is dimmed. */
  canPlay?: string[];
  /** Cap the height in pixels (or any CSS length) and scroll inside. */
  maxHeight?: number | string;
  /** Label on the create-group button. Omit to hide it. */
  createLabel?: string;
  /** Line shown when nobody is listed. */
  emptyText?: string;
}

/**
 * The group finder — who is running what, which slots are still open, and
 * whether you are what they are missing.
 *
 *   const lfg = new PartyFinder({
 *     title: 'Looking for group', power: 148_000, canPlay: ['Healer', 'Support'],
 *     listings: [{
 *       id: 'g1', title: 'Sunken Vault', note: 'Nightmare', leader: 'Rhogar',
 *       requirement: 140_000, voice: true,
 *       roles: [{ label: 'Tank', need: 1, filled: 1 }, { label: 'Healer', need: 2, filled: 1 }],
 *     }],
 *   });
 *   lfg.on<string>('party:apply', (id) => queue.join(id));
 *
 * The pips are the whole point: a group is scanned by which slots are still
 * empty, not by reading its title. A slot the player can actually fill is drawn
 * differently from one they cannot, so the answer to "is this for me" arrives
 * before the text does.
 */
export class PartyFinder extends FuiComponent<PartyFinderOptions> {
  private list: HTMLElement;

  constructor(opts: PartyFinderOptions) {
    const root = h('div', { class: 'fui fui-lfg' });
    super(root, opts);

    if (opts.title || opts.createLabel) {
      const head = h('div', { class: 'fui-lfg__head' });
      if (opts.title) {
        head.appendChild(h('span', { class: 'fui-lfg__title fui-title', text: opts.title }));
      }
      if (opts.createLabel) {
        const make = h('button', {
          class: 'fui-lfg__create',
          text: opts.createLabel,
          attrs: { type: 'button' },
        });
        make.addEventListener('click', () => this.emit('party:create'));
        head.appendChild(make);
      }
      root.appendChild(head);
    }

    this.list = h('div', {
      class: 'fui-lfg__list fui-scroll',
      style:
        opts.maxHeight != null
          ? { maxHeight: typeof opts.maxHeight === 'number' ? `${opts.maxHeight}px` : opts.maxHeight }
          : {},
    });
    root.appendChild(this.list);
    this.paint();
  }

  /** Replace the listings. */
  setListings(listings: PartyListing[]): this {
    this.opts.listings = listings;
    this.paint();
    return this;
  }

  /** Roles a group still needs that the player can actually fill. */
  matchingRoles(listing: PartyListing): PartyRole[] {
    const mine = this.opts.canPlay;
    return listing.roles.filter(
      (r) => (r.filled ?? 0) < r.need && (!mine || mine.includes(r.label)),
    );
  }

  /** True when the player meets the group's power requirement. */
  meets(listing: PartyListing): boolean {
    return (
      listing.requirement == null || this.opts.power == null || this.opts.power >= listing.requirement
    );
  }

  private paint(): void {
    clear(this.list);

    if (this.opts.listings.length === 0) {
      this.list.appendChild(
        h('p', {
          class: 'fui-lfg__empty',
          text: this.opts.emptyText ?? 'Nobody is looking right now. Start a group?',
        }),
      );
      return;
    }

    for (const listing of this.opts.listings) {
      const matches = this.matchingRoles(listing);
      const open = listing.roles.some((r) => (r.filled ?? 0) < r.need);
      const meets = this.meets(listing);

      const card = h('article', {
        class: 'fui-lfg__row',
        dataset: {
          state: !open ? 'full' : !meets ? 'blocked' : matches.length ? 'match' : 'open',
        },
      });

      const art = h('span', { class: 'fui-lfg__art' });
      if (listing.art) art.style.backgroundImage = `var(--fui-img-${listing.art})`;
      card.appendChild(art);

      const text = h('div', { class: 'fui-lfg__text' });
      const line = h('div', { class: 'fui-lfg__line' });
      line.appendChild(h('span', { class: 'fui-lfg__name', text: listing.title }));
      if (listing.note) {
        line.appendChild(h('span', { class: 'fui-lfg__note', text: listing.note }));
      }
      if (listing.voice) {
        line.appendChild(h('span', { class: 'fui-lfg__tag', text: 'Voice' }));
      }
      text.appendChild(line);

      const meta: string[] = [];
      if (listing.leader) meta.push(listing.leader);
      if (listing.requirement != null) meta.push(`${commas(listing.requirement)} power`);
      if (listing.age != null) meta.push(`${Math.round(listing.age / 60)}m ago`);
      if (meta.length) {
        text.appendChild(h('span', { class: 'fui-lfg__meta', text: meta.join(' · ') }));
      }
      card.appendChild(text);

      // Each role is a run of pips: filled, then still-needed, and a needed one
      // the player could take is called out rather than left to be counted.
      const roles = h('div', { class: 'fui-lfg__roles' });
      for (const role of listing.roles) {
        const group = h('span', {
          class: 'fui-lfg__role',
          style: role.color ? { '--fui-lfg-ink': role.color } : {},
          attrs: { title: `${role.label} ${role.filled ?? 0}/${role.need}` },
        });
        if (role.glyph) {
          group.appendChild(
            h('span', {
              class: 'fui-lfg__role-glyph',
              style: { '--fui-glyph-src': `var(--fui-img-${role.glyph})` },
            }),
          );
        } else {
          group.appendChild(h('span', { class: 'fui-lfg__role-label', text: role.label.slice(0, 1) }));
        }
        const pips = h('span', { class: 'fui-lfg__pips' });
        const canFill = !this.opts.canPlay || this.opts.canPlay.includes(role.label);
        for (let i = 0; i < role.need; i++) {
          const pip = h('span', { class: 'fui-lfg__pip' });
          if (i < (role.filled ?? 0)) pip.classList.add('is-filled');
          else if (canFill && meets) pip.classList.add('is-yours');
          pips.appendChild(pip);
        }
        group.appendChild(pips);
        roles.appendChild(group);
      }
      card.appendChild(roles);

      const apply = h('button', {
        class: 'fui-lfg__apply',
        // The button carries the reason it is dead — a full group and an
        // under-geared player are different problems with different fixes.
        text: listing.applied
          ? 'Applied'
          : !open
            ? 'Full'
            : !meets
              ? 'Power too low'
              : 'Apply',
        attrs: {
          type: 'button',
          disabled: listing.applied || !open || !meets || undefined,
          title:
            !meets && listing.requirement != null
              ? `Needs ${commas(listing.requirement - (this.opts.power ?? 0))} more power`
              : undefined,
        },
      });
      apply.addEventListener('click', () => this.emit('party:apply', listing.id));
      card.appendChild(apply);

      this.list.appendChild(card);
    }
  }
}
