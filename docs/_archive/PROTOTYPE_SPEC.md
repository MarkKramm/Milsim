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
