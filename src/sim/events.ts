/**
 * The event log.
 *
 * `ARCHITECTURE.md` §6 and `SYSTEM_DEPENDENCIES.md` §2: `state.log` is the single
 * authoritative history. There is no second channel — the UI reads the tail of
 * this log rather than receiving events by another route, which is what makes
 * "the report is accurate" true by construction instead of by discipline.
 *
 * Events are appended, never mutated. Append-only is what makes replay and
 * causal explanation possible later without rewriting the simulation.
 */

import type { SimState } from './state';

/**
 * Significance, assigned at write time by an explicit rule rather than by
 * ad-hoc judgement scattered through the simulation (`ARCHITECTURE.md` §6.1).
 *
 * Stage 1 emits only `routine`, and that is the intent: an unstructured log
 * becomes an unreadable wall within days.
 */
export type EventTier = 'routine' | 'notable' | 'critical';

export interface Event {
  /** Sequential, never reused. Causal references point at these. */
  id: number;
  /** The tick this event belongs to, after the clock advanced. */
  tick: number;
  type: string;
  tier: EventTier;
  /** Person / job / facility / item ids this is about. Empty at Stage 1. */
  subjects: string[];
  /** Event ids that caused this one. Invariant 6: must exist and be earlier. */
  causeEventIds: number[];
  data: Record<string, unknown>;
}

/** The one event Stage 1 produces. */
export const DAY_ROLLOVER = 'day_rollover';

export interface EmitInput {
  type: string;
  tier: EventTier;
  subjects?: string[];
  causeEventIds?: number[];
  data?: Record<string, unknown>;
}

/**
 * Append an event to the draft's log.
 *
 * Only the Events system writes `log[]` and `nextEventId`
 * (`SYSTEM_DEPENDENCIES.md` §3). Keeping the increment inside this one function
 * is what makes "IDs are sequential" true by construction rather than by every
 * call site remembering to do it.
 */
export function emit(draft: SimState, input: EmitInput): Event {
  const event: Event = {
    id: draft.nextEventId,
    tick: draft.tick,
    type: input.type,
    tier: input.tier,
    subjects: input.subjects ?? [],
    causeEventIds: input.causeEventIds ?? [],
    data: input.data ?? {},
  };
  draft.log.push(event);
  draft.nextEventId += 1;
  return event;
}

/**
 * Invariant 6, as a function so tests and future code share one definition:
 * every cause id must exist and must not come from a later tick.
 */
export function causalReferencesAreValid(log: Event[]): boolean {
  const byId = new Map<number, Event>();
  for (const event of log) byId.set(event.id, event);

  for (const event of log) {
    for (const causeId of event.causeEventIds) {
      const cause = byId.get(causeId);
      if (cause === undefined) return false;
      if (cause.tick > event.tick) return false;
      // Same tick is allowed: events are appended as they happen, so a later
      // event in the same tick may legitimately cite an earlier one.
    }
  }
  return true;
}

/** Count events by tier. Used by the headless summary and the daily report later. */
export function countByTier(log: Event[]): Record<EventTier, number> {
  const counts: Record<EventTier, number> = { routine: 0, notable: 0, critical: 0 };
  for (const event of log) counts[event.tier] += 1;
  return counts;
}