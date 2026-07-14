# Generate Adventure evals

Adventure evals are local, developer-facing checks for live Adventure generation. They call OpenAI through production providers, then run deterministic quality checks against generated output. Ordinary tests use injected fakes and must not call OpenAI.

## Aggregate eval

```bash
pnpm run eval:generate-adventure
```

This exercises the full Adventure generator with fixtures from `src/modules/adventure-planner/evals/fixtures/` and the aggregate prompt. It uses:

- `OPENAI_API_KEY`
- `OPENAI_ADVENTURE_GENERATION_MODEL` (optional; defaults to the shared runtime default)

## Focused step evals

Run these when diagnosing a specific multi-step generation interaction:

```bash
pnpm run eval:adventure-content
pnpm run eval:adventure-linking
pnpm run eval:adventure-xp
```

Each command loads `.env.local` before reading the same runtime configuration as production providers:

- `eval:adventure-content` uses `OPENAI_ADVENTURE_CONTENT_MODEL`, falling back to `OPENAI_ADVENTURE_GENERATION_MODEL`, then the shared default.
- `eval:adventure-linking` uses `OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL`, falling back to `OPENAI_ADVENTURE_GENERATION_MODEL`, then the shared default.
- `eval:adventure-xp` uses `OPENAI_ADVENTURE_XP_BALANCER_MODEL`, falling back to `OPENAI_ADVENTURE_GENERATION_MODEL`, then the shared default.

All focused evals require `OPENAI_API_KEY`. Missing, blank, or placeholder config fails clearly before provider creation. Live runs may incur OpenAI cost.

## Focused diagnostic areas

- Content diagnostics cover required unlinked structure, Acts, Quests, Boss Fights, Skills, Inventory, Achievements, focused next actions, fixture grounding, high-stakes safety, and accidental dependency/XP fields.
- Linking diagnostics cover Quest/Boss coverage, duplicate rows, unknown Skill/Inventory references, missing Skill links, weak expected Inventory coverage, and accidental XP fields.
- XP diagnostics cover Quest/Boss coverage, duplicate rewards, unlinked Skill XP, XP bounds, Boss Fight rewards, proportionality, and accidental content/link rewrites.

Failures print one concise diagnostic per issue:

```txt
[spanish-coffee-chat] references: questLinks is missing coverage for quest-speaking-sprint.
[runner] configuration: OPENAI_API_KEY is required to run Adventure content generation evals.
```

## Fixture coverage

- Aggregate/content evals use `src/modules/adventure-planner/evals/fixtures/*.json` request fixtures.
- Dependency-linking evals use representative unlinked content fixtures in `fixtures/linking/*.json`.
- XP evals use linked content fixtures in `fixtures/xp/*.json`.

Do not paste or commit secret values in docs, fixtures, logs, or review notes.

## Relationship to ordinary tests

Run normal validation separately:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
```

These commands should pass without OpenAI credentials. The eval runner tests use injected providers, temporary fixtures, and deterministic checks only.

## Known limitations

- Deterministic checks cannot fully judge subjective Adventure quality.
- Live evals depend on credentials, network availability, model behavior, and possible cost.
- Model nondeterminism may occasionally require fixture or prompt tuning.
- There is no hosted dashboard, persistence, LLM-as-judge layer, or automated prompt optimization.
