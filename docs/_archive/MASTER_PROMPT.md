# OpenCode Master Prompt --- Military Base Simulator Foundation

## Your role

Act as a collaborative game designer and technical planning partner for
a solo beginner/intermediate developer. Help plan a game called
**Military Base Simulator**. The user has already built BSIM, a
deterministic, seed-replayable, tick-based auto-battler and battle-story
simulator. This new game must feel distinct: it is a living military
base where personnel act autonomously and the player commands by
exception.

## Current vision

The player oversees a military base that operates largely by itself.
Soldiers and staff perform jobs, eat, rest, train, maintain equipment,
and respond to changing circumstances. The player establishes policies,
allocates resources, inspects people and equipment, and intervenes only
when an important decision requires it.

The intended appeal is watching understandable systems interact and
create persistent consequences---not clicking through repetitive menus
or micromanaging every person.

Current preferences: - Begin with a web-based UI and text/status panels,
possibly simple progress bars. Do **not** require character animation or
a rendered 3D world for the first prototype. - Personnel should be
highly autonomous by default. - Time is undecided. A continuous
simulation that can pause when a consequential decision needs the
player's attention is a candidate, not a locked requirement. - The user
is a solo beginner/intermediate developer and can get excited by future
features before the core is proven fun. Protect the scope. - The game
should eventually support deep soldier/equipment inspection, persistent
equipment condition, operations, raids, vehicles, base expansion,
reports, and possibly a wider war layer---but these are future
possibilities, not first-prototype requirements.

## Your task in this run

We are in **planning mode only**. Produce useful Markdown planning
documents for the foundation. Do not implement the game.

1.  Inspect the current working directory and identify whether it
    already contains a project or repository. Do not assume the current
    directory is empty.
2.  Do not modify, delete, move, or overwrite existing files. Do not
    inspect secrets or unrelated personal files.
3.  Create a new, clearly named folder
    `military-base-simulator-planning/` only if it does not already
    exist. If it exists, inspect its contents first and preserve
    existing work. If a naming conflict or uncertainty exists, stop and
    explain rather than overwrite.
4.  Inside that folder, create the following Markdown documents:
    -   `GAME_VISION.md`
    -   `CORE_LOOP.md`
    -   `PROTOTYPE_SPEC.md`
    -   `FOUNDATION_DECISIONS.md`
    -   `IMPLEMENTATION_STAGES.md`
    -   `OPEN_QUESTIONS.md`
5.  Keep these documents concise enough to use, but specific enough to
    guide later implementation. Clearly distinguish:
    -   confirmed preferences,
    -   provisional recommendations,
    -   unresolved decisions,
    -   future ideas that are explicitly out of scope for the first
        prototype.
6.  Include acceptance criteria for the first prototype. Focus on
    whether autonomous behavior is understandable and enjoyable to
    observe, whether small system interactions create meaningful
    consequences, and whether reports explain what happened and why.
7.  Propose a lightweight architecture appropriate to the smallest
    prototype, but do not overdesign it. Separate simulation state/rules
    from UI presentation. Treat deterministic replay, event causality,
    saving, and complex job scheduling as decisions to validate or
    stage---not reasons to build a large engine upfront.
8.  Explicitly discuss the time model. Compare continuous ticks with
    pause/speed controls, daily turns, and a hybrid. Recommend a
    starting experiment while marking it provisional. Consider that the
    user prefers high autonomy and is interested in pausing for
    important decisions, but does not want constant interruptions.
9.  Do not force a particular framework or game engine before the
    requirements justify one. A simple web UI is currently preferred for
    the first prototype; recommend a stack only if helpful, and explain
    why.
10. Do not add speculative features merely because they sound realistic.
    Each proposed system must support the core experience.

## Scope boundaries

Do NOT: - write application code, tests, or a full software
architecture; - run package installs, build tools, or destructive
commands; - create a complete weapon database or detailed real-world
equipment catalog; - design all future layers, factions, campaigns,
raids, vehicles, and operations in detail; - copy BSIM's design
wholesale; - assume all proposed hooks are confirmed requirements; -
make the first prototype depend on pathfinding, animation, a giant
inventory, or hundreds of items.

## Planning principles

-   Start with the player experience and observable behavior, not
    engines and abstractions.
-   Make the smallest playable experiment test one clear question: **Is
    it fun to watch a small autonomous base operate, understand why
    things happen, and occasionally change a policy?**
-   Prefer a few interacting systems over many disconnected features.
-   Every event in the prototype should be explainable through visible
    state and a readable report.
-   Keep future ambitions in a clearly labeled parking lot.
-   Point out weak assumptions and risks instead of automatically
    agreeing.
-   Do not pretend unresolved decisions have already been made.
-   Avoid overwhelming the user with a massive roadmap. Make the next
    practical step obvious.

## Required response after creating the documents

Report: 1. Which files you created and their purpose. 2. Any assumptions
you made. 3. Any important unresolved decisions. 4. The recommended next
step. 5. Confirm that you did not implement the game or modify unrelated
files.

Do not begin implementation unless the user explicitly requests it in a
later step.
