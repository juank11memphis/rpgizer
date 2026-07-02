import { describe, expect, it, vi } from "vitest";

import type { RequireCurrentUserResult } from "@/modules/user-identity/application/require-current-user/output";

import { createRetryForgeAction } from "./actions";

function buildFormData(adventureId?: string): FormData {
  const formData = new FormData();
  if (adventureId !== undefined) {
    formData.set("adventureId", adventureId);
  }
  return formData;
}

function redirectTo(destination: string): never {
  throw new Error(`NEXT_REDIRECT:${destination}`);
}

describe("retryForgeAction", () => {
  it("requires an Adventure id", async () => {
    const action = createRetryForgeAction({
      requireCurrentUser: async () => authenticatedUser(),
      generateInterviewOutputArtifact: vi.fn(),
      redirectTo,
    });

    await expect(action(buildFormData("   "))).rejects.toThrow("Adventure id is required.");
  });

  it("redirects unauthenticated Users through login", async () => {
    const generateInterviewOutputArtifact = vi.fn();
    const action = createRetryForgeAction({
      requireCurrentUser: async () => ({ status: "unauthenticated" }),
      generateInterviewOutputArtifact,
      redirectTo,
    });

    await expect(action(buildFormData("adventure-1"))).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=%2Fadventures%2Fadventure-1%2Fforge",
    );
    expect(generateInterviewOutputArtifact).not.toHaveBeenCalled();
  });

  it("retries generation through the application boundary and redirects back to forge", async () => {
    const generateInterviewOutputArtifact = vi.fn().mockResolvedValue({
      status: "ready",
      adventureId: "adventure-1",
      artifactId: "artifact-1",
      reusedExistingArtifact: false,
    });
    const action = createRetryForgeAction({
      requireCurrentUser: async () => authenticatedUser(),
      generateInterviewOutputArtifact,
      redirectTo,
    });

    await expect(action(buildFormData(" adventure-1 "))).rejects.toThrow(
      "NEXT_REDIRECT:/adventures/adventure-1/forge",
    );
    expect(generateInterviewOutputArtifact).toHaveBeenCalledWith({
      userId: "user-1",
      adventureId: "adventure-1",
    });
  });
});

function authenticatedUser(): RequireCurrentUserResult {
  return {
    status: "authenticated",
    user: {
      id: "user-1",
      email: "user@example.com",
      name: "Test User",
      image: null,
    },
  };
}
