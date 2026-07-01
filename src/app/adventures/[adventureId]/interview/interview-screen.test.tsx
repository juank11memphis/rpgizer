import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AdventureInterview } from "@/modules/game-master-assistant/application/get-adventure-interview/output";

import { InterviewScreen } from "./interview-screen";

function renderInterviewMarkup(interview: AdventureInterview): string {
  return renderToStaticMarkup(<InterviewScreen interview={interview} />);
}

describe("InterviewScreen", () => {
  it("renders draft context, prior transcript messages in order, and the latest Game Master question as the current task", () => {
    const markup = renderInterviewMarkup({
      draft: {
        id: "adventure-1",
        goalText: "Become a chef",
        state: "drafting",
        readinessStatus: "not_ready",
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      transcript: [
        {
          id: "message-1",
          role: "game_master",
          content: "Nice. Let’s find the real shape of this Adventure.",
          sequenceNumber: 1,
          createdAt: new Date("2026-01-02T00:00:00.000Z"),
        },
        {
          id: "message-2",
          role: "user",
          content: "I want to become a chef.",
          sequenceNumber: 2,
          createdAt: new Date("2026-01-02T00:01:00.000Z"),
        },
        {
          id: "message-3",
          role: "game_master",
          content:
            "When you picture yourself succeeding, what are you actually doing?",
          sequenceNumber: 3,
          createdAt: new Date("2026-01-02T00:02:00.000Z"),
        },
      ],
    });

    expect(markup).toContain("Draft:");
    expect(markup).toContain("Become a chef");
    expect(markup).toContain("GM");
    expect(markup).toContain("You");

    const firstGameMasterMessageIndex = markup.indexOf(
      "Nice. Let’s find the real shape of this Adventure.",
    );
    const userMessageIndex = markup.indexOf("I want to become a chef.");
    const currentQuestionHeadingIndex = markup.indexOf(
      'id="current-game-master-question-heading"',
    );
    const currentQuestionIndex = markup.indexOf(
      "When you picture yourself succeeding, what are you actually doing?",
    );

    expect(firstGameMasterMessageIndex).toBeGreaterThan(-1);
    expect(userMessageIndex).toBeGreaterThan(firstGameMasterMessageIndex);
    expect(currentQuestionHeadingIndex).toBeGreaterThan(userMessageIndex);
    expect(currentQuestionIndex).toBeGreaterThan(currentQuestionHeadingIndex);
  });

  it("renders a reachable answer composer without wiring submission behavior", () => {
    const markup = renderInterviewMarkup({
      draft: {
        id: "adventure-1",
        goalText: "Become a chef",
        state: "drafting",
        readinessStatus: "not_ready",
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      transcript: [],
    });

    expect(markup).toContain('aria-label="Answer the Game Master"');
    expect(markup).toContain('for="interview-answer"');
    expect(markup).toContain("Your answer");
    expect(markup).toContain("Type your answer...");
    expect(markup).toContain('type="button"');
    expect(markup).toContain("Send");
    expect(markup).toContain("Saved for later.");
  });
});
