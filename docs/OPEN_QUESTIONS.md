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
