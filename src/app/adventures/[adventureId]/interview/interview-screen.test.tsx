import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AdventureInterview } from "@/modules/game-master-assistant/application/get-adventure-interview/output";

import { AnswerComposer, shouldSubmitAnswerFromKeyDown } from "./answer-composer";
import { INTERVIEW_SAVE_FAILURE_MESSAGE } from "./actions-core";
import { InterviewScreen } from "./interview-screen";

function renderInterviewMarkup(
  interview: AdventureInterview,
  props: Partial<Parameters<typeof InterviewScreen>[0]> = {},
): string {
  return renderToStaticMarkup(
    <InterviewScreen
      interview={interview}
      submitAnswer={async () => ({
        status: "success",
        answerText: "",
        fieldError: null,
        formError: null,
        draft: interview.draft,
        transcript: interview.transcript,
        retryUserMessageId: null,
      })}
      {...props}
    />,
  );
}

describe("InterviewScreen", () => {
  it("renders draft context, prior transcript messages in order, and the latest Game Master question as the current task", () => {
    const markup = renderInterviewMarkup({
      draft: {
        id: "adventure-1",
        goalText: "Become a chef",
        state: "drafting",
        readinessStatus: "not_ready",
        interviewStatus: "interviewing",
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

  it("renders a reachable answer composer wired for submission", () => {
    const markup = renderInterviewMarkup({
      draft: {
        id: "adventure-1",
        goalText: "Become a chef",
        state: "drafting",
        readinessStatus: "not_ready",
        interviewStatus: "interviewing",
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      transcript: [],
    });

    expect(markup).toContain('aria-label="Answer the Game Master"');
    expect(markup).toContain('for="interview-answer"');
    expect(markup).toContain("Your answer");
    expect(markup).toContain("Type your answer...");
    expect(markup).toContain('type="submit"');
    expect(markup).toContain("Send");
    expect(markup).toContain("Saved for later.");
  });

  it("renders recoverable failure state with retry and preserved transcript", () => {
    const interview = buildInterview();
    const markup = renderInterviewMarkup(interview, {
      initialSubmissionState: {
        status: "recoverable_failure",
        answerText: "",
        fieldError: null,
        formError: INTERVIEW_SAVE_FAILURE_MESSAGE,
        draft: interview.draft,
        transcript: [
          ...interview.transcript,
          message("message-4", "user", "I can cook eggs and pasta.", 4),
        ],
        retryUserMessageId: "message-4",
      },
    });

    expect(markup).toContain("Not saved");
    expect(markup).toContain(INTERVIEW_SAVE_FAILURE_MESSAGE);
    expect(markup).toContain("Retry Save");
    expect(markup).toContain("I can cook eggs and pasta.");
    expect(markup.match(/I can cook eggs and pasta\./g)).toHaveLength(1);
  });

  it("renders a successful updated transcript with the User answer and next Game Master message", () => {
    const interview = buildInterview();
    const markup = renderInterviewMarkup(interview, {
      initialSubmissionState: {
        status: "success",
        answerText: "",
        fieldError: null,
        formError: null,
        draft: interview.draft,
        transcript: [
          ...interview.transcript,
          message("message-4", "user", "I can cook eggs and pasta.", 4),
          message(
            "message-5",
            "game_master",
            "What tools do you already have?",
            5,
          ),
        ],
        retryUserMessageId: null,
      },
    });

    expect(markup).toContain("Saved");
    expect(markup).toContain("I can cook eggs and pasta.");
    expect(markup).toContain("What tools do you already have?");
  });



  it("renders final-context composer without a separate confirmation button while awaiting confirmation", () => {
    const markup = renderInterviewMarkup({
      draft: {
        id: "adventure-1",
        goalText: "Become a chef",
        state: "drafting",
        readinessStatus: "ready_to_generate",
        interviewStatus: "awaiting_confirmation",
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      transcript: [
        message(
          "message-1",
          "game_master",
          "I have what I need to forge this Adventure. Anything else you want me to know before I begin?",
          1,
        ),
      ],
    });

    expect(markup).toContain("Add one last detail, or say you’re ready...");
    expect(markup).not.toContain("I’m Ready");
    expect(markup).toContain('aria-label="Answer the Game Master"');
    expect(markup).toContain('name="answerText"');
    expect(markup).toContain("Send");
  });

  it("renders confirmed ready-to-forge panel and hides the composer controls", () => {
    const markup = renderInterviewMarkup({
      draft: {
        id: "adventure-1",
        goalText: "Become a chef",
        state: "drafting",
        readinessStatus: "ready_to_generate",
        interviewStatus: "confirmed",
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      transcript: [
        message(
          "message-1",
          "game_master",
          "I have what I need to forge this Adventure. Anything else you want me to know before I begin?",
          1,
        ),
        message("message-2", "user", "No, forge it.", 2),
      ],
    });

    expect(markup).toContain("Ready to forge");
    expect(markup).toContain("The Game Master has what they need.");
    expect(markup).toContain(
      "Your answers are locked in for the next step. Time to shape them into the foundation of your Adventure.",
    );
    expect(markup).toContain("Forge My Adventure");
    expect(markup).toContain('href="/adventures/adventure-1/forge"');
    expect(markup).toContain("No, forge it.");
    expect(markup).not.toContain('aria-label="Answer the Game Master"');
    expect(markup).not.toContain('name="answerText"');
    expect(markup).not.toContain("Retry Save");
  });

  it("submits textarea answers with Enter while preserving Shift+Enter for new lines", () => {
    expect(
      shouldSubmitAnswerFromKeyDown({
        key: "Enter",
        shiftKey: false,
      }),
    ).toBe(true);

    expect(
      shouldSubmitAnswerFromKeyDown({
        key: "Enter",
        shiftKey: true,
      }),
    ).toBe(false);

    expect(
      shouldSubmitAnswerFromKeyDown({
        key: "a",
        shiftKey: false,
      }),
    ).toBe(false);

    expect(
      shouldSubmitAnswerFromKeyDown({
        key: "Enter",
        shiftKey: false,
        nativeEvent: { isComposing: true },
      }),
    ).toBe(false);
  });

  it("renders pending composer state with disabled duplicate-submit controls", () => {
    const markup = renderToStaticMarkup(
      <AnswerComposer
        answerText="I can cook eggs and pasta."
        fieldError={null}
        formError={null}
        isPending={true}
        canRetry={true}
        onAnswerTextChange={() => undefined}
        onSubmit={() => undefined}
        onRetry={() => undefined}
      />,
    );

    expect(markup).toContain("Saving…");
    expect(markup).toContain("disabled");
    expect(markup).toContain('aria-live="polite"');
  });
});

function buildInterview(): AdventureInterview {
  return {
    draft: {
      id: "adventure-1",
      goalText: "Become a chef",
      state: "drafting",
      readinessStatus: "not_ready",
      interviewStatus: "interviewing",
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    },
    transcript: [
      message(
        "message-1",
        "game_master",
        "What is your current cooking level?",
        1,
      ),
    ],
  };
}

function message(
  id: string,
  role: "user" | "game_master",
  content: string,
  sequenceNumber: number,
) {
  return {
    id,
    role,
    content,
    sequenceNumber,
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
  };
}
