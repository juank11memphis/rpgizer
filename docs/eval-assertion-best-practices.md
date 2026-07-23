# Eval Assertion Best Practices

Use this guide when writing assertions for AI-generated outputs in RPGizer eval suites.

## Core principles

1. **Assert stable product invariants, not taste.** Hard failures should cover objective rules: required fields, valid references, schema shape, XP ranges, no duplicated links, safety boundaries, and obvious anti-goals.
2. **Avoid brittle keyword allowlists.** Keyword checks are useful signals, but they should not be the only way to pass a subjective quality assertion. Prefer broader heuristics plus explicit negative checks.
3. **Separate hard failures from quality preferences.** If an output is acceptable but not ideal, make it a warning/diagnostic candidate rather than a failing assertion.
4. **Design assertions around the user outcome.** A generated Adventure should be judged by whether it helps the stated goal, not whether it uses one exact phrasing.
5. **Use rubrics for subjective quality.** For nuanced checks like “good boss fight” or “practical inventory,” encode the rubric: what must be true, what must fail, and examples that are allowed but not exhaustive.
6. **Test the grader itself.** Every assertion should have positive and negative regression cases so we know the eval is measuring the intended behavior.
7. **Make diagnostics actionable.** Failure messages should say what was wrong and what kind of output would satisfy the assertion.
8. **Keep fixtures realistic and diverse.** Include examples across goal types, constraints, resources, and risk levels so assertions do not overfit one prompt.
9. **Version meaningful eval changes.** When an assertion changes the score meaningfully, treat old and new results as different metrics.
10. **Document harness context.** Record prompt, model/harness assumptions, retries, budgets, grader logic, and known limitations when interpreting eval results.

## Recommended assertion pattern

For each assertion, define:

- **Invariant:** what must always be true.
- **Allowed variation:** ways a valid AI answer may differ.
- **Hard negatives:** outputs that should always fail.
- **Regression examples:** at least one valid and one invalid case.
- **Failure message:** concise, user-actionable text.

## RPGizer examples

### Inventory Quality

Good assertion shape:

- Inventory must be a user-controlled artifact, tool, routine, or readiness aid.
- The purpose must explain how it helps practice, preparation, tracking, review, safety, or execution.
- It must not be random fantasy loot.
- It must not model people/groups as inventory.

Valid examples include, but are not limited to:

- `Practice Audio Log` — a phone recording folder for drills and self-review.
- `Conversation Prompt List` — topics and follow-up questions for practice.
- `Weekly Speaking Schedule` — planned time blocks for repeatable practice.
- `Practice Partner Outreach Template` — user-controlled message/template for finding help.

Invalid examples:

- `Magic Sword` — random fantasy loot.
- `Spanish-Speaking Coworkers` — people are not inventory.
- `Mystery Resource` with no practical purpose.

### Boss Fight Quality

Good assertion shape:

- Boss fights should be observable milestones, proof points, or challenges.
- They may be practical rather than flashy-RPG if they clearly test the user goal.
- The done condition should include evidence: recording, note, reflection, submitted artifact, logged result, witness confirmation, measured completion, etc.

## Source notes

This guidance is informed by current public eval guidance:

- Anthropic recommends choosing the fastest reliable grader, using code-based grading for objective checks and LLM/human grading for nuanced judgment: <https://platform.claude.com/docs/en/test-and-evaluate/develop-tests>
- Anthropic’s agent-eval guidance emphasizes realistic harnesses and grading logic matched to system complexity: <https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents>
- OpenAI Evals guidance emphasizes directionally clear datasets, high-quality reference answers/rubrics, careful crafting, and meta-evals for model-graded evals: <https://github.com/openai/evals/blob/main/docs/build-eval.md>
- OpenAI evaluation validity guidance emphasizes documenting the tested system, harness, budgets, elicitation methods, and validity checks: <https://openai.com/index/trustworthy-third-party-evaluations-foundations/>
