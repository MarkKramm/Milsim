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
