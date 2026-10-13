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
  // Stage 1 implements phase 0 only. An empty array standing in for personnel or
  // facilities would be indistinguishable from a working system until the day it
  // silently does the wrong thing.
  const forbiddenFields = ['personnel', 'facilities', 'jobs', 'storage', 'items', 'readiness', 'resources'];
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