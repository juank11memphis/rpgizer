# Capabilities Map

## Purpose

This Capabilities Map translates RPGizer's Product Vision and Business Domain Model into business/product abilities. It describes what the product must be able to do, organized by subdomain, without prescribing implementation structure.

RPGizer's core capability is turning a real-life goal into a playable Adventure that helps the User take action through RPG-style progression. Public product introduction supports that loop by helping Visitors understand the promise and choose to start. Product Quality Evaluation supports that promise internally by helping maintainers run and analyze local evals for AI-assisted product behavior before changes ship.

## Capability Map

### Core Subdomains

#### Adventure Creation

- **Start a New Adventure**: Let a User begin a new Adventure from a real-life Goal they want to achieve.
- **Capture Goal Context One Question at a Time**: Guide the User through a focused Interview that gathers the minimum useful context without overwhelming them.
- **Assess Adventure Readiness**: Decide whether enough context exists to generate a specific, actionable Adventure, or whether the Game Master should ask another question.
- **Generate a Playable Roadmap**: Transform the clarified Goal into an RPG-style Roadmap with Acts, Main Quests, Side Quests, Boss Fights, Skills, Inventory, Achievements, and clear next actions.
- **Generate Guided Quest Steps**: Break Main Quests and Side Quests into concrete pending/done steps that show the User how to complete the Quest without turning Boss Fights into checklist tasks.
- **Communicate Adventure Generation Progress**: Help the User understand and trust the long-running forge from confirmed Interview to generated Adventure by showing truthful, RPG-facing progress, success, and recoverable failure states.
- **Ground RPG Elements in Real Progress**: Ensure every generated quest, boss, skill, inventory item, and achievement maps back to real-world action or readiness.
- **Create Goal-Specific RPG Flavor**: Give each Adventure a playful theme and old-school RPG feel while preserving clarity and usefulness.
- **Maintain Coherent RPG Semantics**: Ensure quests, boss fights, skills, inventory, achievements, XP, and progression feel like one coherent RPG system rather than disconnected labels.

#### Adventure Progression

- **Track Quest Step Progress**: Let the User mark individual Quest Steps as pending or done so progress is visible before the whole Quest is complete.
- **Surface Quest Readiness**: Show when all Quest Steps are done and the Quest is ready to complete while preserving manual Quest completion.
- **Complete Quests**: Let the User manually mark Main Quests and Side Quests as complete, making real action visible.
- **Complete Boss Fights**: Let the User manually complete major milestone challenges that prove readiness to advance or finish a phase.
- **Acquire Inventory Items**: Let the User mark practical tools, resources, documents, accounts, or materials as acquired.
- **Award Skill XP**: Translate completed Quests and Boss Fights into XP for one or more Adventure-specific Skills.
- **Level Up Skills**: Show meaningful growth in real-life capabilities as Skill XP accumulates.
- **Unlock Achievements**: Automatically recognize meaningful progress patterns, including quest completion, boss completion, skill leveling, and important inventory acquisition.
- **Track Adventure State**: Move Adventures through Drafting, Generated, In Progress, Completed, and Archived states.
- **Surface Momentum**: Make progress feel visible, rewarding, and motivating so the User wants to keep acting.

#### Game Master Assistant

- **Guide the Interview**: Act as the warm, RPG-savvy assistant that asks one focused question at a time before generation.
- **Generate the Adventure**: Use the Interview context to create a strong first Roadmap without requiring the User to micromanage the plan.
- **Explain the Roadmap**: Help the User understand why quests, skills, boss fights, achievements, and inventory items exist.
- **Discuss Adventure Progress**: Let the User talk through the Adventure, ask for clarification, or reflect on what to focus on next.
- **Update Roadmap Through Chat**: Let the User request targeted changes through conversation, such as replacing an impossible Side Quest with a better alternative.
- **Update Quest Steps Through Chat**: Let the User ask the Game Master to clarify, add, remove, or replace Quest Steps while preserving the Quest's intent and done condition.
- **Preserve Adventure Intent**: Keep roadmap updates focused and consistent with the larger Goal unless the User explicitly asks for a bigger rethink.
- **Maintain Safe Guidance Boundaries**: Keep high-stakes guidance structural and non-authoritative rather than pretending to provide expert advice.

### Supporting Subdomains

#### Public Product Introduction

- **Introduce the Playable-Goal Promise**: Help a Visitor quickly understand that RPGizer turns real-life goals into playable Adventures, not generic task lists.
- **Create RPG-Native Excitement**: Use old-school RPG energy, language, and examples to make the product feel adventurous before a Visitor signs in or starts.
- **Explain the Product Value Clearly**: Show how RPGizer reduces overwhelm by turning vague ambition into focused questions, quests, boss fights, skills, inventory, achievements, and next actions.
- **Build Start-Enough Trust**: Communicate that RPGizer creates a motivating first path while preserving user agency and avoiding guaranteed-outcome or expert-advice claims.
- **Invite Adventure Creation**: Give Visitors a strong primary call to action to start a new Adventure and a softer path to see how the product works before committing.

#### User Identity

- **Authenticate with Google**: Let Users sign in through Google for the MVP.
- **Own Adventures**: Associate each Adventure with the User who created it.
- **Return to Active Adventures**: Let authenticated Users come back to the Adventures they have started.

#### Adventure Presentation

- **Show the Adventure Detail Page**: Present the generated Adventure as the main place to review, follow, and discuss the roadmap.
- **Visualize Acts and Phases**: Make the Adventure feel like chapters of progression, not a flat task list.
- **Present Main Quests and Side Quests Clearly**: Distinguish required critical-path progress from optional but meaningful Side Quests.
- **Present Quest Steps Clearly**: Show concrete Quest Steps inside Main Quest and Side Quest detail so the User can see how to progress without leaving the Adventure to invent the next actions.
- **Highlight Boss Fights**: Make major challenge milestones feel special and motivating.
- **Display Skill Progression**: Show Skill XP and levels as visible real-life capability growth.
- **Display Inventory Readiness**: Show Inventory Items as practical things the User can acquire to prepare for action.
- **Display Achievements**: Show unlocked and available Achievements as recognition of meaningful progress.
- **Expose Focused Next Actions**: Help the User quickly understand what they can work on now.
- **Keep the Experience RPG-Native**: Present progress with playful RPG energy while avoiding clutter, confusion, or boring productivity-dashboard patterns.

#### Safety & Trust

- **Identify High-Stakes Goal Areas**: Recognize when a Goal touches medical, legal, financial, safety-critical, or expert-advice territory.
- **Constrain Generated Guidance**: Keep generated roadmaps safe, structural, and non-authoritative when expert judgment is required.
- **Communicate Plan Limits**: Make it clear that RPGizer provides a motivating first path, not a guarantee of success.
- **Protect User Agency**: Keep the User in control of decisions, progress, and adaptation.

#### Product Quality Evaluation

- **Identify Available Eval Suites**: Let a Maintainer see the local eval suites available for checking Game Master interviews, Adventure content, dependency linking, XP balancing, or full Adventure generation.
- **Run a Selected Eval Suite Locally**: Let a Maintainer trigger one local Eval Run for a selected suite without turning the workflow into hosted reporting or production monitoring.
- **Check Eval Configuration**: Detect missing, placeholder, or invalid local credentials and model settings so a blocked Eval Run is reported as a Configuration Blocker rather than a product-quality failure.
- **Evaluate Test Cases Against Product Expectations**: Use representative Eval Test Cases to check whether AI-assisted behavior still matches RPGizer's quality expectations for useful interviews, actionable roadmaps, coherent RPG semantics, safe boundaries, and grounded real-world progress.
- **Compare Prompt / Model Variants**: Let a Maintainer evaluate named prompt versions, model choices, or equivalent behavior variants side by side within a local Eval Run.
- **Analyze Results as an Eval Matrix**: Present current-run results with Test Cases as rows, Prompt / Model Variants as columns, and Eval Cells as the unit of output, metrics, assertions, and diagnostics.
- **Show Eval Metrics**: Surface latency, token count, and cost at cell and aggregate levels when provider data is available, while treating unavailable metrics as missing information rather than product-quality failures.
- **Show Assertion Outcomes**: Make passed and failed assertions visible for each Eval Cell so the Maintainer can quickly see which expectations held and which need attention.
- **Focus Eval Analysis**: Let a Maintainer narrow the current Eval Matrix to failures, specific input variables, or selected Prompt / Model Variants so debugging stays fast and dense.
- **Inspect Eval Cell Details**: Let a Maintainer drill into a cell to understand the generated output, relevant prompt/model context, assertion details, and expected/golden comparison when available.
- **Inspect Local-Only Raw Eval Artifacts**: Let a Maintainer inspect raw prompts, provider request/response payloads, generated outputs, and comparison artifacts for local debugging only, with secret and credential exposure remaining out of bounds.
- **Report Eval Run Outcomes**: Show whether an Eval Run passed, failed with diagnostics, or was blocked by configuration so the Maintainer can quickly understand the run state.
- **Surface Safe Actionable Diagnostics**: Provide failure feedback that points to the affected Test Case, Eval Cell, assertion, or quality area without exposing secrets, credentials, API keys, session tokens, or unrelated sensitive data.
- **Keep Eval Feedback Maintainer-Facing**: Keep Product Quality Evaluation local and internal in the MVP, separate from user-facing analytics, production monitoring, CI trend reporting, hosted dashboards, persistent history, or public quality scores.

### Generic / External Capabilities

- **Google Authentication**: External identity provider capability used by User Identity.
- **LLM Conversation and Generation**: External AI capability used by the Game Master Assistant for interviews, roadmap generation, explanation, chat-based updates, and live Product Quality Evaluation runs, including provider metrics and local-only raw debugging artifacts when available.
- **Expert Advice Domains**: External knowledge and professional judgment domains that RPGizer must not claim to replace.

## Capability Dependencies / Sequencing

1. **Public Product Introduction** helps Visitors understand RPGizer and choose whether to start.
2. **Invite Adventure Creation** routes interested Visitors toward **Start a New Adventure**, with **See How It Works** as a lower-commitment path.
3. **Authenticate with Google** enables Users to own and return to Adventures.
4. **Start a New Adventure** begins the core product loop.
5. **Capture Goal Context One Question at a Time** must happen before generation.
6. **Assess Adventure Readiness** determines whether to continue the Interview or generate the Roadmap.
7. **Generate a Playable Roadmap** and **Generate Guided Quest Steps** create the first usable Adventure Detail Page.
8. **Communicate Adventure Generation Progress** keeps the User oriented during the forge when generation takes long enough that silent waiting would undermine trust.
9. **Adventure Presentation** must make the generated structure feel RPG-native, actionable, and guided through visible Quest Steps.
10. **Adventure Progression** capabilities let the User complete Quest Steps, complete Quests, acquire Inventory, gain XP, level Skills, unlock Achievements, and build momentum.
11. **Game Master Assistant roadmap updates** let the User adapt the Adventure and Quest Steps through chat without direct manual content editing.
12. **Safety & Trust** constrains public claims, generation, and update capabilities, especially for high-stakes Goals.
13. **Product Quality Evaluation** supports maintainers before changes ship by selecting an Eval Suite, checking local configuration, running Test Cases, comparing Prompt / Model Variants, analyzing the Eval Matrix, focusing on failures or selected variants, inspecting local-only raw artifacts, reporting passed/failed/blocked outcomes, and surfacing safe diagnostics.

## Known Gaps / Evolution Notes

- Public product introduction should stay focused on helping Visitors start; richer marketing pages, pricing, community proof, or content marketing can evolve later.
- Cross-adventure character/player identity is future evolution, not MVP.
- Manual roadmap content editing is not MVP; content changes happen through the Game Master Assistant.
- Whole-roadmap regeneration is not MVP; updates should be targeted through chat.
- Goal-specific templates or special handling may emerge for travel, learning, fitness, career, creative projects, and product building.
- Side Quest quality is a major product differentiator and should receive special attention.
- Quest Steps should remain quest-agnostic guidance; richer goal-specific worksheets, generated artifacts, or templates can evolve later.
- Boss Fight design must feel challenging and fun without discouraging the User.
- Inventory may later evolve into richer readiness workflows, shopping/checklists, or integrations, but should remain practical and goal-connected.
- The Game Master may later need a stronger character identity, name, voice, or lore.
- Product Quality Evaluation is local-only in the MVP; hosted dashboards, persistent run history, CI trend reporting, richer Test Case management, artifact export, and LLM-as-judge workflows are future evolution.
