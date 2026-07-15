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
