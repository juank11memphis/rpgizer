# Quest Guidance Feature Brief

## Summary

Quest Guidance makes generated Main Quests and Side Quests more hand-holding by adding concrete Quest Steps to each one. Instead of only telling the User what to do, RPGizer should show how to do it through a short ordered checklist of practical steps. This first version covers Adventure creation and read-only Adventure presentation only: Quest Steps are generated with the roadmap and shown in quest detail, but users cannot check them off yet.

## Product Vision Fit

This feature directly supports RPGizer's promise to turn vague ambition into a playable path. The Product Vision emphasizes small, clear, motivating steps, one thing at a time, and RPG flavor that serves real progress. Quest Steps strengthen that promise by making each Main Quest and Side Quest immediately actionable without forcing the User to leave the Adventure and invent the missing instructions themselves.

## Business Domain Model Fit

The Business Domain Model defines Quest Steps as concrete checklist items inside Main Quests and Side Quests. Quest Steps tell the User how to make progress on a Quest, can later be pending or done, and can make a Quest ready to complete without automatically completing it. For this feature brief, only the creation and read-only presentation parts are in scope. Boss Fights remain milestone challenges and do not contain Quest Steps in the current domain model.

## Capability Coverage

- **Adventure Creation — Generate Guided Quest Steps**: Main Quests and Side Quests are generated with concrete pending/done-style steps that show how to complete the Quest without turning Boss Fights into checklist tasks.
- **Adventure Creation — Generate a Playable Roadmap**: Quest Steps make the generated roadmap more immediately usable and action-oriented.
- **Adventure Creation — Ground RPG Elements in Real Progress**: Steps must map to real actions, decisions, checks, or artifacts that help the User complete the Quest.
- **Adventure Presentation — Present Quest Steps Clearly**: The Adventure Detail Page shows Quest Steps inside Main Quest and Side Quest detail so the User can understand how to progress.
- **Product Quality Evaluation — Evaluate Test Cases Against Product Expectations**: Existing evals must validate that prompt changes generate useful Quest Steps; new eval coverage should be added when existing evals are insufficient.

## User / Customer Problem

Generated quests can be clear at the objective level but still leave the User asking, “Okay, but what exactly do I do first?” When a quest lacks internal guidance, it can feel like a themed task title rather than a playable action path. This is especially noticeable for learning, cooking, planning, creative, and setup-heavy goals where success depends on a sequence of smaller actions.

## Business Goal

Increase the usefulness and trustworthiness of generated Adventures by making Main Quests and Side Quests more actionable at first read. The feature should improve the chance that Users understand a quest, pick a next step, and feel momentum instead of needing to plan the quest themselves.

## Target User / Scenario

This serves authenticated Users reviewing a newly generated Adventure on the Adventure Detail Page. The most important scenario is a User opening a Main Quest or Side Quest and needing enough guidance to start without asking a follow-up question or leaving RPGizer to create their own checklist.

## Proposed Experience

When RPGizer generates an Adventure, each Main Quest and Side Quest includes a short list of Quest Steps. In the Adventure Detail Page, the selected quest detail shows these steps near the quest description and done condition. The steps read like practical guidance, not technical decomposition or generic productivity tasks.

Quest Steps should be:

- quest-agnostic as a product pattern, not special-cased for one goal domain
- specific to the Quest and Adventure context
- ordered when sequence matters
- concrete enough that the User can act on each step
- phrased as user-facing actions, decisions, checks, or artifacts
- short enough to reduce overwhelm

Every Main Quest and Side Quest should include **2–7 Quest Steps**, with **3–5 preferred**. One step is usually too vague; more than seven starts to feel like project management. Boss Fights should not show Quest Steps in this version.

## MVP Scope

- Generate Quest Steps for every Main Quest and Side Quest during Adventure creation.
- Use 2–7 Quest Steps per Main/Side Quest, with 3–5 preferred.
- Keep Quest Steps concrete, ordered where useful, and tied to real-world progress.
- Show Quest Steps in read-only quest detail on the Adventure Detail Page.
- Ensure Boss Fights do not receive or display Quest Steps.
- Revise existing Adventure generation/content evals where Quest Steps change expected output quality.
- Add new eval coverage if existing evals cannot validate Quest Step quality, count, applicability, and Boss Fight exclusion.

## Out of Scope

- Marking Quest Steps pending/done.
- Quest ready-to-complete behavior.
- Auto-completing Quests from completed steps.
- Editing, adding, removing, or reordering Quest Steps in the UI.
- Updating Quest Steps through Game Master chat.
- Goal-specific worksheets, generated artifacts, templates, shopping-list builders, or richer interactive tools.
- Applying Quest Steps to Boss Fights.

## Success Signals

- Generated Main Quests and Side Quests consistently include useful Quest Steps.
- Users can understand how to start a selected Quest without needing to infer their own checklist.
- Quest detail feels more actionable and less like a high-level task description.
- Evals catch prompt regressions where Quest Steps are missing, vague, too numerous, too sparse, not quest-specific, or incorrectly attached to Boss Fights.
- Adventure generation remains RPG-native and readable despite the added guidance.

## Business-Level Acceptance Criteria

- Every generated Main Quest and Side Quest includes 2–7 Quest Steps, with most using 3–5 unless the Quest is unusually simple or complex.
- Quest Steps are visible in read-only mode when a User views Main Quest or Side Quest detail.
- Quest Steps describe concrete user actions, decisions, checks, or artifacts that help complete the Quest.
- Quest Steps are specific to the Quest and Adventure context, not generic filler.
- Boss Fights do not include Quest Steps.
- The existing done condition, reward, skill rewards, and inventory references remain visible and meaningful alongside Quest Steps.
- Existing evals are revised where their expected generated content shape changes.
- New eval checks are added if needed to validate Quest Step count, usefulness, concreteness, ordering, quest specificity, quest-agnostic behavior, and Boss Fight exclusion.

## Risks / Tradeoffs

- Too many steps could make RPGizer feel like a project-management tool rather than a playable Adventure.
- Vague or repetitive steps could create false confidence without improving actionability.
- Overly domain-specific evals could accidentally optimize for cooking-style checklists instead of quest-agnostic guidance.
- Adding more generated content increases the need for eval discipline so prompt quality remains stable.
- Read-only Quest Steps improve guidance but may create an expectation for interactive step tracking, which is intentionally deferred.
