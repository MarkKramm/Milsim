/**
 * The command queue.
 *
 * `ARCHITECTURE.md` §4.0: commands live in `state.pendingCommands[]` and
 * **nowhere else**. An earlier design also took them as a `tick` argument, which
 * meant a caller could enqueue a command *and* pass it and have it applied
 * twice. The queue is now the only source of truth.
 *
 * It is also the version that survives a save: the Stage 1 contract requires
 * unissued orders to be persisted with the state so a run resumed from disk
 * still holds them. A function argument would not be persisted.
 */

import type { SimState } from './state';
import { emit } from './events';
import { isPriority, priorityIntent, readPriority, PRIORITY_INTENT_ID } from './priority';

/**
 * The Stage 2 command surface.
 *
 * `ROADMAP.md` §Stage 2 authorises exactly one: *"One simple player intent: a
 * priority order between two competing kinds of work. That is the entire command
 * surface at this stage."* Named-option decisions (`D2`) are Stage 4.
 *
 * The union being non-empty is the point of the earlier `never`: it made it
 * impossible to write a handler for a system that does not exist yet.
 */
export type Command =
  | { readonly type: 'set_priority'; readonly value: string };

/** Narrow an unknown value. Rejection is recorded, never silent (`GAME_DESIGN_BLUEPRINT.md` A4). */
export function isCommand(value: unknown): value is Command {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false;
  if ((value as { type: unknown }).type !== 'set_priority') return false;
  return 'value' in value;
}

/**
 * Append a command without mutating the caller's state.
 *
 * Returns a new state, so a caller holding an older snapshot is unaffected —
 * the immutability rule applies to the queue like every other field.
 */
export function enqueue(state: SimState, command: Command): SimState {
  return {
    ...state,
    pendingCommands: [...state.pendingCommands, command],
  };
}

/**
 * Drain the queue in FIFO order, then empty it.
 *
 * Applied at tick step 2, before any system reacts, so a command issued during
 * tick N takes effect at tick N+1 — never mid-tick, never twice, never lost
 * (`GAME_DESIGN_BLUEPRINT.md` A4 §3).
 *
 * Invalid commands are **rejected with a recorded reason**, not silently dropped
 * (A4 §7, C1 §3). One command applies exactly once.
 */
export function applyCommands(draft: SimState): void {
  if (draft.pendingCommands.length === 0) return;

  for (const command of draft.pendingCommands) {
    if (isCommand(command) && command.type === 'set_priority') {
      applySetPriority(draft, command.value);
      continue;
    }
    emit(draft, {
      type: 'command_rejected',
      tier: 'routine',
      data: { command: describeUnknown(command) },
    });
  }
  draft.pendingCommands = [];
}

function applySetPriority(draft: SimState, value: unknown): void {
  if (!isPriority(value)) {
    emit(draft, {
      type: 'command_rejected',
      tier: 'routine',
      data: { command: `set_priority:${String(value)}`, reason: 'unknown priority' },
    });
    return;
  }

  const from = readPriority(draft.intent);
  if (from === value) return; // No change is not an event.

  draft.intent = [
    ...draft.intent.filter((entry) => entry.id !== PRIORITY_INTENT_ID),
    priorityIntent(value),
  ];
  emit(draft, {
    type: 'intent_changed',
    tier: 'routine',
    data: { from, to: value },
  });
}

/**
 * Describe a value of a type TypeScript believes is unreachable.
 *
 * The cast is honest about what is happening: the type system has promised this
 * cannot occur, and the runtime disagrees. Returning the value as a string keeps
 * the rejection legible in the log instead of throwing.
 */
function describeUnknown(command: unknown): string {
  if (typeof command === 'object' && command !== null && 'type' in command) {
    return String((command as { type: unknown }).type);
  }
  return String(command);
}