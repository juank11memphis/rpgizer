# Feature Ideas

## Interview Output Artifact Generation

- Add a separate AI interaction after the goal interview that reads the full conversation transcript and produces a compact structured JSON/object artifact.
- The artifact should summarize the conversation in a way another AI interaction can reliably consume later to generate the full RPG adventure.
- Treat the overall flow as three distinct AI steps:
  1. Run the interview itself.
  2. Generate the interview output artifact from the transcript.
  3. Generate the full adventure from that artifact, including quests, skills, inventory, milestones, rewards, and related RPG structures.
- The artifact should preserve important discovery signals such as the core why, success definition, current stage, existing inventory/resources, blockers, constraints, readiness, and emotional drivers without requiring later prompts to reread the entire transcript.

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

## Structured JSON Application Logging

- Improve app observability with structured JSON logs for important good and bad events across RPGizer.
- Log successful flows such as sign-in, draft creation, interview turn completion, AI readiness changes, and adventure generation milestones.
- Log failure flows such as auth callback errors, database failures, AI provider errors, validation failures, and unexpected server exceptions.
- Logs should be machine-readable with consistent fields like event name, severity, timestamp, request/user/session context where safe, adventure ID where relevant, and error metadata.
- Do not log secrets, OAuth tokens, full sensitive prompts, or private user content unless explicitly designed and redacted.

## AI Cost Tracking by Product Flow

- Add optional AI cost tracking controlled by an environment variable, for example `AI_COST_TRACKING_ENABLED=true`.
- Track estimated AI spend at the product-flow level, not only individual provider calls.
- For the goal interview, report the total estimated cost of the entire interview from first prompt through readiness, rather than focusing on each OpenAI call in isolation.
- Keep per-call usage available internally so totals can be aggregated by interaction, draft, adventure, user/session, feature, and time window.
- Emit structured JSON logs or metrics with safe metadata such as feature name, adventure ID, model, token totals, call count, estimated total cost, and completion status.
- Label costs as estimated unless pricing is resolved from an authoritative/current pricing source.
- Avoid logging prompts, transcript content, secrets, OAuth tokens, or other sensitive user data.
- Consider a durable cost ledger later if logs alone are not enough for debugging, budgeting, analytics, or user-facing cost reports.
