/**
 * Readiness — an explanatory summary, and nothing else.
 *
 * `LOCKED_DECISIONS.md` D1 is unusually explicit about this, twice:
 *
 * > **Readiness is an explanatory summary only.** It is never read by any other
 * > system and never causes anything.
 *
 * and invariant 12 (`SYSTEM_DEPENDENCIES.md` §8) says the same thing in testable
 * form: *"No system reads `state.readiness` except the UI."*
 *
 * That is why `readiness` does **not** appear in `SimState`. There is no field to
 * read, so no system can come to depend on it, and it can be removed at any time
 * without touching the world. Every consequence in Stage 3 triggers on `fatigue`
 * or `hunger`; this module exists so the player can see several conditions
 * stacking up and ask why.
 */

import type { Person } from './personnel';
import type { Needs } from './personnel';
import {
  DECLINE_THRESHOLD,
  HUNGER_EAT_THRESHOLD,
  REST_THRESHOLD,
} from './needs';

/** How much of a person readiness reflects. Equal by design — see below. */
const WEIGHT = 0.5;

/**
 * One person's condition: 1 when fed and rested, 0 when both are spent.
 */
export function conditionOf(needs: Needs): number {
  return 1 - (WEIGHT * needs.hunger + WEIGHT * needs.fatigue);
}

/**
 * Base readiness in [0, 1] — the mean condition of the workforce.
 *
 * **Q21 is open** (`OPEN_QUESTIONS.md`): does readiness add anything beyond
 * hunger and fatigue, or should it be cut? This function exists so Stage 3 can
 * *answer* that by observation rather than by argument. If it turns out to be a
 * restatement, deleting this module changes nothing about the world — that is the
 * property D1 asked for.
 */
export function baseReadiness(persons: readonly Person[]): number {
  if (persons.length === 0) return 1;
  let total = 0;
  for (const person of persons) total += conditionOf(person.needs);
  return total / persons.length;
}

/**
 * What to tell the player, in words, about why readiness is what it is.
 *
 * **Thresholds come from the model's own constants, never from a literal.**
 * An earlier version hard-coded `0.5` for both hunger and fatigue, which was
 * wrong twice over: it did not match `HUNGER_EAT_THRESHOLD` (0.4), so a person
 * who was *eating a meal* was not counted as hungry and the card could read
 * "everyone fed and rested" while someone ate — observed happening at tick 4,314
 * of a real run — and it did not consult `restUntilTick` at all, so the same
 * text appeared while people were asleep.
 *
 * Someone who is asleep is by definition not yet rested. The wording must never
 * assert otherwise.
 *
 * **Read-only and derived.** This function reports; it changes nothing. The
 * numbers it describes are the ones every consequence actually triggers on.
 *
 * @param tick Needed to know whether a person is resting right now.
 */
export function readinessCauses(persons: readonly Person[], tick: number): string[] {
  const causes: string[] = [];

  // At or above the eating threshold a person is eating or waiting to eat.
  const hungry = persons.filter((p) => p.needs.hunger >= HUNGER_EAT_THRESHOLD).length;
  // Above the decline threshold they have refused work (ladder step 3).
  const exhausted = persons.filter((p) => p.needs.fatigue >= DECLINE_THRESHOLD).length;
  // Tired but still working: between needing rest and refusing work.
  const tired = persons.filter(
    (p) => p.needs.fatigue >= REST_THRESHOLD && p.needs.fatigue < DECLINE_THRESHOLD,
  ).length;
  // Asleep. Not a fault — recovery is what the base needs (D1 correction 2) —
  // but it is certainly not the same as being rested.
  const resting = persons.filter(
    (p) => p.restUntilTick !== null && tick < p.restUntilTick,
  ).length;

  if (hungry > 0) causes.push(`${hungry} hungry`);
  if (exhausted > 0) causes.push(`${exhausted} exhausted`);
  if (tired > 0) causes.push(`${tired} tired`);
  if (resting > 0) causes.push(`${resting} resting`);

  // Only reached when nobody is hungry, tired or asleep. Deliberately neutral:
  // an earlier "everyone fed and rested" was false whenever anyone was resting,
  // which is the wording a player is most likely to catch.
  if (causes.length === 0) causes.push('No immediate concerns');
  return causes;
}