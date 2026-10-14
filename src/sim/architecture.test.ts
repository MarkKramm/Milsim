/**
 * Architecture guard.
 *
 * `D9` / `ARCHITECTURE.md` §1: **the simulation contains no UI code.** This is the
 * one rule with no exceptions, and a rule nobody checks is a rule that decays.
 *
 * These tests are static rather than clever on purpose. They read the source of
 * `src/sim/**` and fail if a forbidden import or a forbidden global appears. A
 * runtime ownership-enforcement framework would be more general and would also
 * have to guess, before those systems exist, what it ought to enforce.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SIM_DIR = join(REPO, 'src', 'sim');

/** Source files only — the *.test.ts files here import node:test deliberately. */
function simSourceFiles(): string[] {
  return readdirSync(SIM_DIR)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => join(SIM_DIR, name));
}

function readAll(): Map<string, string> {
  const files = new Map<string, string>();
  for (const path of simSourceFiles()) {
    files.set(relative(REPO, path), readFileSync(path, 'utf8'));
  }
  return files;
}

/** Strip comments and doc-comments so prose about React does not trip the rule. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

test('src/sim has source files', () => {
  assert.ok(statSync(SIM_DIR).isDirectory());
  assert.ok(simSourceFiles().length >= 6, 'expected the Stage 1 sim modules');
});

test('the simulation never imports React', () => {
  for (const [name, source] of readAll()) {
    const code = stripComments(source);
    assert.ok(
      !/from\s+['"]react/.test(code) && !/from\s+['"]react-dom/.test(code),
      `${name} imports React`,
    );
  }
});

test('the simulation never imports the UI or the controller', () => {
  for (const [name, source] of readAll()) {
    const code = stripComments(source);
    assert.ok(!/from\s+['"][^'"]*(ui|controller)[^'"]*['"]/.test(code), `${name} imports UI/controller`);
  }
});

test('the simulation uses no DOM or browser globals', () => {
  const forbidden = ['document', 'window', 'localStorage', 'navigator', 'requestAnimationFrame'];
  for (const [name, source] of readAll()) {
    const code = stripComments(source);
    for (const global of forbidden) {
      assert.ok(!new RegExp(`\\b${global}\\b`).test(code), `${name} references ${global}`);
    }
  }
});

test('the simulation never calls Math.random', () => {
  for (const [name, source] of readAll()) {
    assert.ok(!/Math\s*\.\s*random/.test(stripComments(source)), `${name} calls Math.random`);
  }
});

test('the simulation never reads the wall clock', () => {
  for (const [name, source] of readAll()) {
    const code = stripComments(source);
    assert.ok(!/Date\s*\.\s*now/.test(code), `${name} calls Date.now()`);
    assert.ok(!/new\s+Date\s*\(/.test(code), `${name} constructs a Date`);
    assert.ok(!/performance\s*\.\s*now/.test(code), `${name} calls performance.now`);
  }
});

test('the simulation imports nothing from node: builtins', () => {
  // node:test, node:assert and node:fs are legitimate in tests, but a module
  // under src/sim that shipped to the browser must not need them.
  for (const [name, source] of readAll()) {
    assert.ok(
      !/from\s+['"]node:/.test(stripComments(source)),
      `${name} imports a node: builtin and would not run in the browser`,
    );
  }
});

test('only rng.ts advances the RNG cursor', () => {
  // Invariant 11. If a second module can move the cursor, determinism becomes
  // a property of who happens to run first.
  for (const [name, source] of readAll()) {
    const writes = stripComments(source).match(/rngCursor\s*=/g) ?? [];
    const isRng = name.endsWith('rng.ts');
    const isStateDecl = name.endsWith('state.ts');
    if (isRng || isStateDecl) continue;
    assert.equal(writes.length, 0, `${name} assigns to rngCursor`);
  }
});

test('the simulation contains no placeholder systems for future stages', () => {
  // Stage 2 implements phases 0 and 5: Personnel, Facilities and Jobs are real
  // systems now, so `personnel`, `facilities` and `jobs` were removed from this
  // list when their owning systems arrived (`ARCHITECTURE.md` §3). `storage` was
  // removed in Stage 3, when bulk stock was brought forward from Stage 7.
  //
  // What remains forbidden are the Stage 7 fields. An empty array
  // standing in for storage, items, readiness or resources would be
  // indistinguishable from a working system until the day it silently does the
  // wrong thing — and `readiness` in particular must never be persisted at all,
  // because invariant 12 requires that no system may read a stored copy.
  const forbiddenFields = ['items', 'readiness', 'resources'];
  for (const [name, source] of readAll()) {
    const interfaceBody = source.match(/export interface SimState \{([\s\S]*?)\n\}/)?.[1] ?? '';
    for (const field of forbiddenFields) {
      assert.ok(
        !new RegExp(`^\\s*${field}\\??:`, 'm').test(interfaceBody),
        `${name} declares a future-stage field "${field}" in SimState`,
      );
    }
  }
});
// ── Stage 3 prerequisites ───────────────────────────────────────────────────
// Both were raised by the Stage 2 final audit. Stage 3 adds six modules, several
// of which want to reach into person or storage state, so the boundaries are
// enforced now rather than after a second writer appears.

test('only personnel.ts writes a person field, and only storage.ts builds holdings', () => {
  // Invariant 18 (`SYSTEM_DEPENDENCIES.md` §3): no system writes a field it does
  // not own. Ownership has always been a convention held by review, which is what
  // the Stage 2 audit flagged as untested.
  //
  // An earlier attempt asserted "only the owner defines a function returning an
  // owned value". That is wrong, and it is worth recording why: `needs.ts`
  // legitimately *returns* a Person by calling `personnel.ts`, which is the
  // request pattern the document requires. Forbidding it would forbid the design.
  //
  // What is genuinely true, and checked here: only `personnel.ts` constructs a
  // person field, and only `storage.ts` names the storage holdings as fields.
  // An earlier attempt checked `needs:` too and matched `conditionOf(needs: Needs)`,
  // a function *parameter*, in `readiness.ts`. Three successive false positives
  // is enough to know the job cannot be done by grep, so the guard checks only
  // the two unambiguous object keys and the rest is left to the state-isolation
  // tests, which prove the property that actually matters — that a tick cannot
  // reach back and change an earlier state's person — rather than by pretending
  // a source pattern is an ownership proof.
  const PERSON_KEYS = ['currentTask:', 'restUntilTick:'];
  // Declared as `readonly food:` rather than bare `food:` — a bare key also
  // appears in event payloads (`data: { supplies: ... }`), and a guard that fires
  // on an event key trains the next reader to add an exception to it.
  const STORAGE_KEYS = ['readonly food:', 'readonly supplies:'];

  for (const [name, source] of readAll()) {
    const file = name.split('/').pop() ?? name;
    const code = stripComments(source);

    if (file !== 'personnel.ts') {
      for (const key of PERSON_KEYS) {
        assert.ok(!code.includes(key), `${name} constructs a Person field ("${key}")`);
      }
    }
    if (file !== 'storage.ts') {
      for (const key of STORAGE_KEYS) {
        assert.ok(!code.includes(key), `${name} constructs a Storage field ("${key}")`);
      }
    }
  }
});

test('there is no runtime import cycle among simulation modules', () => {
  // The audit found two latent cycles that are safe only because every leg is
  // `import type` and therefore erased: personnel <-> jobs, and state <-> rng.
  // A cycle is harmless until one leg becomes a value import, at which point it
  // fails at load rather than at review. This walks *value* imports only.
  const files = simSourceFiles();
  const graph = new Map<string, string[]>();

  for (const path of files) {
    const name = path.split('/').pop() ?? path;
    const source = stripComments(readFileSync(path, 'utf8'));
    const edges: string[] = [];
    for (const match of source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+'\.\/([^']+)'/gm)) {
      const target = match[1];
      if (target !== undefined) edges.push(`${target}.ts`);
    }
    graph.set(name, edges);
  }

  const visiting = new Set<string>();
  const done = new Set<string>();
  const walk = (name: string, trail: string[]): void => {
    if (done.has(name)) return;
    assert.ok(!visiting.has(name), `import cycle: ${[...trail, name].join(' -> ')}`);
    visiting.add(name);
    for (const next of graph.get(name) ?? []) {
      if (graph.has(next)) walk(next, [...trail, name]);
    }
    visiting.delete(name);
    done.add(name);
  };

  for (const name of graph.keys()) walk(name, []);
});
