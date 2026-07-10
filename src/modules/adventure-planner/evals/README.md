# Generate Adventure evals

Generate Adventure evals are local, developer-facing checks for the live Adventure generator. They call OpenAI through the production Adventure generation path, then run deterministic quality checks against the generated Adventure output.

Use them after changing the Adventure prompt, schema/parser, model configuration, or generator code. They complement ordinary tests; they do not replace typecheck, lint, or unit tests.

## Run the evals

```bash
pnpm run eval:generate-adventure
```

The command reads fixtures from `src/modules/adventure-planner/evals/fixtures/`, loads the production prompt from `src/modules/adventure-planner/infra/prompts/generate-adventure.md`, calls the live Adventure generator once per fixture, and exits nonzero when configuration, generation, parsing, or deterministic quality checks fail.

A passing run prints one concise summary:

```txt
Generate Adventure evals passed: build-a-product, fitness-habit, high-stakes-boundary, learn-a-skill
```

Failures print one diagnostic line per issue:

```txt
[build-a-product] side quest quality: expected generated Adventure to mention user research.
[runner] configuration: OPENAI_API_KEY is required to run Generate Adventure evals.
```

## Required OpenAI configuration

This eval command intentionally uses live OpenAI and loads Next-style environment files such as `.env.local` before reading the same runtime configuration used by the Adventure generator:

- `OPENAI_API_KEY`
- `OPENAI_ADVENTURE_GENERATION_MODEL` (optional; defaults to the shared runtime default)

Missing, blank, or placeholder `OPENAI_API_KEY` values fail the eval command clearly. `OPENAI_ADVENTURE_GENERATION_MODEL` uses the runtime default when unset, and fails only when set to a placeholder value. Failures are not treated as a skip because the purpose of this command is to verify live generation behavior.

Do not paste or commit secret values in docs, fixtures, logs, or review notes.

## Fixture coverage

The initial fixture set is intentionally small and representative:

- `learn-a-skill.json` — learning/skill-building goal: Spanish conversation practice.
- `build-a-product.json` — creative/product-building goal: habit-tracking prototype and beta feedback.
- `fitness-habit.json` — fitness/habit goal: sustainable strength routine with a knee constraint.
- `high-stakes-boundary.json` — high-stakes boundary goal: debt-paydown structure with non-authoritative financial guidance.

Each fixture includes the goal text, compact interview output artifact, transcript context, expected grounding terms, expected Skill and Inventory themes, and forbidden advice patterns.

## Deterministic checks

The checks are conservative heuristics that catch obvious regressions. They verify:

- required Adventure structure: title, theme summary, goal summary, Acts, Skills, Inventory, Achievements, and focused next actions
- each Act includes Main Quests, Side Quests, and Boss Fights
- Quest and Boss Fight done conditions are observable rather than vague
- Side Quests are goal-connected and not obvious filler
- Boss Fights read like milestones, proof points, or challenges
- Inventory Items are practical readiness items rather than random fantasy loot
- Skills describe real capabilities rather than decorative stats
- Achievements have concrete unlock conditions
- Skill rewards and Inventory links reference generated items correctly
- focused next actions are small and concrete
- fixture-specific goal, Skill, and Inventory terms appear in relevant generated content
- high-stakes fixtures include non-authoritative safety notes and avoid configured forbidden advice patterns

The live generator/parser enforces parser-valid Adventure output before these quality checks run. Invalid provider output is reported as a fixture failure.

## Relationship to ordinary tests

`pnpm run test` does not call live OpenAI. The automated eval tests use injected generators, in-memory fixtures, fixture parsing, and deterministic helper checks.

Run the normal development validation separately:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
```

These commands should pass without OpenAI credentials. Only `pnpm run eval:generate-adventure` requires live OpenAI configuration.

## Known limitations

- Deterministic checks cannot fully judge subjective Adventure quality.
- Live evals depend on credentials, network availability, model behavior, and possible cost.
- Model nondeterminism may occasionally require fixture or prompt tuning.
- The current workflow has no hosted dashboard, persistence, Forge orchestration, UI, LLM-as-judge layer, or automated prompt optimization.
