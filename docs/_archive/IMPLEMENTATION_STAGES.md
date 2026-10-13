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
