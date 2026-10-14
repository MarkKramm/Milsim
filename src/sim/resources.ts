/**
 * Resources — the rules, never the stock.
 *
 * `GAME_DESIGN_BLUEPRINT.md` D1 §2 and §4: *"Resources has no mutable state of
 * its own… Resources reads them to produce totals and defines the consumption
 * rules."* This module holds the *quantities* an action costs or yields and
 * nothing else. The numbers live in `storage.ts`, which only Storage may write
 * (invariant 17).
 *
 * Splitting the rules from the stock is the whole point. It is what lets Stage 3
 * introduce food without introducing an inventory system: production and
 * consumption are two rules applied to one counter, not a market.
 */

/** How many meals one completed meal-preparation order yields. */
export const MEALS_PER_BATCH = 1;

/**
 * How many maintenance supplies one completed maintenance order consumes.
 *
 * The supply line is deliberately tight — see `DEFAULT_DELIVERY_INTERVAL` in
 * `delivery.ts`, which arrives 20 per 1,200 ticks against a much higher
 * consumption rate. That gap is the structural scarcity the roadmap asks for.
 */
export const SUPPLIES_PER_REPAIR = 1;

/**
 * How much slower a maintenance job runs when there are no supplies.
 *
 * **This is the resolution of a contradiction in the master plan.** §8 Step 5
 * said a maintenance job "still completes the work" without supplies, while
 * `ROADMAP.md` §Stage 3 requires scarcity and resource contention to *change
 * outcomes*. Silently completing at normal speed makes supplies decorative;
 * blocking the job outright makes the base dead until the next delivery and
 * turns a shortage into a cliff.
 *
 * So a shortage is a **cost, not a gate**: the work still gets done, it simply
 * takes twice as long, and the task records which path it took. Throughput falls,
 * the backlog grows, and the cause is visible — which satisfies both requirements
 * and preserves job semantics (no job is ever created that cannot be finished).
 */
export const UNSUPPLIED_REPAIR_MULTIPLIER = 2;