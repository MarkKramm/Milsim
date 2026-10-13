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
