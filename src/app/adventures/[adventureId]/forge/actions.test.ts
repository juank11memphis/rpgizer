import { describe, expect, it, vi } from "vitest";

import type { RequireCurrentUserResult } from "@/modules/user-identity/application/require-current-user/output";
import { APPLICATION_LOG_EVENTS } from "@/server/logging/events";

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
    const logger = createLoggerMock();
    const action = createRetryForgeAction({
      requireCurrentUser: async () => authenticatedUser(),
      generateInterviewOutputArtifact: vi.fn(),
      redirectTo,
      logger,
    });

    await expect(action(buildFormData("   "))).rejects.toThrow("Adventure id is required.");
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.SERVER_ACTION_FORGE_RETRY_VALIDATION_FAILED,
        validationField: "adventureId",
        validationCategory: "empty",
      }),
    );
  });

  it("redirects unauthenticated Users through login", async () => {
    const logger = createLoggerMock();
    const generateInterviewOutputArtifact = vi.fn();
    const action = createRetryForgeAction({
      requireCurrentUser: async () => ({ status: "unauthenticated" }),
      generateInterviewOutputArtifact,
      redirectTo,
      logger,
    });

    await expect(action(buildFormData("adventure-1"))).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=%2Fadventures%2Fadventure-1%2Fforge",
    );
    expect(generateInterviewOutputArtifact).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event:
          APPLICATION_LOG_EVENTS.SERVER_ACTION_FORGE_RETRY_UNAUTHENTICATED_REDIRECT,
        adventureId: "adventure-1",
        redirectDestination:
          "/login?next=%2Fadventures%2Fadventure-1%2Fforge",
      }),
    );
  });

  it("retries generation through the application boundary and redirects back to forge", async () => {
    const logger = createLoggerMock();
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
      logger,
    });

    await expect(action(buildFormData(" adventure-1 "))).rejects.toThrow(
      "NEXT_REDIRECT:/adventures/adventure-1/forge",
    );
    expect(generateInterviewOutputArtifact).toHaveBeenCalledWith({
      userId: "user-1",
      adventureId: "adventure-1",
    });
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.SERVER_ACTION_FORGE_RETRY_STARTED,
        userId: "user-1",
        adventureId: "adventure-1",
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.SERVER_ACTION_FORGE_RETRY_SUCCESS,
        outputStatus: "ready",
        artifactId: "artifact-1",
        reusedExistingArtifact: false,
      }),
    );
  });

  it("logs and rethrows retry failures", async () => {
    const logger = createLoggerMock();
    const failure = new Error("provider unavailable");
    const action = createRetryForgeAction({
      requireCurrentUser: async () => authenticatedUser(),
      generateInterviewOutputArtifact: vi.fn().mockRejectedValue(failure),
      redirectTo,
      logger,
    });

    await expect(action(buildFormData("adventure-1"))).rejects.toThrow(
      "provider unavailable",
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.SERVER_ACTION_FORGE_RETRY_FAILURE,
        userId: "user-1",
        adventureId: "adventure-1",
        error: expect.objectContaining({
          name: "Error",
          message: "provider unavailable",
        }),
      }),
    );
  });
});

function createLoggerMock() {
  return {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  };
}

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
