/**
 * Player intent — resolution, not storage.
 *
 * `GAME_DESIGN_BLUEPRINT.md` C1 and `SYSTEM_DEPENDENCIES.md` §3: `intent[]` is
 * owned by Player intent and **written only by commands**. This module therefore
 * reads intent and returns an order; it never writes it. The write happens in
 * `commands.ts` when `set_priority` is applied.
 *
 * This is the *entire* Stage 2 command surface (`ROADMAP.md` §Stage 2: *"One
 * simple player intent: a priority order between two competing kinds of work.
 * That is the entire command surface at this stage."*).
 *
 * `balanced` attacks the deeper backlog rather than using a fixed tie-break,
 * because `ROADMAP.md` calls Balanced *"the neutral baseline both other settings
 * must beat"* — a fixed order would not be neutral.
 */

import type { Intent } from './intent';
import type { Job, JobId } from './jobs';

export type Priority = 'balanced' | 'maintenance-first' | 'meals-first';

export const PRIORITIES: readonly Priority[] = ['balanced', 'maintenance-first', 'meals-first'];

export const DEFAULT_PRIORITY: Priority = 'balanced';

/** The single id used for the one Stage 2 intent entry. */
export const PRIORITY_INTENT_ID = 'priority';

/** Narrow an unknown value. Invalid values are rejected by the command, not here. */
export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value);
}

/** Build the one intent entry. Used by the command handler and by headless runs. */
export function priorityIntent(value: Priority): Intent {
  return { id: PRIORITY_INTENT_ID, kind: 'priority', value };
}

/** Read the current priority out of state. Absent or malformed means the default. */
export function readPriority(intent: readonly Intent[]): Priority {
  const entry = intent.find((i) => i.id === PRIORITY_INTENT_ID);
  if (entry === undefined || !isPriority(entry.value)) return DEFAULT_PRIORITY;
  return entry.value;
}

/**
 * Resolve intent into the order selection considers jobs in.
 *
 * Phase 0. Jobs reads this at phase 5, which satisfies invariant 19: a phase may
 * read only fields owned by its own or an earlier phase, and intent is phase 0.
 *
 * Ties in `balanced` fall to maintenance-first order, which keeps the choice
 * deterministic rather than dependent on array order.
 */
export function resolvePriority(intent: readonly Intent[], jobs: readonly Job[]): JobId[] {
  const priority = readPriority(intent);
  if (priority === 'maintenance-first') return ['maintenance', 'meals'];
  if (priority === 'meals-first') return ['meals', 'maintenance'];

  const pending = new Map<JobId, number>();
  for (const job of jobs) pending.set(job.id, job.pending);
  return [...jobs]
    .sort((a, b) => {
      const difference = (pending.get(b.id) ?? 0) - (pending.get(a.id) ?? 0);
      if (difference !== 0) return difference;
      return a.id === 'maintenance' ? -1 : 1;
    })
    .map((job) => job.id);
}