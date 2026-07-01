import { describe, expect, it, vi } from "vitest";

import { InterviewProviderFailure } from "../../../modules/game-master-assistant/application/start-adventure-interview/provider-error";
import type { RequireCurrentUserResult } from "../../../modules/user-identity/application/require-current-user/output";

import {
  createStartAdventureFromGoalAction,
  EMPTY_GOAL_MESSAGE,
  initialStartAdventureFormState,
} from "./actions-core";

function buildFormData(goalText: string): FormData {
  const formData = new FormData();
  formData.set("goalText", goalText);
  return formData;
}

function redirectTo(destination: string): never {
  throw new Error(`NEXT_REDIRECT:${destination}`);
}

describe("startAdventureFromGoalAction", () => {
  it("returns empty validation without starting an Adventure", async () => {
    const startAdventureInterview = vi.fn();
    const action = createStartAdventureFromGoalAction({
      requireCurrentUser: async () => authenticatedUser(),
      startAdventureInterview,
      redirectTo,
    });

    await expect(
      action(initialStartAdventureFormState, buildFormData("   ")),
    ).resolves.toEqual({
      goalText: "",
      fieldError: EMPTY_GOAL_MESSAGE,
      formError: null,
    });
    expect(startAdventureInterview).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated submissions through login", async () => {
    const action = createStartAdventureFromGoalAction({
      requireCurrentUser: async () => ({ status: "unauthenticated" }),
      startAdventureInterview: vi.fn(),
      redirectTo,
    });

    await expect(
      action(initialStartAdventureFormState, buildFormData("Become a chef")),
    ).rejects.toThrow("NEXT_REDIRECT:/login?next=/adventures/new");
  });

  it("starts an Adventure with trimmed goal text and redirects to the interview", async () => {
    const startAdventureInterview = vi.fn().mockResolvedValue({
      draft: { id: "adventure-1" },
    });
    const action = createStartAdventureFromGoalAction({
      requireCurrentUser: async () => authenticatedUser(),
      startAdventureInterview,
      redirectTo,
    });

    await expect(
      action(initialStartAdventureFormState, buildFormData("  Become a chef  ")),
    ).rejects.toThrow("NEXT_REDIRECT:/adventures/adventure-1/interview");
    expect(startAdventureInterview).toHaveBeenCalledWith({
      userId: "user-1",
      goalText: "Become a chef",
    });
  });

  it("returns a safe inline message for normalized provider failures", async () => {
    const action = createStartAdventureFromGoalAction({
      requireCurrentUser: async () => authenticatedUser(),
      startAdventureInterview: vi
        .fn()
        .mockRejectedValue(new InterviewProviderFailure("configuration_missing")),
      redirectTo,
    });

    await expect(
      action(initialStartAdventureFormState, buildFormData("Become a chef")),
    ).resolves.toEqual({
      goalText: "Become a chef",
      fieldError: null,
      formError: "Couldn’t save yet. Keep this page open and retry.",
    });
  });
});

function authenticatedUser(): RequireCurrentUserResult {
  return {
    status: "authenticated",
    user: {
      id: "user-1",
      name: null,
      email: null,
      image: null,
    },
  };
}
