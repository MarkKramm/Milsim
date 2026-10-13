/**
 * Player intent — a design concept, not a UI control
 * (`ARCHITECTURE.md` §4.2, `LOCKED_DECISIONS.md` D2).
 *
 * Intent is first-class simulation data. The interface is only one way to set it;
 * headless tests set it directly, and a future preset system would set it with no
 * UI at all. If intent existed only as a React control, the design would have
 * leaked back into the interface.
 *
 * Stage 1 stores the field because the ownership table
 * (`SYSTEM_DEPENDENCIES.md` §3) marks it Stage 1, and stores nothing else. It
 * resolves into nothing yet. **That is not permission to build intent
 * resolution early.**
 */

export type IntentKind = 'priority' | 'reserve' | 'policy';

export interface Intent {
  id: string;
  kind: IntentKind;
  target?: string;
  value: number | string | boolean;
}