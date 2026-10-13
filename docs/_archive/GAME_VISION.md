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
