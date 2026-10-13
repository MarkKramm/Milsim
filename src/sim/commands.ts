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

/**
 * Stage 1 defines **no** gameplay commands, so this union is empty.
 *
 * That is a deliberate statement, not an omission: it makes it impossible to
 * write a command handler for a system that does not exist yet. A later stage
 * adds variants here, and only then does `applyCommands` grow real behaviour.
 */
export type Command = never;

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
 * Stage 1 has no valid command, so every command reaching here is rejected —
 * and rejection is *recorded*, not silent (`GAME_DESIGN_BLUEPRINT.md` A4: an
 * invalid command must fail loudly rather than vanishing). The path exists and
 * is tested now, so that when real commands arrive the queue already behaves.
 */
export function applyCommands(draft: SimState): void {
  if (draft.pendingCommands.length === 0) return;

  for (const command of draft.pendingCommands) {
    emit(draft, {
      type: 'command_rejected',
      tier: 'routine',
      data: { command: describeUnknown(command) },
    });
  }
  draft.pendingCommands = [];
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