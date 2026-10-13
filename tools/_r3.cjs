const fs = require("fs");

// ---------- REVIEW_REPLIES: add Review 3 ----------
let r = fs.readFileSync("REVIEW_REPLIES.md", "utf8");
const block = `
## Review 3 — ChatGPT

**Trigger:** the third external review, given the blueprint, the dependency
document, the roadmap and the brief.
**Overall verdict:** *"the project has a strong foundation, but the documents
claim to be a complete, consistent blueprint when some of their systems cannot
yet work together as written."*

### The framing that mattered

This review came with the instruction that I should *"reconcile the existing
documents, explain any proposed design changes, and leave unrelated code
alone."* That is the first review to state a scope boundary rather than an
ambition — and it is the distinction that made acting on it safe.

### What it found, and what was actually true

**Four findings verified as real. All four were mine.**

I checked each against the documents before acting, rather than taking the
review's word for it. All four were genuine.

| Finding | Verified? | Resolution |
|---|---|---|
| **Dependency rules contradict themselves.** §2 said "read your own tier or higher-numbered tiers"; §3 said the opposite in the next paragraph. | **Real.** Both statements existed, three lines apart | Tiers were doing two jobs — dependency direction *and* execution order. Now three separate concepts: **ownership** (who writes), **phase** (when it runs), **service** (cross-cutting machinery). One unambiguous read rule. |
| **Phase numbers didn't match the tick order they described.** Needs sat at "tier 3" and Facilities at "tier 2", yet Needs ran first. | **Real.** The header claimed tier = evaluation order; the table contradicted it | Phases renumbered to match actual execution order. Events moved out of the sequence entirely — a service cannot be both first and last. |
| **Several systems claimed the same data.** Readiness owned by Needs but listed separately; Personnel writing Needs; Production writing Facilities; Resources and Storage both owning holdings. | **Real.** Four distinct ownership ambiguities | A field-level ownership table: every mutable field, its owner, who may request changes. Plus the **request pattern** — a system never writes another's field, it asks. |
| **Chain A could not be proven by Stage 5.** The reference chain needs items (Stage 7) and production (Stage 8). | **Real, and the worst of the four** | Split into **A1** (resource contention, reachable by Stage 5, now the Stage 5 gate) and **A2** (full equipment chain, Stage 8). |

Plus a smaller contradiction: item condition "degrades with use" in the rules
but "changes only through repair or production" in the tests — a contradiction
that would have prevented wear from ever happening. Now invariant 16.

### The finding I had under-weighted

**Equipment was droppable.** Stage 6's evidence review chose one of four
expansions, and equipment was one of them. Every stage after 6 is conditional, so
the project's defining feature — inspecting soldiers, their gear and loadouts —
had no guaranteed stage. The review called this the largest vision risk. It was
right, and I had dismissed the same concern as "scope discipline" when I wrote
it.

**Now D21:** a minimum equipment and loadout experience is guaranteed. Its scope
stays negotiable; the stage does not. Stage 6 now chooses what is added *beside*
equipment.

### What it asked for that went beyond fixing contradictions

**A structural model for soldiers, items and loadouts.** Correct, and accepted
as the largest single addition. The developer's interest is *inspection* —
helmets, clothing, pockets, durability, armour, weapons — and Stage 7 could have
shipped as a flat item list with a condition bar while satisfying the roadmap
and missing all of it.

This is now the **equipment structural contract**: the soldier, the item, slots
and containers (resolved as one mechanism at different depths, not three special
cases), derived loadouts, and how vehicles relate to all of it. It deliberately
specifies no weapon catalogue.

**A Stage 1 technical contract.** Also correct, and uncomfortably so: I had begun
scaffolding Stage 1 when this arrived, and its questions — does "tick()" return
events or append them, where do pending commands live, how is the seed
represented — were exactly the ambiguities I would have answered by inventing
something mid-implementation and then contradicting elsewhere. All now recorded
as decisions.

**A Stage 2 reference scenario.** Accepted. A feature list does not guarantee the
experiment happens: if starting conditions never create contention, the priority
control looks useless even when implemented correctly. The fixture now fixes
personnel, jobs, capacities and the conflict condition.

### What I pushed back on

**It called the whole correction pass justified while also noting the checkpoint
claims no further planning is scheduled.** That is fair — but only because this
pass was bounded by real contradictions rather than ambition. Recorded boundary
in the roadmap: a further pass must arrive naming a specific defect.

**It did not flag that I had already started writing Stage 1.** I stopped that
on the user's interruption. The review's Stage 1 contract is more useful *before*
the first commit than after.

### What did not change

Autonomy and command by exception. The pure deterministic simulation. Causal
explanations over log walls. Small stages with honest gates. Graduated
consequences and persistent history. None were touched — which is now the
outcome of three reviews, and is the strongest evidence the architecture is
sound.

---

## Reviews

*(three received — see above)*`;

r = r.replace(/\n## Reviews\n\n\(\*two received[^*]*\*\)/, block);
fs.writeFileSync("REVIEW_REPLIES.md", r);
console.log("REVIEW_REPLIES: " + (r.includes("Review 3 — ChatGPT") ? "ok" : "FAILED"));

// ---------- OPEN_QUESTIONS: update affected questions ----------
let o = fs.readFileSync("OPEN_QUESTIONS.md", "utf8");
let m = 0;
const rep = (a, b) => {
  if (!o.includes(a)) { console.log("MISS OQ: " + a.slice(0, 45)); return; }
  o = o.split(a).join(b); m++;
};

rep(
  "### Q34. What should we refuse to build, ever? — PROVISIONAL",
  "### Q34. What should we refuse to build, ever? — PROVISIONAL\n\n*Partly answered by the third external review.* The pattern it identified is now\nD21: **scope is negotiable, identity is not.** Equipment is guaranteed; its size\nis not. The remaining half of this question is whether there is a second feature\nwith the same claim."
);

rep(
  "### Q35. Does combat ever ship? — OPEN",
  "### Q35. Does combat ever ship? — OPEN\n\n*Unchanged by the third review, which agreed it should stay open.*"
);

rep("**19 questions, numbered Q16–Q35.**", "**19 questions, numbered Q16–Q35.**");
fs.writeFileSync("OPEN_QUESTIONS.md", o);
console.log("OPEN_QUESTIONS: " + m + " applied");