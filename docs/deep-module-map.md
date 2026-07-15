# Deep Module Map

## Purpose

This Deep Module Map defines durable implementation boundaries for RPGizer. It guides technical design, feature briefs, and implementation planning by identifying modules with simple outside promises and meaningful hidden complexity.

The map is derived from the Product Vision, Business Domain Model, Capabilities Map, and module-boundary review. It intentionally avoids prescribing folders, services, APIs, database tables, or framework structure.

## Modules

### Public Product Introduction

- Suggested module slug: `public-product-introduction`
- Simple interface / outside promise: Prepare the public landing experience so Visitors understand RPGizer, feel invited by the RPG-native promise, and can choose to start an Adventure.
- Hidden complexity:
  - Translating RPGizer's product promise into clear Visitor-facing hierarchy.
  - Choosing which RPG concepts to preview before an Adventure exists.
  - Keeping public RPG flavor exciting, mature, and non-childish.
  - Composing example goal-to-Adventure transformations that explain value without testimonials or pricing.
  - Balancing the primary start CTA with lower-commitment education such as “See How It Works.”
  - Avoiding guaranteed-success, expert-advice, or overhyped marketing claims.
  - Preserving a clean handoff from public introduction into Adventure Creation / authentication as needed.
- Owns:
  - Visitor-facing product introduction semantics.
  - Landing-page content structure and CTA intent.
  - Public examples that explain RPGizer's playable-goal promise.
  - Public-facing RPG tone boundaries before an Adventure exists.
  - The handoff intent from Visitor interest to starting an Adventure.
- Does not own:
  - Authenticated User identity or Google authentication mechanics.
  - The Adventure Creation flow after a Visitor starts.
  - Generated Roadmap content.
  - Presentation of real User-owned Adventures.
  - RPG semantic definitions as a reusable system.
  - UI component rendering or framework layout implementation.
- Key scenarios:
  - A Visitor lands on RPGizer and needs to understand the product in seconds.
  - A Visitor uses “See How It Works” to learn the goal-to-Adventure flow before starting.
  - A Visitor sees a fictional Adventure Log preview that explains quests, boss fights, skills, and inventory without requiring an existing Adventure.
  - A Visitor chooses “Start a New Adventure” and is routed toward Adventure Creation.
- Related modules:
  - Uses RPG Metaphor System for public RPG language and tone guardrails.
  - Hands interested Visitors toward User Identity and Adventure Creation boundaries.
  - Must not depend on Adventure Experience Presenter because no real Adventure exists yet.
- Boundary notes:
  - This module owns public introduction, not the core product loop.
  - It should stay narrow until richer marketing pages, pricing, social proof, or content marketing become real product needs.
  - It may use fictional examples, but those examples must not become generated Adventure content.

### User Identity

- Suggested module slug: `user-identity`
- Simple interface / outside promise: Know who the current User is, authenticate them through Google, and enforce that Users only access Adventures they own.
- Hidden complexity:
  - Google authentication details.
  - Session state and current-user resolution.
  - Sign-in and sign-out lifecycle.
  - User creation/linking from external identity.
  - Adventure ownership checks.
  - Consistent authorization failures.
- Owns:
  - User identity and authentication state.
  - Mapping Google-authenticated people to RPGizer Users.
  - Ownership enforcement for User-owned Adventures.
  - The rule that every Adventure belongs to one User.
- Does not own:
  - Adventure roadmap content.
  - Progression rules.
  - Game Master conversation behavior.
  - Generic database access for other modules.
- Key scenarios:
  - A visitor signs in with Google.
  - A returning User sees their Adventures.
  - A User attempts to access an Adventure they do not own.
- Related modules:
  - Game Master Assistant needs current-user context for guided conversations.
  - Adventure Planner generates Adventures for a specific User-owned draft.
  - Progression Engine applies progress only to User-owned Adventures.
  - Adventure Experience Presenter prepares only authorized Adventure views.
- Boundary notes:
  - This module is intentionally included even though Google auth is external, because RPGizer needs a stable internal promise around current User and Adventure ownership.

### Game Master Assistant

- Suggested module slug: `game-master-assistant`
- Simple interface / outside promise: Continue the User's guided Adventure conversation, from interview to generation to explanation to chat-based roadmap updates.
- Hidden complexity:
  - One-question-at-a-time interview flow.
  - Conversation continuity and message history.
  - Context selection for LLM calls.
  - Prompt construction and response shaping.
  - Intent detection: interview answer, generate request, explanation request, progress discussion, or roadmap update request.
  - Readiness assessment before generation.
  - Safe, non-authoritative handling of high-stakes goals.
  - Routing generation and update work to Adventure Planner without exposing planning internals.
- Owns:
  - The Game Master role as the AI assistant and product guide.
  - Interview orchestration.
  - Conversation memory needed to continue the Adventure discussion.
  - Deciding whether to ask another question or request Adventure generation.
  - Interpreting user-triggered roadmap update requests.
  - Explaining the Roadmap in RPG-savvy, grounded language.
- Does not own:
  - Final roadmap structure and quality rules.
  - RPG semantic rules as a reusable system.
  - Applying progress events, XP, levels, or achievements.
  - UI presentation models.
  - User authentication or ownership.
- Key scenarios:
  - The User starts a new Adventure and the Game Master asks the first question.
  - The User answers interview questions until enough context exists.
  - The Game Master requests a generated Adventure from Adventure Planner.
  - The User asks why a Boss Fight or Side Quest exists.
  - The User says a Side Quest is not possible and asks for an alternative.
- Related modules:
  - Calls Adventure Planner for generation and targeted roadmap revision.
  - Uses User Identity for current User and ownership context.
  - Must respect cross-module Safety & Trust rules.
  - May use Adventure Experience Presenter output to explain visible roadmap structure.
- Boundary notes:
  - The Game Master Assistant orchestrates and converses; it should not assemble the roadmap recipe itself.
  - Roadmap updates through chat are MVP, but direct manual content editing is not.

### Adventure Planner

- Suggested module slug: `adventure-planner`
- Simple interface / outside promise: Create or revise a coherent, actionable, RPG-style Adventure Roadmap from clarified User intent.
- Hidden complexity:
  - Transforming interview context into Acts, Main Quests, Side Quests, Boss Fights, Skills, Inventory, Achievements, and next actions.
  - Deciding roadmap shape, phase boundaries, milestone placement, and quest granularity.
  - Preserving the Goal while making it playable.
  - Balancing required Main Quests with interesting optional Side Quests.
  - Designing Boss Fights as meaningful challenge milestones.
  - Designing Adventure-specific Skills and XP opportunities.
  - Suggesting practical Inventory Items tied to readiness.
  - Defining Achievement unlock conditions.
  - Validating roadmap quality before exposing it.
  - Producing targeted revisions that preserve larger Adventure coherence.
- Owns:
  - Generated Roadmap structure and quality.
  - The rules that generated RPG elements map to real-world progress.
  - Quest done conditions.
  - Side Quest meaningfulness.
  - Boss Fight milestone quality.
  - Practical Inventory recommendations.
  - Generated Skill and Achievement definitions.
  - Targeted roadmap revision semantics.
- Does not own:
  - Conversation flow or prompt memory.
  - User authentication.
  - Applying completed progress events.
  - Presentation/view-model decisions.
  - Low-level RPG metaphor definitions when those can be delegated to RPG Metaphor System.
- Key scenarios:
  - Generate the first Roadmap after the Interview reaches readiness.
  - Replace one impossible Side Quest while preserving the Act and Goal.
  - Validate that every Quest has a clear done condition.
  - Ensure Inventory Items are real-world readiness items rather than random loot.
- Related modules:
  - Called by Game Master Assistant.
  - Uses RPG Metaphor System for coherent RPG semantics and constraints.
  - Produces Roadmap structures consumed by Progression Engine and Adventure Experience Presenter.
- Boundary notes:
  - Adventure Planner owns the plan, not the conversation.
  - It should hide generation recipe details from callers.
  - It should not become a generic LLM wrapper.

### RPG Metaphor System

- Suggested module slug: `rpg-metaphor-system`
- Simple interface / outside promise: Provide coherent RPG semantics, constraints, and flavor guidance so RPGizer feels like a real RPG rather than a productivity app with labels.
- Hidden complexity:
  - RPG vocabulary and concept rules.
  - How Main Quests, Side Quests, Boss Fights, Skills, Inventory, Achievements, XP, levels, and progression should differ.
  - What makes RPG flavor motivating instead of cringe or confusing.
  - Intensity and thematic fit for different goal types.
  - Consistency between generated roadmap structure, progress meaning, and presentation language.
  - Future variation in genre, theme, tone, or look-and-feel.
- Owns:
  - RPG concept semantics.
  - Constraints for RPG-native naming and framing.
  - Guidance for how RPG elements should feel and relate.
  - Reusable rules that keep generated and presented Adventures coherent.
- Does not own:
  - The final generated Roadmap.
  - Skill XP calculation or progression state changes.
  - Chat orchestration.
  - UI layout or component decisions.
  - User identity.
- Key scenarios:
  - Adventure Planner asks how to frame a difficult milestone as a Boss Fight.
  - Adventure Planner asks whether a candidate Side Quest feels meaningful or like filler.
  - Adventure Experience Presenter asks how to label or group RPG progress concepts consistently.
  - Public Product Introduction asks how to preview RPG concepts for Visitors without making the product feel childish or confusing.
  - Game Master Assistant needs RPG-savvy language that stays clear and grounded.
- Related modules:
  - Used by Adventure Planner during generation and revision.
  - Informs Progression Engine's progression meaning without owning state changes.
  - Informs Adventure Experience Presenter framing without owning UI.
  - Informs Public Product Introduction's public RPG tone without owning landing-page composition.
  - Informs Game Master Assistant voice without owning conversation.
- Boundary notes:
  - This module must stay narrow. It owns RPG semantics and constraints, not every RPG-related behavior.
  - If it becomes a vague “RPG everything” module, responsibilities should move back to Planner, Progression, or Presenter.

### Progression Engine

- Suggested module slug: `progression-engine`
- Simple interface / outside promise: Apply User progress events and update Adventure progress consistently.
- Hidden complexity:
  - Quest completion effects.
  - Boss Fight completion effects.
  - Inventory acquisition effects.
  - Skill XP awarding.
  - Skill level-up thresholds and outcomes.
  - Achievement unlock checks.
  - Adventure state transitions.
  - Progress summaries and momentum signals.
  - Preventing invalid or duplicate progress effects.
- Owns:
  - Manual Quest and Boss completion effects.
  - Manual Inventory acquisition effects.
  - Skill XP and level changes.
  - Achievement unlocks.
  - Adventure lifecycle transitions driven by progress.
  - The core momentum event: Quest Completed.
- Does not own:
  - Roadmap generation or content edits.
  - Game Master conversation.
  - Authentication or ownership.
  - RPG semantic definitions except as needed to apply progression rules.
  - UI presentation decisions.
- Key scenarios:
  - The User completes a Side Quest and gains XP in linked Skills.
  - The User completes a Boss Fight and advances a major milestone.
  - The User acquires an Inventory Item and unlocks a readiness Achievement.
  - A Skill crosses a level threshold and levels up.
  - The final Boss Fight is completed and the Adventure becomes Completed.
- Related modules:
  - Consumes Roadmap structures created by Adventure Planner.
  - May consult RPG Metaphor System for progression meaning.
  - Outputs progress state used by Adventure Experience Presenter.
  - Requires User Identity ownership checks before applying changes.
- Boundary notes:
  - Achievement unlocking stays inside this module for MVP.
  - The module should let callers say “complete this quest” or “acquire this item” without knowing cascading XP, level, achievement, and state rules.

### Adventure Experience Presenter

- Suggested module slug: `adventure-experience-presenter`
- Simple interface / outside promise: Prepare an Adventure for RPG-native display so the User can understand the path, choose a next action, and feel momentum.
- Hidden complexity:
  - Organizing Acts, Quests, Boss Fights, Skills, Inventory, Achievements, and progress into a playable experience.
  - Choosing what to emphasize as the next useful action.
  - Presenting required vs optional progress clearly.
  - Making Boss Fights feel special.
  - Summarizing Skill levels and XP meaning.
  - Showing Inventory readiness without making it feel like a shopping list.
  - Handling Drafting, Generated, In Progress, Completed, and Archived states.
  - Supporting future theme/look-and-feel variations by Adventure type.
  - Avoiding boring productivity-dashboard patterns.
- Owns:
  - Adventure-facing presentation models.
  - RPG-native grouping and emphasis for display.
  - Next-action presentation.
  - View-ready summaries of progress, Skills, Inventory, Boss Fights, and Achievements.
  - Presentation rules for different Adventure states.
- Does not own:
  - Actual UI component implementation choices.
  - Public landing-page introduction before an Adventure exists.
  - Roadmap generation.
  - Progress state mutation.
  - Game Master conversation.
  - Authentication.
- Key scenarios:
  - The generated Adventure lands on the Adventure Detail Page.
  - The User returns to an In Progress Adventure and needs to know what to do next.
  - The User views Skills, Inventory, Achievements, and Boss Fights as an RPG experience.
  - A future Adventure theme changes the look and feel without changing core domain rules.
- Related modules:
  - Consumes Adventure and progress state from Adventure Planner and Progression Engine outputs.
  - Uses RPG Metaphor System guidance for coherent RPG framing.
  - Uses User Identity indirectly to ensure only authorized Adventures are presented.
  - May provide context that Game Master Assistant can reference when explaining the visible Adventure.
- Boundary notes:
  - This is a deep module because presentation is a major product differentiator, not a thin screen wrapper.
  - It should hide view-model and experience-shaping decisions from feature code.
  - If it changes roadmap content, that belongs to Adventure Planner; if it reframes existing content for display and action, it belongs here.

### Product Quality Evaluation

- Suggested module slug: `product-quality-evaluation`
- Simple interface / outside promise: Run a local product-quality Eval Suite and return a safe, maintainer-facing Eval Result.
- Hidden complexity:
  - Discovering and describing available Eval Suites without exposing implementation commands as the public abstraction.
  - Checking local credentials, model settings, and runtime configuration before treating a run as a product-quality signal.
  - Distinguishing Configuration Blockers from actual product-quality failures.
  - Orchestrating fixture execution for Game Master interviews, Adventure content, dependency linking, XP balancing, and full Adventure generation.
  - Normalizing suite-level and fixture-level outcomes into passed, failed with diagnostics, or blocked by configuration.
  - Producing concise, safe diagnostics that avoid secrets, raw prompts, raw provider responses, and full generated Adventure payloads.
  - Keeping the workflow local-only and maintainer-facing while leaving room for future history, CI, prompt comparison, or judge workflows.
- Owns:
  - Eval Suite discovery and selection semantics.
  - Eval Run lifecycle and outcome classification.
  - Configuration Blocker detection and reporting.
  - Fixture execution orchestration.
  - Safe diagnostic shaping for maintainers.
  - The local-only boundary for MVP eval feedback.
- Does not own:
  - The product behavior being evaluated.
  - The definition of a good Quest, Side Quest, Boss Fight, Inventory Item, Skill, Achievement, or Roadmap.
  - Game Master conversation policy or readiness semantics.
  - RPG semantic meaning.
  - Safety and high-stakes guidance rules.
  - Hosted dashboards, persistent run history, production monitoring, CI governance, prompt comparison, or LLM-as-judge workflows in the MVP.
- Key scenarios:
  - A Maintainer sees which Eval Suites can be run locally.
  - A Maintainer starts one Eval Run for a selected suite.
  - The run stops as blocked because required local configuration is missing or placeholder.
  - The run executes fixtures and reports passed when all expectations hold.
  - The run executes fixtures and reports failed with actionable diagnostics when product-quality expectations are not met.
  - A Maintainer uses diagnostics to decide whether Game Master, Adventure Planner, RPG Metaphor System, or Safety & Trust behavior needs attention.
- Related modules:
  - Exercises Game Master Assistant behavior for interview quality and safe conversational guidance.
  - Exercises Adventure Planner behavior for Roadmap generation, content, linking, XP, and quality checks.
  - Relies on RPG Metaphor System meaning when interpreting RPG-native coherence.
  - Must respect Safety & Trust rules for high-stakes boundaries and safe diagnostic output.
  - May inform future work in Adventure Experience Presenter if presentation-oriented evals are added later.
- Boundary notes:
  - This module owns eval orchestration and feedback, not the underlying product-quality meaning.
  - Product-quality expectations should point back to the module that owns the behavior being judged.
  - If eval history, dashboards, CI trend reporting, prompt/model comparison, or LLM-as-judge workflows become real needs, this module can expand or spawn a separate deeper module; the MVP should not pre-commit to those responsibilities.

## Cross-Module Rules

- **Product Quality Evaluation reports, it does not redefine product behavior**: Eval orchestration, run outcomes, configuration blockers, and safe diagnostics belong to Product Quality Evaluation; the quality meanings being checked stay with Game Master Assistant, Adventure Planner, RPG Metaphor System, Safety & Trust, or the relevant owning module.
- **Local eval feedback is maintainer-facing**: Product Quality Evaluation must remain local-only in the MVP and must not leak secrets, raw prompts, raw provider responses, or full generated Adventure payloads through diagnostics.
- **Visitor and User boundaries are different**: Public Product Introduction serves Visitors before authentication or Adventure ownership; modules that read, present, generate for, update, or progress real Adventures must operate within the current User's ownership boundary.
- **User ownership applies everywhere after authentication**: Any module that reads, presents, generates for, updates, or progresses a real Adventure must operate within the current User's ownership boundary.
- **No generic persistence module**: Each module owns its own persistence needs internally. Database details should not leak across module interfaces, and there should not be a central “repository module” for all Adventure data.
- **Safety & Trust constrains AI behavior**: Game Master Assistant and Adventure Planner must keep high-stakes guidance structural, safe, and non-authoritative.
- **RPG flavor must serve actionability**: RPG Metaphor System, Public Product Introduction, Adventure Planner, Progression Engine, and Adventure Experience Presenter must keep RPG concepts tied to real-world progress.
- **Roadmap content changes go through the Game Master Assistant**: MVP does not support direct manual content editing. User-requested content changes are interpreted by Game Master Assistant and applied through targeted Adventure Planner revisions.
- **Progress actions are direct and manual**: Quest completion, Boss Fight completion, and Inventory acquisition are manually triggered by the User and applied by Progression Engine.
- **Generated roadmap quality is owned before presentation**: Adventure Planner should not expose a Roadmap that lacks clear done conditions, meaningful Side Quests, practical Inventory, or real-world grounding.
- **Public introduction is not Adventure presentation**: Public Product Introduction can show fictional examples and explain concepts, but real User-owned Adventure display belongs to Adventure Experience Presenter.
- **Presentation is not mutation**: Adventure Experience Presenter prepares view-ready experience models but does not change Adventure state.
- **External integrations stay behind module promises**: Google auth and LLM provider details should be hidden behind User Identity and Game Master Assistant / Adventure Planner boundaries.
