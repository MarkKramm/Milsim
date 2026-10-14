/**
 * Delivery — the supply schedule.
 *
 * `SYSTEM_DEPENDENCIES.md` §4 puts Delivery at **phase 2**, immediately before
 * Resources, and the reasoning is documented rather than incidental: a scheduled
 * arrival is a fact that already happened, so refusing to feed someone because
 * the paperwork had not landed would be indefensible. Consumption (phase 3) must
 * therefore always see the stock that this phase has just added.
 *
 * Food is *not* delivered. It is cooked — see `jobs.ts` and the kitchen's target
 * stock — because food demand is driven by hunger and a fixed delivery would
 * decouple it from the people eating it.
 */

import { produce } from './storage';
import { emit } from './events';
import type { SimState } from './state';

/** Supplies land every 1,200 in-game minutes (20 hours). */
export const DEFAULT_DELIVERY_INTERVAL = 1200;

/** Units per delivery. */
export const DELIVERY_AMOUNT = 20;

export interface DeliveryState {
  nextDeliveryTick: number;
}

export function createDelivery(): DeliveryState {
  return { nextDeliveryTick: DEFAULT_DELIVERY_INTERVAL };
}

/**
 * Phase 2 — add the scheduled supplies, if one is due.
 *
 * Emits a `supplies_delivered` event so the log shows why the stock rose. A
 * silent stock change is exactly the kind of unexplained movement the project's
 * own rules forbid.
 */
export function runDeliveries(
  draft: SimState,
  intervalTicks: number = DEFAULT_DELIVERY_INTERVAL,
): void {
  let guard = 0;
  // `tick` only ever advances by one, so at most one delivery can be due per
  // call. The loop is defensive rather than necessary; the guard stops a bad
  // interval from spinning forever.
  while (draft.tick >= draft.delivery.nextDeliveryTick && guard < 64) {
    draft.storage = produce(draft.storage, 'supplies', DELIVERY_AMOUNT);
    draft.delivery.nextDeliveryTick = draft.tick + intervalTicks;
    guard += 1;
    emit(draft, {
      type: 'supplies_delivered',
      tier: 'routine',
      data: { supplies: draft.storage.supplies, amount: DELIVERY_AMOUNT },
    });
  }
}