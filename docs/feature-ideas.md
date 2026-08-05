# Feature Ideas

## Internationalization and Language Selector

- Add app internationalization so RPGizer can support multiple languages.
- Include a language selector in the UI.
- Initial supported languages: English and Spanish.
- The RPG/gamified tone should be preserved in both languages, not translated in a flat or generic way.
- Internationalization should apply to both static UI copy and AI-generated user-facing content.
- The interview AI should respond in the selected language, not merely infer language from the latest message.
- Future adventure generation should generate user-facing adventure content in the selected language.
- Keep internal schema/object keys stable in English, such as `quests`, `skills`, and `inventory`, even when the user-facing language is Spanish.
- Localize UI labels separately, for example render `quests` as “Quests” in English and “Misiones” in Spanish.
- Avoid mixed-language experiences where JSON keys, UI labels, interview responses, and generated adventure content drift between English and Spanish.

## AI Cost Tracking by Product Flow

- Add optional AI cost tracking controlled by an environment variable, for example `AI_COST_TRACKING_ENABLED=true`.
- Track estimated AI spend at the product-flow level, not only individual provider calls.
- For the goal interview, report the total estimated cost of the entire interview from first prompt through readiness, rather than focusing on each OpenAI call in isolation.
- Keep per-call usage available internally so totals can be aggregated by interaction, draft, adventure, user/session, feature, and time window.
- Emit structured JSON logs or metrics with safe metadata such as feature name, adventure ID, model, token totals, call count, estimated total cost, and completion status.
- Label costs as estimated unless pricing is resolved from an authoritative/current pricing source.
- Avoid logging prompts, transcript content, secrets, OAuth tokens, or other sensitive user data.
- Consider a durable cost ledger later if logs alone are not enough for debugging, budgeting, analytics, or user-facing cost reports.

## Product Quality Evaluation Evolution

- Add persisted eval run history so maintainers can review previous local eval outcomes.
- Explore hosted deployment for the eval dashboard when local-only maintainer tooling is no longer enough.
- Add CI integration so eval suites can participate in pre-merge or release quality checks.
- Add charts and trends for eval outcomes over time.
- Add prompt comparison workflows to compare eval behavior across prompt or model changes.
- Explore LLM-as-judge evaluation for subjective quality checks that deterministic validations cannot cover.
- Add fixture editing or fixture authoring workflows for maintainers.
- Explore production monitoring if Product Quality Evaluation needs to connect to live product-health signals later.

## Deeper Adaptive Goal Interview

- Make the initial interview gather richer goal context before planning.
- Capture motivation, taste/preferences, dislikes, prior attempts, fears, constraints, tools/resources, skill level, and what “beginner” means for this user.
- Ask adaptive follow-up questions until RPGizer can generate the first useful milestone confidently.
- Avoid over-interviewing; stop once the next milestone can be made concrete and safe.

## Iterative Act Builder with Quest Approval

- After the deeper interview, generate only the first Act theme and overall Act goal instead of the full adventure upfront.
- Make adventure generation much more hand-holding: beginner-friendly, for users who do not know how to start, and baby-step-by-baby-step from basics toward harder work.
- Generate one Quest draft at a time, starting with the first Main Quest.
- Each Quest must still include concrete Quest Steps, but those steps should be much more explicit, basic, and hand-held.
- Present each Quest draft to the user for discussion before approval.
- Let the user ask clarifying questions, say a step feels too hard, mention missing resources, or request simpler instructions.
- Refine the current Quest through conversation until the user approves it.
- Treat Quest discussion as new planning data, not just chat history.
- Let new discussion data update the current Quest draft and future Main Quests, Side Quests, Boss Fights, Inventory Items, Skills, and Achievements.
- After each approved Quest, let the LLM decide the next best unit: another Main Quest, a Side Quest, or the Act Boss Fight.
- Repeat Quest draft → discussion → approval → next-unit decision until the LLM determines the first Act is ready.
- Only then present the full first Act to the user.
- Keep completed or approved content stable unless the user explicitly asks to revise it.
- Keep unapproved and future content flexible so the adventure adapts as the user reveals constraints, confidence, resources, preferences, or prior knowledge.
- Explain that later Acts will come after the current Act is completed or enough new context exists.
