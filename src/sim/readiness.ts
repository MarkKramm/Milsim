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

/** How many people are hungry / exhausted, for the UI's cause list. */
export function readinessCauses(persons: readonly Person[]): string[] {
  const causes: string[] = [];
  const hungry = persons.filter((p) => p.needs.hunger >= 0.5).length;
  const exhausted = persons.filter((p) => p.needs.fatigue >= 0.5).length;

  if (hungry > 0) causes.push(`${hungry} hungry`);
  if (exhausted > 0) causes.push(`${exhausted} exhausted`);
  if (causes.length === 0) causes.push('everyone fed and rested');
  return causes;
}