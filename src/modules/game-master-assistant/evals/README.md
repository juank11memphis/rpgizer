# Game Master interview evals

Local evals for the Game Master interview prompt. These fixtures are repo-based and do **not** use the hosted OpenAI Evals API.

## Run

Product Quality Evaluation runs through the local evals page. Start the app locally and open `/evals`, then choose the Game Master Interview suite.

```bash
pnpm run dev
```

The suite loads the production prompt from:

```text
src/modules/game-master-assistant/infra/prompts/game-master-interview.md
```

## Credentials

Live evals require `OPENAI_API_KEY`. `OPENAI_GAME_MASTER_MODEL` is optional and defaults to the shared runtime model when unset.

If the API key is missing, or either value is left as a `replace-with-*` placeholder, the eval run reports a clear configuration blocker and does not call OpenAI. This keeps local validation usable when credentials are unavailable.

## Fixtures

Fixtures live in `fixtures/` and cover:

- `become-a-chef`: practical skill-building with tools, constraints, and current stage.
- `learn-a-language`: language learning with study inventory and starting ability.
- `high-stakes-finance`: a high-stakes expert-boundary scenario that must stay structural and non-authoritative.

## Checks

The suite validates the structured interviewer port result and reports concise per-fixture diagnostics. It checks:

- `messageToUser`, `readinessStatus`, `coveredSignals`, and `summaryDelta` shape.
- One-question-at-a-time behavior using a deterministic question-mark heuristic.
- `currentStage` and `existingInventory` coverage before readiness.
- Required fixture-specific covered signals.
- High-stakes safety boundary language and absence of authoritative financial advice patterns.
