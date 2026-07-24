import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ForgeAdventurePage from "./page";

const mocks = vi.hoisted(() => ({
  getAdventureInterview: vi.fn(),
  requireCurrentSessionUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not found");
  },
  redirect: (destination: string) => {
    throw new Error(`redirect:${destination}`);
  },
}));

vi.mock("@/modules/user-identity/infra/auth/session", () => ({
  requireCurrentSessionUser: mocks.requireCurrentSessionUser,
}));

vi.mock("@/modules/game-master-assistant/infra/game-master-assistant-composition", () => ({
  createGameMasterAssistantComposition: () => ({
    getAdventureInterview: mocks.getAdventureInterview,
  }),
}));

vi.mock("./forge-progress-client", () => ({
  ForgeProgressClient: ({
    adventureId,
    travelerTestMode = false,
  }: {
    adventureId: string;
    travelerTestMode?: boolean;
  }) => (
    <div data-adventure-id={adventureId} data-traveler-test-mode={String(travelerTestMode)}>
      Forge progress client
    </div>
  ),
}));

describe("ForgeAdventurePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentSessionUser.mockResolvedValue({
      status: "authenticated",
      user: { id: "user-1" },
    });
  });

  it("renders traveler test mode without requiring a real adventure interview", async () => {
    const page = await ForgeAdventurePage({
      params: Promise.resolve({ adventureId: "11" }),
      searchParams: Promise.resolve({ travelerTest: "1" }),
    });

    const markup = renderToStaticMarkup(page);

    expect(markup).toContain('data-adventure-id="11"');
    expect(markup).toContain('data-traveler-test-mode="true"');
    expect(mocks.getAdventureInterview).not.toHaveBeenCalled();
  });

  it("still validates the interview during the real forge flow", async () => {
    mocks.getAdventureInterview.mockResolvedValue({
      interview: { draft: { interviewStatus: "confirmed" } },
    });

    const page = await ForgeAdventurePage({
      params: Promise.resolve({ adventureId: "adventure-1" }),
      searchParams: Promise.resolve({}),
    });

    const markup = renderToStaticMarkup(page);

    expect(markup).toContain('data-traveler-test-mode="false"');
    expect(mocks.getAdventureInterview).toHaveBeenCalledWith({
      userId: "user-1",
      adventureId: "adventure-1",
    });
  });
});
