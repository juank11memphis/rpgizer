# Adventure generation evals

Adventure evals are local, maintainer-facing checks for live Adventure generation. Live eval commands call OpenAI through the same production providers and runtime config used by the app, then run deterministic validations. Ordinary tests use injected fakes and must not call OpenAI.

## Commands

```bash
pnpm run eval:adventure-content
pnpm run eval:adventure-linking
pnpm run eval:adventure-xp
pnpm run eval:generate-adventure
```

Responsibilities:

- `eval:adventure-content` calls the live content generator and validates unlinked Adventure structure, fixture grounding, safety, and absence of dependency/XP fields.
- `eval:adventure-linking` calls the live dependency linker with representative unlinked fixtures and validates Quest/Boss coverage plus existing Skill and Inventory references.
- `eval:adventure-xp` calls the live XP balancer with representative linked fixtures and validates bounded positive XP, linked Skill coverage, proportionality, and no content/link rewrites.
- `eval:generate-adventure` is the aggregate eval. It loads request fixtures from `src/modules/adventure-planner/evals/fixtures/`, runs the full production multi-step generator path, and validates the final complete `GeneratedAdventure` output.

The aggregate eval differs from focused step evals by exercising content generation, dependency linking, XP balancing, final assembly, and final validation together. Use focused evals to isolate a failed interaction after the aggregate eval reports the failing area.

## Runtime configuration

All evals load `.env.local` before reading config. Live OpenAI config is required and may incur cost.

Required:

- `OPENAI_API_KEY`

Adventure model variables:

- `OPENAI_ADVENTURE_CONTENT_MODEL`
- `OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL`
- `OPENAI_ADVENTURE_XP_BALANCER_MODEL`

Each step model falls back to `OPENAI_ADVENTURE_GENERATION_MODEL`, then to the shared runtime default when blank or unset. Missing, blank, or placeholder API keys fail before provider calls. Placeholder model values fail with a concise configuration diagnostic.

## Diagnostics and logs

Failures print concise diagnostics such as:

```txt
[spanish-coffee-chat] references: questLinks is missing coverage for quest-speaking-sprint.
[runner] configuration: OPENAI_API_KEY is required to run Generate Adventure evals.
[cooking-eval] dependency linking: OpenAI Adventure output was invalid: OpenAI Adventure dependency linking request failed.
```

Eval and provider logs are structured JSON through the server logger. Expected safe fields include `event`, `flow`, `operation`, `result`, `fixtureIds`, `step`, `model`, `durationMs`, counts, and safe error category/code metadata. Logs and diagnostics must not include raw prompts, raw provider responses, transcripts, API keys, or full generated Adventure payloads.

## Retry policy

The previous broad one-shot Adventure repair retry is not used by the aggregate eval path. The multi-step runtime path validates each boundary directly and surfaces the failed step instead of hiding failures behind a generic repair attempt. Add retries only inside a narrow step when a concrete failure mode justifies it and tests/evals prove the value.

## Fixture coverage

- Aggregate/content evals use request fixtures in `src/modules/adventure-planner/evals/fixtures/*.json`.
- Dependency-linking evals use representative unlinked content fixtures in `src/modules/adventure-planner/evals/fixtures/linking/*.json`.
- XP evals use linked content fixtures in `src/modules/adventure-planner/evals/fixtures/xp/*.json`.

Do not paste or commit secret values in docs, fixtures, logs, or review notes.

## Validation workflow

Run ordinary validation separately:

```bash
pnpm run test
pnpm run typecheck
pnpm run lint
```

These commands should pass without OpenAI credentials. Live eval status should be reported separately: run `pnpm run eval:generate-adventure` when live config is available; otherwise record the exact config blocker instead of reporting live eval success.

## Known limitations

- Deterministic checks cannot fully judge subjective Adventure quality.
- Live evals depend on credentials, network availability, model behavior, and possible cost.
- Model nondeterminism may occasionally require fixture or prompt tuning.
- There is no hosted dashboard, persistence, LLM-as-judge layer, or automated prompt optimization.
