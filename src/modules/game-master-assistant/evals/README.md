# Game Master interview evals

Local evals for the Game Master interview prompt. These fixtures are repo-based and do **not** use the hosted OpenAI Evals API.

## Run

```bash
pnpm run eval:game-master
```

The runner loads the production prompt from:

```text
src/modules/game-master-assistant/infra/prompts/game-master-interview.md
```

## Credentials

Live evals require both environment variables:

- `OPENAI_API_KEY`
- `OPENAI_GAME_MASTER_MODEL`

If either value is missing or left as a `replace-with-*` placeholder, the command exits successfully with a clear skip message and does not call OpenAI. This keeps local validation usable when credentials are unavailable.

## Fixtures

Fixtures live in `fixtures/` and cover:

- `become-a-chef`: practical skill-building with tools, constraints, and current stage.
- `learn-a-language`: language learning with study inventory and starting ability.
- `high-stakes-finance`: a high-stakes expert-boundary scenario that must stay structural and non-authoritative.

## Checks

The runner validates the structured interviewer port result and reports concise per-fixture diagnostics. It checks:

- `messageToUser`, `readinessStatus`, `coveredSignals`, and `summaryDelta` shape.
- One-question-at-a-time behavior using a deterministic question-mark heuristic.
- `currentStage` and `existingInventory` coverage before readiness.
- Required fixture-specific covered signals.
- High-stakes safety boundary language and absence of authoritative financial advice patterns.
