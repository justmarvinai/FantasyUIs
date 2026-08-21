import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear, clamp, duration } from '../core/dom.ts';

export interface CraftJob {
  id: string;
  name: string;
  /** Manifest asset id for the item being made. */
  art?: string;
  rarity?: Rarity;
  /** How many this job produces. */
  qty?: number;
  /** Seconds the job takes in total. */
  total: number;
  /** Seconds already elapsed. */
  elapsed?: number;
  /** Finished and waiting to be collected. */
  done?: boolean;
}

export interface CraftingQueueOptions extends BaseOptions {
  /** Jobs in the order they will run. The first one is the one that ticks. */
  jobs: CraftJob[];
  /** Heading over the queue. */
  title?: string;
  /** Slots available. Extra slots draw as empty and invite a new job. */
  slots?: number;
  /** How many jobs run at once. The rest wait. */
  parallel?: number;
  /** Offer the "finish now" button and price it like this. */
  rushCost?: (secondsLeft: number) => string;
  /** Run the clock. Off in a static render or a paused screen. */
  running?: boolean;
  /** Line shown when the queue and its slots are both empty. */
  emptyText?: string;
}

/**
 * The forge's work order — several timed crafts queued up, one (or a few)
 * running, the rest waiting their turn. `CraftingPanel` is where a recipe is
 * chosen; this is what happens after you press Craft.
 *
 *   const forge = new CraftingQueue({
 *     title: 'Forge', slots: 4, parallel: 1, running: true,
 *     rushCost: (left) => `${Math.ceil(left / 60)} gems`,
 *     jobs: [{ id: 'j1', name: 'Runeblade', art: 'weapon-runeblade', rarity: 'epic', total: 5400, elapsed: 900 }],
 *   });
 *   forge.on<string>('craft:collect', (id) => bag.add(id));
 *
 * One interval drives the whole queue, not one per job, and it stops itself the
 * moment nothing is still running — a forge screen left open overnight should
 * not be a timer leak. A finished job stays in its slot until collected,
 * because "where did my sword go" is not a question a crafting UI should raise.
 */
export class CraftingQueue extends FuiComponent<CraftingQueueOptions> {
  private list: HTMLElement;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: CraftingQueueOptions) {
    const root = h('div', { class: 'fui fui-craftq' });
    super(root, opts);

    if (opts.title) {
      const head = h('div', { class: 'fui-craftq__head' });
      head.appendChild(h('span', { class: 'fui-craftq__title fui-title', text: opts.title }));
      if (opts.slots != null) {
        head.appendChild(
          h('span', {
            class: 'fui-craftq__count fui-num',
            text: `${Math.min(opts.jobs.length, opts.slots)} / ${opts.slots}`,
          }),
        );
      }
      root.appendChild(head);
    }

    this.list = h('div', { class: 'fui-craftq__list' });
    root.appendChild(this.list);

    if (opts.running ?? true) this.start();
    this.onDestroy(() => this.stop());
    this.paint();
  }

  /** Jobs that are still counting down. */
  activeJobs(): CraftJob[] {
    const parallel = this.opts.parallel ?? 1;
    return this.opts.jobs.filter((j) => !j.done).slice(0, parallel);
  }

  /** Seconds until every queued job has finished. */
  totalRemaining(): number {
    const parallel = Math.max(1, this.opts.parallel ?? 1);
    const left = this.opts.jobs
      .filter((j) => !j.done)
      .map((j) => Math.max(0, j.total - (j.elapsed ?? 0)));
    // With N lanes the queue finishes when the busiest lane does, so pour the
    // jobs into lanes shortest-first rather than summing them.
    const lanes = new Array(parallel).fill(0);
    for (const secs of left) {
      const i = lanes.indexOf(Math.min(...lanes));
      lanes[i] += secs;
    }
    return Math.max(0, ...lanes);
  }

  /** Start the clock. */
  start(): this {
    if (this.timer) return this;
    this.timer = setInterval(() => this.tick(), 1000);
    return this;
  }

  /** Stop the clock. Called on destroy and whenever the queue goes idle. */
  stop(): this {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    return this;
  }

  /** Take a finished job out of its slot. */
  collect(id: string): this {
    const job = this.opts.jobs.find((j) => j.id === id);
    if (!job || !job.done) return this;
    this.opts.jobs = this.opts.jobs.filter((j) => j.id !== id);
    this.paint();
    this.start();
    this.emit('craft:collect', id);
    return this;
  }

  /** Finish a job immediately — what the rush button spends gems on. */
  rush(id: string): this {
    const job = this.opts.jobs.find((j) => j.id === id);
    if (!job || job.done) return this;
    job.elapsed = job.total;
    job.done = true;
    this.paint();
    this.emit('craft:done', id);
    return this;
  }

  /** Add a job to the back of the queue. */
  enqueue(job: CraftJob): this {
    this.opts.jobs = [...this.opts.jobs, job];
    this.paint();
    this.start();
    this.emit('craft:queue', job.id);
    return this;
  }

  private tick(): void {
    const active = this.activeJobs();
    if (active.length === 0) {
      // Nothing left to count. An idle queue keeps no timer.
      this.stop();
      return;
    }
    for (const job of active) {
      job.elapsed = Math.min(job.total, (job.elapsed ?? 0) + 1);
      if (job.elapsed >= job.total && !job.done) {
        job.done = true;
        this.emit('craft:done', job.id);
      }
    }
    this.paint();
  }

  private paint(): void {
    clear(this.list);
    const parallel = this.opts.parallel ?? 1;
    const slots = this.opts.slots ?? this.opts.jobs.length;

    if (this.opts.jobs.length === 0 && slots === 0) {
      this.list.appendChild(
        h('p', {
          class: 'fui-craftq__empty',
          text: this.opts.emptyText ?? 'The forge is cold. Pick a recipe to start.',
        }),
      );
      return;
    }

    for (let i = 0; i < Math.max(slots, this.opts.jobs.length); i++) {
      const job = this.opts.jobs[i];
      if (!job) {
        const slot = h('button', {
          class: 'fui-craftq__slot is-empty',
          attrs: { type: 'button', 'aria-label': 'Start a craft' },
        });
        slot.appendChild(h('span', { class: 'fui-craftq__plus', text: '+' }));
        slot.appendChild(h('span', { class: 'fui-craftq__slot-label', text: 'Empty slot' }));
        slot.addEventListener('click', () => this.emit('craft:add', i));
        this.list.appendChild(slot);
        continue;
      }

      const elapsed = clamp(job.elapsed ?? 0, 0, job.total);
      const left = Math.max(0, job.total - elapsed);
      const running = i < parallel && !job.done;
      const row = h('div', {
        class: 'fui-craftq__slot',
        dataset: {
          rarity: job.rarity ?? 'common',
          state: job.done ? 'done' : running ? 'running' : 'waiting',
        },
        style: { '--fui-craftq-p': (job.total ? elapsed / job.total : 1).toFixed(4) },
      });

      const art = h('span', { class: 'fui-craftq__art' });
      if (job.art) art.style.backgroundImage = `var(--fui-img-${job.art})`;
      if (job.qty != null && job.qty > 1) {
        art.appendChild(h('span', { class: 'fui-craftq__qty fui-num', text: `×${job.qty}` }));
      }
      row.appendChild(art);

      const text = h('div', { class: 'fui-craftq__text' });
      text.appendChild(h('span', { class: 'fui-craftq__name', text: job.name }));
      text.appendChild(
        h('span', {
          class: 'fui-craftq__status fui-num',
          text: job.done ? 'Ready' : running ? `${duration(left)} left` : 'Queued',
        }),
      );
      const bar = h('span', { class: 'fui-craftq__bar' });
      bar.appendChild(h('span', { class: 'fui-craftq__fill' }));
      text.appendChild(bar);
      row.appendChild(text);

      if (job.done) {
        const collect = h('button', {
          class: 'fui-craftq__act fui-craftq__act--collect',
          text: 'Collect',
          attrs: { type: 'button' },
        });
        collect.addEventListener('click', () => this.collect(job.id));
        row.appendChild(collect);
      } else if (running && this.opts.rushCost) {
        const rush = h('button', {
          class: 'fui-craftq__act fui-craftq__act--rush',
          text: this.opts.rushCost(left),
          attrs: { type: 'button', title: 'Finish now' },
        });
        rush.addEventListener('click', () => this.emit('craft:rush', job.id));
        row.appendChild(rush);
      } else {
        const cancel = h('button', {
          class: 'fui-craftq__act fui-craftq__act--cancel',
          text: '×',
          attrs: { type: 'button', 'aria-label': `Cancel ${job.name}` },
        });
        cancel.addEventListener('click', () => this.emit('craft:cancel', job.id));
        row.appendChild(cancel);
      }
      this.list.appendChild(row);
    }
  }
}
