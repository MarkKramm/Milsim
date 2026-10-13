# Original Planning Pack

The complete, unmodified text of the planning documents produced before this
project's planning phase began. Included so any reviewer can audit what was
originally proposed and compare it against the current design.

**These documents are superseded.** Where they conflict with
`LOCKED_DECISIONS.md`, the decisions document wins. They are retained as
history, not as instructions.

## Contents

1. `MASTER_PROMPT.md` — the instructions that started the project
2. `GAME_VISION.md` — vision and design pillars
3. `CORE_LOOP.md` — the repeating gameplay loop
4. `PROTOTYPE_SPEC.md` — first prototype scope and acceptance criteria
5. `FOUNDATION_DECISIONS.md` — early choices
6. `IMPLEMENTATION_STAGES.md` — original staging
7. `OPEN_QUESTIONS.md` — originally unresolved items

## Audit note

An audit of this pack (`AUDIT_AND_RECOMMENDATIONS.md`) found it good in quality
but incomplete in coverage: it described a *simulation* rather than a *game* —
no stakes, no goal, no failure, and player agency reduced to sliders.

The original files also exist individually in this directory.

---

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
# Military Base Simulator --- Game Vision

## One-sentence pitch

A living military base simulation where personnel act autonomously,
interconnected systems create persistent consequences, and the player
commands by exception rather than micromanaging every action.

## Intended player fantasy

I oversee a military organization that functions without my constant
input. I can watch its daily activity, inspect people and equipment,
understand problems, establish policies, and intervene when a decision
matters. Over time, the base develops a history shaped by its own
routines and by my choices.

## Design pillars

1.  **Autonomy first:** personnel should have useful default behavior
    and continue operating without constant orders.
2.  **Readable simulation:** the player can discover what each person is
    doing, what they need, and why a task is delayed or fails.
3.  **Depth through interaction:** a small number of connected systems
    should create meaningful consequences.
4.  **Persistent world:** people, equipment, stockpiles, and facilities
    retain relevant state over time.
5.  **Stories from simulation:** reports summarize events that actually
    happened; they should not invent causes that the simulation did not
    track.
6.  **Expandable content:** future roles, items, facilities, and events
    should extend established rules where practical.

## Current preferences

-   First prototype may use a web UI with text, status indicators, and
    progress bars.
-   Character animation and a 3D world are not required for the first
    prototype.
-   Personnel should be highly autonomous.
-   The time model remains undecided. Continuous simulation with pause
    and speed controls is a candidate.
-   The developer is a solo beginner/intermediate developer and wants to
    validate fun before expanding scope.

## Player role

The player establishes broad policies, allocates resources, inspects the
situation, and occasionally intervenes. The player should not need to
click every soldier's next action.

Potential later controls include work priorities, duty templates, supply
requests, squad dispatch, and emergency policies. These are not all
first-prototype requirements.

## Experience goals

-   Watching the base produces understandable, small-scale developments.
-   The player can tell the difference between a random event and a
    consequence of earlier decisions.
-   Intervening in one policy can change what happens without requiring
    direct control of every character.
-   Daily reports provide a satisfying overview without becoming the
    only interesting part of the game.

## Non-goals for the first prototype

No full war campaign, elaborate raids, vehicle simulation, massive
armory, exhaustive real-world equipment catalog, complex enemy AI,
multiplayer, or detailed character animation.

## Core design test

Can the player watch a small base for a simulated day, understand what
its personnel are doing, observe at least one meaningful interaction
between systems, and want to continue?
# Core Loop

## Candidate loop

1.  **Observe:** review personnel, work queues, needs, supplies, and
    current problems.
2.  **Set policy:** adjust a small number of work priorities or
    assignments.
3.  **Simulate:** autonomous personnel choose and perform tasks
    according to their needs, duties, available resources, and
    conditions.
4.  **Resolve interactions:** jobs consume or produce resources; delays
    and shortages affect other activities.
5.  **Explain:** the event timeline and end-of-day report show what
    happened and, where possible, why.
6.  **Adjust:** the player changes policy or priorities and observes the
    next period.

This loop is provisional. The prototype must test whether observation
and occasional policy changes are enjoyable rather than assuming they
are.

## Prototype scenario

A small base contains a handful of personnel, a food stockpile, a
kitchen, a storage area, and a basic maintenance task. Personnel have
hunger, fatigue, duties, and simple work priorities.

Example chain: - A worker is assigned to maintenance. - Maintenance
occupies the worker for a period. - A delivery or production delay
reduces available food. - Meal preparation or access is delayed. - A
soldier's schedule is affected. - The report records the actual chain of
events and the relevant state changes.

The exact chain should arise from implemented rules, not be scripted as
a predetermined story.

## Player input budget

The default experience should require few inputs. Start with a small
number of policy controls. Do not add interrupt dialogs until the
autonomous simulation is understandable.

## Time model options

### A. Continuous ticks with pause and speed controls

Pros: supports observation, waiting, and a sense of a living base.\
Risks: can encourage excessive waiting or create confusing timing if
events move too quickly.

### B. Daily turns

Pros: easier to reason about and test; decisions are naturally grouped.\
Risks: may feel less alive and can hide the timing of cause and effect.

### C. Hybrid

The simulation advances continuously in ticks, while the player can
pause, speed up, or skip visual playback to a report. Consequential
decisions can optionally pause the simulation later.

**Provisional experiment:** implement a simple tick-based simulation
with manual pause and a few speed settings. Initially avoid mandatory
decision interrupts. Test whether a player can observe a period and
understand the result. Add decision-triggered pauses only after a
specific, genuinely consequential decision exists.

## Core fun hypothesis

The game is enjoyable when a small set of autonomous agents and
connected resource/job rules create understandable, persistent
developments that the player can influence with a small number of
decisions.
# First Playable Prototype --- Specification

## Purpose

Test one question before building the full game:

**Is it enjoyable to watch a small autonomous military base operate,
understand why things happen, and occasionally change a policy?**

## Included

### People

-   Approximately 6--8 personnel.
-   Each has a persistent ID, a small set of needs (initially hunger and
    fatigue), a current activity, and a basic duty or skill.
-   Simple autonomous task selection from available jobs and current
    priorities.

### Facilities and resources

-   A small abstract base represented by panels or a simple grid.
-   Kitchen, barracks/rest area, storage, and a basic maintenance/work
    area.
-   A small number of resources, such as food and maintenance supplies.
-   Jobs have clear prerequisites, durations, and resource effects.

### Player controls

-   Inspect a person and see needs, current task, and recent events.
-   Change one or two work priorities.
-   Advance simulation with pause and speed controls.
-   Review a timeline and an end-of-day report.

### Presentation

-   Web UI with text, simple shapes, status indicators, and progress
    bars.
-   No character animation required.
-   No need for a fully navigable spatial world in this first
    experiment.

## Excluded

-   Combat, raids, enemy AI, full operations, vehicles, weapon
    customization, large inventories, recruitment progression, faction
    warfare, elaborate pathfinding, and detailed equipment models.
-   Complex needs such as morale, hydration, injuries, or sleep quality
    until the basic loop works.
-   Mandatory decision interrupts.
-   Persistent save/load implementation unless it is necessary for the
    chosen prototype workflow.

## Acceptance criteria

The prototype is worth expanding only if testing demonstrates most of
the following:

1.  Personnel continue doing useful work without being individually
    ordered every tick.
2.  Their current activities and reasons for choosing them are
    inspectable.
3.  At least two systems interact to create a consequence that is not a
    scripted sequence.
4.  The player can change a priority and observe a comprehensible
    effect.
5.  The timeline and daily report accurately describe what occurred.
6.  The simulation can advance through a simulated day without getting
    stuck in obvious loops.
7.  The developer can reproduce and diagnose a problematic run well
    enough to fix it.
8.  Watching the simulation feels interesting enough to continue, rather
    than merely waiting for a report.

## Test scenarios

-   Normal day with sufficient supplies.
-   A shortage of food or maintenance supplies.
-   Two jobs competing for the same worker.
-   A worker becoming tired and changing behavior.
-   A player priority change affecting the order in which tasks are
    completed.

These should be test conditions, not hard-coded story outcomes.

## Prototype completion means

The core behavior is observable, explainable, and sufficiently
interesting to justify the next small feature. It does not mean the game
is content-complete or architecturally final.
# Foundation Decisions

This document records early choices without pretending all of them are
final.

## Confirmed direction

-   The project is a living military base sandbox.
-   Personnel should be highly autonomous.
-   The first prototype can use a web UI with text and progress
    indicators.
-   Character animation and a 3D world are not required initially.
-   The game should prioritize understandable interactions and
    persistent consequences over feature count.
-   Planning must avoid prematurely designing the entire game.

## Provisional recommendations

### Simulation time

Use discrete ticks internally so needs, jobs, resource changes, and
events can be processed in a consistent order. Expose pause and a small
number of speed settings in the prototype.

Do not implement mandatory decision pauses yet. First test whether the
player can observe the simulation and change policies at sensible
moments.

### State and presentation

Maintain one authoritative simulation state. UI components display that
state and issue player commands; they should not independently implement
simulation rules.

### Personnel decisions

Begin with a transparent, simple priority-based decision rule. For
example, evaluate urgent needs, assigned duties, job availability, and
policy priority. Do not build a generic AI framework before the first
rules are understood.

### Jobs

Represent a job with a clear eligibility rule, duration or progress,
required inputs, outputs, and completion result. A worker should not
complete a job if its prerequisites are missing.

### Resources

All consumption, production, and transfers should go through explicit
rules. Avoid changing resource quantities from scattered UI handlers.

### Events and reports

Record meaningful state changes with enough context to explain them. The
report should summarize recorded events rather than inventing causal
explanations afterward.

### Randomness and reproducibility

Seeded randomness may help reproduce bugs and compare behavior. Start
with deterministic rules where possible; introduce randomness only when
it adds value. If seeded randomness is implemented, ensure UI rendering
does not consume simulation random values.

### Saving

Decide early what state would need saving, but postpone a full save
system until the state model stabilizes unless the development workflow
requires persistence.

## Decisions still open

-   Web framework and language.
-   Whether the base is a grid, a schematic map, or panels only.
-   Exact tick duration and whether game time is displayed as minutes,
    hours, or abstract time units.
-   Whether jobs are scheduled, dynamically selected, or use a
    combination.
-   Whether personnel have fixed duties, flexible duties, or both.
-   How reports group events and expose causes.
-   Whether deterministic replay is a core player-facing feature or
    primarily a developer tool.
-   How and when player decisions can pause time.
-   The minimum amount of spatial movement needed for the base to feel
    alive.

## Design warning

Do not lock the full architecture around imagined future raids,
vehicles, war campaigns, or detailed inventories. The first
implementation should reveal which abstractions are genuinely needed.
# Implementation Stages

These stages are deliberately small. Reassess after each stage rather
than treating the whole list as a fixed contract.

## Stage 0 --- Planning baseline

-   Agree on the vision and first-prototype question.
-   Choose a simple presentation direction.
-   Define the smallest state needed to simulate one day.
-   Record unresolved questions instead of guessing silently.

**Exit condition:** the prototype can be described clearly without
listing future features.

## Stage 1 --- State advances

-   Create a tiny simulation state for a few personnel, facilities,
    resources, and jobs.
-   Advance it in discrete ticks.
-   Show current values in a basic UI.
-   Keep simulation rules separate from presentation.

**Exit condition:** the simulation advances reliably and values can be
inspected.

## Stage 2 --- Autonomous jobs

-   Add a small set of jobs with eligibility rules, progress, and
    resource effects.
-   Add simple autonomous job selection.
-   Show each person's current activity and reason for choosing it.

**Exit condition:** personnel can select and complete useful work
without constant commands.

## Stage 3 --- Needs and interactions

-   Add hunger and fatigue, with simple effects on task selection or
    performance.
-   Add food consumption and one maintenance-supply interaction.
-   Create test scenarios where resource or worker contention changes
    outcomes.

**Exit condition:** connected systems create understandable
consequences.

## Stage 4 --- Reports and diagnosis

-   Add an event timeline and end-of-day report.
-   Include enough cause/context information to explain notable
    outcomes.
-   Test failure cases and obvious decision loops.

**Exit condition:** the developer and player can explain why notable
events occurred.

## Stage 5 --- Fun evaluation

-   Play through several simulated days.
-   Test changing priorities and starting conditions.
-   Identify whether observation is engaging, what is repetitive, and
    what the player wishes they could influence.

**Exit condition:** evidence supports either expanding, simplifying, or
changing the core loop.

## Stage 6 --- Select the next layer

Only after the fun evaluation, choose one next addition, such as
equipment maintenance, training, supply delivery, or a first operation.
Do not add all of them at once.

## Later possibilities --- not commitments

-   Detailed soldier and equipment inspectors.
-   Role templates and loadout assignment.
-   Weapons with condition and malfunction probabilities.
-   Vehicles, fuel, and repairs.
-   Raids and base defense.
-   Squad operations and extraction.
-   Emergent specialization and persistent histories.
-   Multiple bases, factions, and a wider war.
# Open Questions

These questions are intentionally unresolved. Resolve them when the
prototype needs the answer.

## Player experience

-   Is watching the base itself satisfying, or does it need frequent
    external operations?
-   What makes a normal day interesting when nothing dramatic happens?
-   How much influence should the player have without undermining
    autonomy?

## Time and decisions

-   Should simulation continue while the player inspects a soldier?
-   Should the player be able to pause freely?
-   What qualifies as a consequential decision worth pausing for?
-   Can important requests use default policies so ignoring them remains
    safe?

## Base presentation

-   Is a grid necessary for the first prototype, or can panels
    communicate enough?
-   Which visual changes are needed to make activity legible without
    animation?
-   How does the player find a person or job that needs attention?

## Autonomous behavior

-   What is the simplest decision rule that produces useful behavior?
-   How do we prevent workers repeatedly switching tasks?
-   How are priorities balanced against urgent needs?
-   How does the simulation explain a failed or delayed task?

## Long-term variety

-   Which combinations of shortages, personnel skills, equipment
    condition, and external pressure create new situations?
-   What causes a stable base to change over time?
-   How can the game create pressure without making the player feel
    constantly punished?
-   Which future systems genuinely deepen the loop rather than add
    chores?

## Technical foundation

-   Which web stack is already familiar and available?
-   Is a grid useful now or only after spatial movement becomes
    necessary?
-   How much deterministic replay is needed for the first prototype?
-   When should saving/loading be added?
-   What event detail is needed to explain cause and effect without
    recording every trivial action?

## Rule for resolving questions

Do not settle a question because it is common in other simulation games.
Choose the simplest option that supports the intended player experience,
test it when possible, and document the result.
