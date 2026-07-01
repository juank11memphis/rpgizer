import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EMPTY_GOAL_MESSAGE } from "./actions-core";
import { GoalPromptForm, shouldSubmitGoalFromKeyDown } from "./goal-prompt-form";
import { GoalPromptScreen } from "./goal-prompt-screen";

function renderMarkup(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

describe("GoalPromptScreen", () => {
  it("renders the binding goal prompt content and primary action", () => {
    const markup = renderMarkup(<GoalPromptScreen />);

    expect(markup).toContain("New Adventure");
    expect(markup).toContain("What goal do you want to tackle in this Adventure?");
    expect(markup).toContain(
      "I’ll ask focused questions, then shape it into quests, skills, and a path forward.",
    );
    expect(markup).toContain("Goal for this Adventure");
    expect(markup).toContain("I want to...");
    expect(markup).toContain("Begin the Interview");
    expect(markup).toContain('href="/dashboard"');
  });



  it("submits the initial goal prompt with Enter while preserving Shift+Enter for new lines", () => {
    expect(
      shouldSubmitGoalFromKeyDown({
        key: "Enter",
        shiftKey: false,
      }),
    ).toBe(true);

    expect(
      shouldSubmitGoalFromKeyDown({
        key: "Enter",
        shiftKey: true,
      }),
    ).toBe(false);

    expect(
      shouldSubmitGoalFromKeyDown({
        key: "a",
        shiftKey: false,
      }),
    ).toBe(false);

    expect(
      shouldSubmitGoalFromKeyDown({
        key: "Enter",
        shiftKey: false,
        nativeEvent: { isComposing: true },
      }),
    ).toBe(false);
  });

  it("renders inline empty validation state near the goal prompt", () => {
    const markup = renderMarkup(
      <GoalPromptForm
        initialState={{
          goalText: "",
          fieldError: EMPTY_GOAL_MESSAGE,
          formError: null,
        }}
      />,
    );

    expect(markup).toContain(EMPTY_GOAL_MESSAGE);
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('aria-live="polite"');
  });
});
