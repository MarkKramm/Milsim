/**
 * Storage — bulk stock, and the only writer of it.
 *
 * **This is not Stage 7.** Stage 7 is individual items: condition, wear, slots,
 * weapons, loadouts — the guarantee recorded in `LOCKED_DECISIONS.md` D21. What
 * lives here is two counters: how much food the base has, and how many
 * maintenance supplies. Bringing them forward to Stage 3 is the resolution of a
 * documented conflict: `SYSTEM_DEPENDENCIES.md` §3 puts `resources` (a derived
 * aggregate over storage) at Stage 3 while putting `storage[]` itself at Stage 7,
 * and `ROADMAP.md` §Stage 3 requires food consumption and resource contention.
 * The table is corrected in Stage 3's documentation step.
 *
 * **`SYSTEM_DEPENDENCIES.md` §3: Storage owns holdings, and no other system may
 * write them** (invariant 17). Everything else goes through `consume` or
 * `produce`, which may refuse and records why. A request that cannot be refused
 * is a bug — it means the requester assumed authority it does not have.
 */

export interface Storage {
  readonly food: number;
  readonly supplies: number;
}

/**
 * A run starts with a buffer rather than an empty larder.
 *
 * The kitchen's default target is 40 (§ `DEFAULT_FOOD_TARGET` in `commands.ts`).
 * Starting at 60 gives the base roughly half a day of meals before production
 * has to do anything, so a fresh run is not decided by an empty cupboard in the
 * first hour. The target is a production threshold, **not a cap** — nothing here
 * deletes stock that already exists.
 */
export const INITIAL_STORAGE: Storage = Object.freeze({ food: 60, supplies: 40 });

export function createStorage(food: number, supplies: number): Storage {
  return Object.freeze({ food, supplies });
}

export interface ConsumeResult {
  readonly ok: boolean;
  readonly storage: Storage;
  /** Present when `ok` is false, so the refusal can be recorded and explained. */
  readonly reason?: string;
}

/**
 * Take `amount` of a kind out of storage.
 *
 * Never leaves a negative balance (invariant 1) and never silently half-succeeds:
 * either the whole amount is consumed or nothing is, because a partially served
 * ration is indistinguishable from a bug from the player's side.
 */
export function consume(storage: Storage, kind: 'food' | 'supplies', amount: number): ConsumeResult {
  if (amount <= 0) return { ok: true, storage };
  const available = storage[kind];
  if (available < amount) {
    return {
      ok: false,
      storage,
      reason: `only ${available} ${kind} available, needed ${amount}`,
    };
  }
  return { ok: true, storage: createStorage(...adjust(storage, kind, -amount)) };
}

/** Add `amount` of a kind to storage. */
export function produce(storage: Storage, kind: 'food' | 'supplies', amount: number): Storage {
  if (amount <= 0) return storage;
  return createStorage(...adjust(storage, kind, amount));
}

/** `total` of the holdings — the derived aggregate `Resources` publishes. */
export function totalOf(storage: Storage, kind: 'food' | 'supplies'): number {
  return storage[kind];
}

function adjust(storage: Storage, kind: 'food' | 'supplies', delta: number): [number, number] {
  return kind === 'food'
    ? [storage.food + delta, storage.supplies]
    : [storage.food, storage.supplies + delta];
}