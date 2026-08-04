import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdventureDetailPage from "./page";

const mocks = vi.hoisted(() => ({
  getAdventureDetailMenu: vi.fn(),
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

vi.mock("@/modules/adventure-experience-presenter/infra/adventure-experience-presenter-composition", () => ({
  createAdventureExperiencePresenterComposition: () => ({
    getAdventureDetailMenu: mocks.getAdventureDetailMenu,
  }),
}));

vi.mock("./adventure-forged-toast", () => ({
  AdventureForgedToast: () => <div data-testid="adventure-forged-toast">Adventure forged toast</div>,
}));

describe("AdventureDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentSessionUser.mockResolvedValue({
      status: "authenticated",
      user: { id: "user-1" },
    });
    mocks.getAdventureDetailMenu.mockResolvedValue({ status: "found", menu: menuView });
  });

  it("redirects unauthenticated users to login with the adventure detail path", async () => {
    mocks.requireCurrentSessionUser.mockResolvedValue({ status: "unauthenticated" });

    await expect(renderPage("adventure-1")).rejects.toThrow(
      "redirect:/login?next=%2Fadventures%2Fadventure-1",
    );

    expect(mocks.getAdventureDetailMenu).not.toHaveBeenCalled();
  });

  it("calls the presenter with the current user and route adventure", async () => {
    await renderPage("adventure-2");

    expect(mocks.getAdventureDetailMenu).toHaveBeenCalledWith({
      userId: "user-1",
      adventureId: "adventure-2",
    });
  });

  it("uses Next not-found behavior for missing or non-owned adventures", async () => {
    mocks.getAdventureDetailMenu.mockResolvedValue({ status: "not_found" });

    await expect(renderPage("missing-adventure")).rejects.toThrow("not found");
  });

  it("renders the presenter menu handoff for found adventures with the forge toast", async () => {
    const markup = await renderPage("adventure-1");

    expect(markup).toContain("THE MORNING RUN QUEST");
    expect(markup).toContain("Journal");
    expect(markup).toContain("Inventory");
    expect(markup).toContain("Adventure forged toast");
  });

  it("renders safe not-ready copy and navigation with the forge toast", async () => {
    mocks.getAdventureDetailMenu.mockResolvedValue({ status: "not_ready" });

    const markup = await renderPage("adventure-3");

    expect(markup).toContain("Adventure not ready");
    expect(markup).toContain("Back to Dashboard");
    expect(markup).toContain("/dashboard");
    expect(markup).toContain("/adventures/adventure-3/interview");
    expect(markup).toContain("Adventure forged toast");
    expect(markup).not.toMatch(/database|generated content|presenter|repository|Drizzle/i);
  });
});

async function renderPage(adventureId: string) {
  const page = await AdventureDetailPage({
    params: Promise.resolve({ adventureId }),
  });

  return renderToStaticMarkup(page);
}

const menuView = {
  header: {
    title: "THE MORNING RUN QUEST",
    goalSummary: "Build a steady running habit",
    themeSummary: "roadside guild trial",
    safetyNotes: [],
  },
  tabs: [
    { id: "journal", label: "Journal" },
    { id: "inventory", label: "Inventory" },
    { id: "character", label: "Character" },
    { id: "achievements", label: "Achievements" },
  ],
  journal: {
    label: "Journal",
    emptyMessage: "No journal entries yet.",
    defaultSelectedActId: null,
    defaultSelectedDetailId: null,
    acts: [],
  },
  inventory: {
    label: "Inventory",
    description: "Readiness gear for the path.",
    emptyMessage: "No inventory items yet.",
    defaultSelectedItemId: null,
    items: [],
  },
  character: {
    label: "Character",
    description: "Your Adventure skills.",
    emptyMessage: "No skills yet.",
    defaultSelectedSkillId: null,
    skills: [],
  },
  achievements: {
    label: "Achievements",
    description: "Campaign milestones.",
    emptyMessage: "No achievements yet.",
    defaultSelectedAchievementId: null,
    achievements: [],
  },
};
