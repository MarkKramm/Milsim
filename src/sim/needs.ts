/**
 * Needs — hunger, fatigue, rest, eating, and the refusal ceiling.
 *
 * `GAME_DESIGN_BLUEPRINT.md` B4 and `SYSTEM_DEPENDENCIES.md` §3: Needs owns
 * `persons[].needs` and `persons[].restUntilTick`. Like Personnel, this module
 * never writes a person field directly — it asks `personnel.ts` for a new
 * `Person` and the caller applies it, which is the request pattern in §3.
 *
 * **Two needs, not five.** Hydration, morale and injuries are Stage 6 (B4 §11),
 * and a third need behaving like the first two would be a meter without a
 * consequence. These two differ in kind, which is what makes them both worth
 * having: **fatigue is self-correcting** — given rest it resolves itself — while
 * **hunger depends on a stock** that something else must produce. That asymmetry
 * is why hunger is the thing that can be lost.
 */

import type { Needs, Person } from './personnel';
import { beginRest, createNeeds, endRest, setNeeds } from './personnel';
import type { SimState } from './state';
import { emit } from './events';
import { consume } from './storage';

/** Ticks of work before a fully rested person's fatigue reaches 1 (10 hours). */
export const FATIGUE_RISE_PER_WORK = 1 / 900;

/** Ticks of rest to bring a fully tired person back to 0 (4 hours). */
export const FATIGUE_FALL_PER_REST = 1 / 240;

/** Ticks of not eating before hunger reaches 1 (12 hours). */
export const HUNGER_RISE_PER_TICK = 1 / 210;

/** At or above this, a person takes a rest. Selection ladder rule 2 (B3 §3). */
export const REST_THRESHOLD = 0.5;

/** How long a rest lasts. */
export const REST_DURATION_TICKS = 180;

/** At or above this, a person eats if there is food. */
export const HUNGER_EAT_THRESHOLD = 0.4;

/**
 * At or above this, a person declines work.
 *
 * Ladder step 3 (`LOCKED_DECISIONS.md` D1): *"Declines demanding work"*. It is a
 * threshold on the underlying condition, never on readiness — D1 correction 3 is
 * explicit that the number explains and the conditions rule.
 */
export const DECLINE_THRESHOLD = 0.85;

/** At or above this, work proceeds at a reduced rate. Ladder step 2. */
export const SLOWED_THRESHOLD = 0.7;

/** Work-rate multiplier above `SLOWED_THRESHOLD`. */
export const SLOWDOWN_MULTIPLIER = 0.6;

const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);

/**
 * Threshold-crossing events.
 *
 * Compare the value before and after the change, in the same place the change
 * happens, so no "previous needs" copy has to be stored. Storing one would be a
 * derived duplicate that exists only to make an event fire — exactly the kind of
 * redundant state `ARCHITECTURE.md` §3 refuses.
 */
const CROSSINGS: ReadonlyArray<readonly [number, string, string]> = [
  [REST_THRESHOLD, 'needs_exhaustion', 'tired enough to need rest'],
  [DECLINE_THRESHOLD, 'needs_decline', 'too exhausted to take on work'],
];

/** Fresh needs for a person starting the run. */
export function initialNeeds(): Needs {
  return createNeeds(0.1, 0.1);
}

/** Is this person resting at `tick`? */
export function isResting(person: Person, tick: number): boolean {
  return person.restUntilTick !== null && tick < person.restUntilTick;
}

/**
 * Phase 4 — move hunger and fatigue one tick, and announce any crossing.
 *
 * Fatigue rises only while *working*, so a person standing by does not get worse;
 * that is the mechanical form of "legitimate rest is not idleness"
 * (D1 correction 2). Someone who is merely idle is not resting and recovers at
 * neither rate — they are simply not deteriorating.
 */
export function updateNeeds(draft: SimState, index: number): void {
  const person = draft.personnel[index];
  if (person === undefined) return;

  const wasResting = isResting(person, draft.tick);
  let current = person;
  if (person.restUntilTick !== null && !wasResting) current = endRest(current);

  const working = current.currentTask !== null;
  const resting = isResting(current, draft.tick);

  const hunger = current.needs.hunger + HUNGER_RISE_PER_TICK;
  const fatigue =
    resting
      ? current.needs.fatigue - FATIGUE_FALL_PER_REST
      : working
        ? current.needs.fatigue + FATIGUE_RISE_PER_WORK
        : current.needs.fatigue;

  const before = current.needs.fatigue;
  const next = createNeeds(clamp01(hunger), clamp01(fatigue));
  if (next.hunger !== current.needs.hunger || next.fatigue !== current.needs.fatigue) {
    current = setNeeds(current, next);
    draft.personnel[index] = current;
  }

  // Ladder step 1 and 3: announced once per crossing, not once per tick.
  for (const [threshold, type, why] of CROSSINGS) {
    if (before < threshold && next.fatigue >= threshold) {
      emit(draft, {
        type,
        tier: 'notable',
        subjects: [current.id],
        data: { fatigue: next.fatigue, threshold, why },
      });
    }
  }
}

/**
 * Should this person take a rest now?
 *
 * Selection ladder rule 2 — *recovery* — which B3 §3 places **above** duties.
 * That ordering is why fatigue preempts duty rather than competing with it.
 */
export function shouldRest(person: Person, tick: number): boolean {
  return (
    !isResting(person, tick) && person.currentTask === null && person.needs.fatigue >= REST_THRESHOLD
  );
}

/** Put a person into recovery for `REST_DURATION_TICKS`. */
export function beginRecovery(person: Person, tick: number): Person {
  return beginRest(person, tick + REST_DURATION_TICKS);
}

/** Ladder step 3 — too exhausted to take on work, but not too tired to eat. */
export function isTooExhaustedToWork(person: Person): boolean {
  return person.needs.fatigue >= DECLINE_THRESHOLD;
}

/** Work rate multiplier from fatigue. Ladder step 2. */
export function workRate(person: Person): number {
  return person.needs.fatigue >= SLOWED_THRESHOLD ? SLOWDOWN_MULTIPLIER : 1;
}

export function wantsFood(person: Person): boolean {
  return person.needs.hunger >= HUNGER_EAT_THRESHOLD;
}

/**
 * Eat one meal, if one is available.
 *
 * The larder being empty is the Stage 3 consequence the gate is about: the person
 * stays hungry, stands by, and the roster says *why*. An exhausted person still
 * eats — refusing work must not mean refusing everything, or the two needs would
 * collapse into one.
 *
 * **The refusal is reported once per hunger cycle, not once per tick.** An
 * earlier version emitted `no_food_available` whenever the attempt failed, which
 * under a sustained shortage meant seven events per tick — a five-day run
 * produced hundreds of thousands of log entries and the suite crawled. The
 * check below derives "just became hungry" from the values already present
 * rather than storing a flag to remember it.
 *
 * @returns true if a meal was eaten.
 */
export function tryEat(draft: SimState, index: number): boolean {
  const person = draft.personnel[index];
  if (person === undefined) return false;

  const result = consume(draft.storage, 'food', 1);
  if (!result.ok) {
    const justBecameHungry =
      person.needs.hunger < HUNGER_EAT_THRESHOLD + HUNGER_RISE_PER_TICK;
    if (justBecameHungry) {
      emit(draft, {
        type: 'no_food_available',
        tier: 'notable',
        subjects: [person.id],
        data: { food: draft.storage.food, reason: result.reason ?? 'larder empty' },
      });
    }
    return false;
  }

  draft.storage = result.storage;
  draft.personnel[index] = setNeeds(person, createNeeds(0, person.needs.fatigue));
  emit(draft, { type: 'meal_eaten', tier: 'routine', subjects: [person.id], data: {} });
  return true;
}