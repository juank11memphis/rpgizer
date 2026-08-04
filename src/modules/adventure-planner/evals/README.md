# Adventure generation evals

Adventure evals are local, maintainer-facing checks for live Adventure generation. Product Quality Evaluation runs through the local evals page, which calls the same production providers and runtime config used by the app, then runs deterministic validations. Ordinary tests use injected fakes and must not call OpenAI.

## Run

Start the app locally and open `/evals`, then choose the Adventure suite you want to run.

```bash
pnpm run dev
```

Available suites:

- Adventure Content validates unlinked Adventure structure, fixture grounding, safety, Quest Step presence/quality for Main and Side Quests, Boss Fight step exclusion, and absence of dependency/XP fields.
- Dependency Links validates Quest/Boss coverage plus existing Skill and Inventory references for representative unlinked fixtures.
- XP Balance validates bounded positive XP, linked Skill coverage, proportionality, and no content/link rewrites for representative linked fixtures.
- Adventure Generation is the aggregate eval. It loads request fixtures from `src/modules/adventure-planner/evals/fixtures/`, runs the full production multi-step generator path, and validates the final complete `GeneratedAdventure` output.

The aggregate eval differs from focused step evals by exercising content generation, dependency linking, XP balancing, final assembly, and final validation together. Use focused eval suites to isolate a failed interaction after the aggregate eval reports the failing area.

## Runtime configuration

The app loads `.env.local` before reading config. Live OpenAI config is required and may incur cost.

Required:

- `OPENAI_API_KEY`

Adventure model variables:

- `OPENAI_ADVENTURE_CONTENT_MODEL`
- `OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL`
- `OPENAI_ADVENTURE_XP_BALANCER_MODEL`

Each step model falls back to `OPENAI_ADVENTURE_GENERATION_MODEL`, then to the shared runtime default when blank or unset. Missing, blank, or placeholder API keys are reported as configuration blockers before provider calls. Placeholder model values produce concise configuration diagnostics.

## Diagnostics and logs

Failures report concise diagnostics such as:

```txt
[spanish-coffee-chat] references: questLinks is missing coverage for quest-speaking-sprint.
[fitness-habit] quest step quality: quest-warm-up-checklist.steps[0] should start from a concrete user action, decision, check, or artifact.
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
- Unlinked content fixtures should include 2–7 concrete Quest Steps on Main and Side Quests, preferably 3–5, and no Quest Steps on Boss Fights.

Do not paste or commit secret values in docs, fixtures, logs, or review notes.

## Validation workflow

Run ordinary validation separately:

```bash
pnpm run test
pnpm run typecheck
pnpm run lint
pnpm run build
```

These commands should pass without OpenAI credentials. Live eval status should be reported from the local evals page when live config is available; otherwise record the exact configuration blocker instead of reporting live eval success.

## Known limitations

- Deterministic checks cannot fully judge subjective Adventure quality.
- Live evals depend on credentials, network availability, model behavior, and possible cost.
- Model nondeterminism may occasionally require fixture or prompt tuning.
- There is no hosted dashboard, persistence, LLM-as-judge layer, or automated prompt optimization.
