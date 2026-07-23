# Adventure Creation Progress Feature Brief

## Summary

Adventure Creation Progress replaces the current forge success/failure stop with a dedicated waiting experience after the User clicks **Forge My Adventure**. While RPGizer turns the confirmed Interview into a generated Adventure, the User sees truthful, RPG-facing progress stages that make the 30–60 second wait feel intentional, alive, and trustworthy. When generation completes, RPGizer automatically sends the User to the Adventure Detail Page and confirms success with a toast.

## Product Vision Fit

This feature supports RPGizer's promise to move Users from vague ambition to a playable path without making generation feel like a blank technical delay. The waiting moment becomes part of the RPG-native experience: the Game Master is forging the Adventure, balancing rewards, and preparing the next chapter. The feature protects the principle of **one thing at a time** by keeping the User focused on the current transition instead of exposing a half-ready Adventure or forcing them to wonder whether the product is stuck.

## Business Domain Model Fit

This feature sits in **Adventure Creation**, after the Interview is confirmed and before the generated Adventure becomes reviewable on the Adventure Detail Page. It uses existing domain language around the Interview, Game Master, Adventure, Roadmap, Quests, Skills, Inventory, Achievements, and XP. The progress stages should reflect real generation work while staying user-facing and RPG-native. The Adventure Detail Page remains the destination for reviewing and following the generated Roadmap, but its content and layout are out of scope for this feature.

## Capability Coverage

Adventure Creation provides the direct capability coverage:

- **Generate a Playable Roadmap**: The progress experience exists because RPGizer is transforming the confirmed Goal context into an RPG-style Roadmap.
- **Communicate Adventure Generation Progress**: The feature makes long-running generation understandable through truthful progress, success, and recoverable failure states.
- **Ground RPG Elements in Real Progress**: Progress wording must reinforce that quests, skills, inventory, and XP are being prepared to support real-world action, not arbitrary fantasy decoration.
- **Maintain Coherent RPG Semantics**: Stage names and success language should make the forge feel like one coherent RPG system.

Adventure Presentation is touched only as the post-generation destination: the User lands on the Adventure Detail Page after success.

## User / Customer Problem

Adventure generation can take roughly 30–60 seconds and may vary. A blank page, static spinner, or premature empty detail page can make the User think the product froze, failed, or lost their interview work. The User needs reassurance that RPGizer is actively creating the Adventure and that their progress is safe.

## Business Goal

Increase trust and momentum during the highest-friction transition in the core product loop: moving from completed Interview to generated Adventure. The feature should reduce abandonment, confusion, and retry anxiety during generation.

## Target User / Scenario

The target User has completed the Adventure Interview, confirmed the Game Master has enough context, and clicked **Forge My Adventure**. They are motivated to see the generated roadmap but must wait while RPGizer completes creation work.

## Proposed Experience

After clicking **Forge My Adventure**, the User enters a dedicated creation progress page. The page shows a polished RPG-style forge state with a short explanation that the Adventure is being prepared. Progress appears as high-level stages mapped to real backend generation events, using user-facing labels such as:

- Gathering your quest lore
- Building your adventure roadmap
- Connecting quests, skills, and inventory
- Balancing XP and rewards
- Opening your adventure

The page should not show fake precision, raw backend names, logs, IDs, or technical status. If generation succeeds, RPGizer redirects automatically to the Adventure Detail Page and shows a success toast there. If generation fails or stalls, the page shows a friendly failure state with **Retry** and **Back to interview** options.

## MVP Scope

- Replace the current forge success/failure destination with a dedicated Adventure Creation Progress experience.
- Start the experience after the User clicks **Forge My Adventure** from the confirmed Interview state.
- Show truthful, RPG-facing progress stages backed by generation events.
- Cover the main generation stages: interview artifact creation, adventure content generation, relationship linking, and XP/reward balancing.
- Avoid exact percentages unless progress can be measured honestly.
- Auto-redirect to the Adventure Detail Page on success.
- Show a success toast after the redirect.
- Show a friendly failure/stall state with Retry and Back to interview actions.
- Keep error messages safe and non-technical.

## Out of Scope

- Designing or filling the Adventure Detail Page content.
- Manual editing of generated Adventure content.
- Whole-roadmap regeneration.
- Hosted generation history, notifications, or return-later job management.
- Exposing raw backend events, logs, IDs, prompts, provider details, or implementation diagnostics to the User.
- Adding a generic progress system for unrelated workflows.

## Success Signals

- Users understand that RPGizer is actively creating their Adventure during the wait.
- Fewer Users abandon the flow during generation.
- Fewer Users retry because they think generation is stuck when it is still progressing.
- Users arrive at the Adventure Detail Page with a clear success confirmation.
- Failure states feel recoverable and preserve confidence that the Interview work is safe.

## Business-Level Acceptance Criteria

- When a confirmed Interview User clicks **Forge My Adventure**, they are taken to an Adventure Creation Progress experience instead of a static completion page.
- The progress experience communicates generation status with user-facing RPG language, not technical backend labels.
- The displayed stages correspond to real generation progress and do not imply false precision.
- On successful Adventure creation, the User is automatically taken to the Adventure Detail Page.
- After successful redirect, the User receives a clear success confirmation.
- If generation fails or stalls, the User sees a friendly recovery state with Retry and Back to interview options.
- Failure messaging does not expose raw technical details or sensitive implementation information.
- The feature does not require the Adventure Detail Page itself to be complete beyond serving as the success destination.

## Risks / Tradeoffs

- A progress page that feels too decorative could delay the User without adding clarity; every visual element should reinforce status, trust, or anticipation.
- Fake progress percentages would damage trust if generation timing varies widely.
- Overly technical stage names would break the RPGizer voice and may confuse Users.
- Auto-redirect should not happen before generation is truly complete, or the User may land on an empty or inconsistent destination.
- If generation can continue after navigation in the future, the product may need a stronger return-later pattern; that is intentionally not part of this MVP brief.
