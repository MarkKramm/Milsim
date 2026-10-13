# Termux: why every script invokes its tool through `node`

Each npm script calls `node node_modules/<tool>/...` instead of the bare command
name. This is not a stylistic choice.

The `node_modules/.bin/*` shims normally used for `tsc`, `vite` and `tsx` begin
with `#!/usr/bin/env node`. Termux has no `/usr/bin/env`, so every one of those
shims fails with:

    bad interpreter: No such file or directory

Calling the tool's real entry point through `node` works on Termux *and* in CI,
where `/usr/bin/env` does exist. Changing the scripts back to bare names will
break local development on this machine while still passing CI — the worst
combination, because the failure only appears where you actually work.
