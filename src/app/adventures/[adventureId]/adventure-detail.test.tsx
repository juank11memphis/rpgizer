/** @vitest-environment happy-dom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdventureDetailMenuScreen } from "./adventure-detail-menu-screen";
import { AdventureForgedToast } from "./adventure-forged-toast";

const routerReplace = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/adventures/adventure-1",
  useRouter: () => ({ replace: routerReplace }),
  useSearchParams: () => currentSearchParams,
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  routerReplace.mockReset();
  currentSearchParams = new URLSearchParams();
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("AdventureForgedToast", () => {
  it("shows the success toast once and clears the redirect signal", async () => {
    currentSearchParams = new URLSearchParams("forged=1");

    await renderToast();

    expect(container.textContent).toContain("Adventure forged.");
    expect(routerReplace).toHaveBeenCalledWith("/adventures/adventure-1", { scroll: false });

    currentSearchParams = new URLSearchParams();
    await renderToast();

    act(() => {
      vi.advanceTimersByTime(4_000);
    });

    expect(container.textContent).not.toContain("Adventure forged.");
  });

  it("does not replay the toast without a fresh success signal", async () => {
    await renderToast();

    expect(container.textContent).not.toContain("Adventure forged.");
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("does not expose raw technical details", async () => {
    currentSearchParams = new URLSearchParams("forged=1&debug=provider&generatedAdventureId=generated-adventure-1");

    await renderToast();

    expect(container.textContent).toContain("Adventure forged.");
    expect(container.textContent).not.toMatch(/provider|generated-adventure|debug|raw|backend/i);
    expect(routerReplace).toHaveBeenCalledWith("/adventures/adventure-1?debug=provider&generatedAdventureId=generated-adventure-1", { scroll: false });
  });
});

describe("AdventureDetailMenuScreen", () => {
  it("selects Journal by default and wires tabpanel semantics", async () => {
    await renderMenu(menuView);

    const journalTab = getTab("Journal");
    const panel = getTabPanel();

    expect(journalTab.getAttribute("aria-selected")).toBe("true");
    expect(panel.getAttribute("aria-labelledby")).toBe(journalTab.id);
    expect(panel.textContent).toContain("Adventure roadmap");
    expect(panel.textContent).not.toContain("Readiness gear");
  });

  it("switches visible tabs by click without page navigation", async () => {
    await renderMenu(menuView);

    await clickElement(getTab("Inventory"));

    expect(getTab("Inventory").getAttribute("aria-selected")).toBe("true");
    expect(getTabPanel().textContent).toContain("Readiness gear");
    expect(getTabPanel().textContent).toContain("Running Shoes");
  });

  it("supports keyboard tab navigation with aria-selected and focus updates", async () => {
    await renderMenu(menuView);

    const journalTab = getTab("Journal");
    journalTab.focus();

    await keyDownElement(journalTab, "ArrowRight");

    const inventoryTab = getTab("Inventory");
    expect(inventoryTab.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(inventoryTab);

    await keyDownElement(inventoryTab, "End");

    const achievementsTab = getTab("Achievements");
    expect(achievementsTab.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(achievementsTab);
    expect(getTabPanel().getAttribute("aria-labelledby")).toBe(achievementsTab.id);
  });

  it("renders the Arcane Command Menu header and Dashboard exit affordance", async () => {
    await renderMenu(menuView);

    const exitLink = container.querySelector<HTMLAnchorElement>('a[href="/dashboard"]');

    expect(container.textContent).toContain("RPGizer");
    expect(container.textContent).toContain("THE MORNING RUN QUEST");
    expect(container.textContent).toContain("Build a steady running habit");
    expect(container.textContent).toContain("Theme: roadside guild trial");
    expect(exitLink?.textContent).toContain("Exit");
  });

  it("renders Plan limits only when safety notes are provided", async () => {
    await renderMenu({
      ...menuView,
      header: {
        ...menuView.header,
        safetyNotes: ["Keep the first week gentle while the habit forms."],
      },
    });

    expect(container.textContent).toContain("Plan limits");
    expect(container.textContent).toContain("Keep the first week gentle while the habit forms.");

    await renderMenu(menuView);

    expect(container.textContent).not.toContain("Plan limits");
  });

  it("does not show mutation-looking controls in the shared read-only shell", async () => {
    await renderMenu(menuView);

    expect(container.textContent).not.toMatch(/complete quest|edit|regenerate|chat|acquire|unlock/i);
  });

  it("renders Inventory readiness gear with default and selected item details", async () => {
    await renderMenu(menuView);

    await clickElement(getTab("Inventory"));

    expect(getTabPanel().textContent).toContain("Readiness gear");
    expect(getTabPanel().textContent).toContain("Running Shoes");
    expect(getTabPanel().textContent).toContain("Water Bottle");
    expect(getTabPanel().textContent).toContain("Comfortable shoes reduce the friction of starting.");

    await clickButton("Water Bottle");

    expect(getTabPanel().textContent).toContain("Hydration keeps the path safer.");
    expect(getTabPanel().textContent).toContain("Needed");
  });

  it("renders Inventory empty state without stale selected item details", async () => {
    await renderMenu({
      ...menuView,
      inventory: {
        ...menuView.inventory,
        defaultSelectedItemId: null,
        items: [],
      },
    });

    await clickElement(getTab("Inventory"));

    expect(getTabPanel().textContent).toContain("No inventory items yet.");
    expect(getTabPanel().textContent).not.toContain("Running Shoes");
  });

  it("renders Character skills with default and selected skill details", async () => {
    await renderMenu(menuView);

    await clickElement(getTab("Character"));

    expect(getTabPanel().textContent).toContain("Your Adventure skills");
    expect(getTabPanel().textContent).toContain("Stamina");
    expect(getTabPanel().textContent).toContain("Routine");
    expect(getTabPanel().textContent).toContain("Level 1");
    expect(getTabPanel().textContent).toContain("XP 20 / 100");
    expect(getTabPanel().textContent).toContain("Keep moving when it is easier to quit.");

    await clickButton("Routine");

    expect(getTabPanel().textContent).toContain("Protect the habit with simple repeatable plans.");
    expect(getTabPanel().textContent).toContain("XP 10 / 100");
  });

  it("renders Character empty state without implying skills exist", async () => {
    await renderMenu({
      ...menuView,
      character: {
        ...menuView.character,
        defaultSelectedSkillId: null,
        skills: [],
      },
    });

    await clickElement(getTab("Character"));

    expect(getTabPanel().textContent).toContain("No skills yet.");
    expect(getTabPanel().textContent).not.toContain("Stamina");
  });

  it("renders Achievement badges with Available status and selected milestone details", async () => {
    await renderMenu(menuView);

    await clickElement(getTab("Achievements"));

    expect(getTabPanel().textContent).toContain("Campaign milestones");
    expect(getTabPanel().textContent).toContain("First Steps");
    expect(getTabPanel().textContent).toContain("Week One Warden");
    expect(getTabPanel().textContent).toContain("Available");
    expect(getTabPanel().textContent).toContain("Complete your first run.");

    await clickButton("Week One Warden");

    expect(getTabPanel().textContent).toContain("Finish the first week.");
  });

  it("renders Achievements empty state without stale milestone details", async () => {
    await renderMenu({
      ...menuView,
      achievements: {
        ...menuView.achievements,
        defaultSelectedAchievementId: null,
        achievements: [],
      },
    });

    await clickElement(getTab("Achievements"));

    expect(getTabPanel().textContent).toContain("No achievements yet.");
    expect(getTabPanel().textContent).not.toContain("First Steps");
  });

  it("does not show mutation-looking controls in supplemental tabs", async () => {
    await renderMenu(menuView);

    for (const tabName of ["Inventory", "Character", "Achievements"]) {
      await clickElement(getTab(tabName));
      expect(getTabPanel().textContent).not.toMatch(
        /acquire item|award xp|xp award|level up|unlock achievement|claim|complete quest|edit|regenerate|chat/i,
      );
    }
  });
});

async function renderToast() {
  await act(async () => {
    root.render(<AdventureForgedToast />);
  });
}

async function renderMenu(menu: typeof menuView) {
  await act(async () => {
    root.render(<AdventureDetailMenuScreen menu={menu} />);
  });
}

function getTab(name: string) {
  const tab = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find(
    (element) => element.textContent === name,
  );

  if (!tab) {
    throw new Error(`Missing tab: ${name}`);
  }

  return tab;
}

function getTabPanel() {
  const panel = container.querySelector<HTMLElement>('[role="tabpanel"]');

  if (!panel) {
    throw new Error("Missing tab panel");
  }

  return panel;
}

async function clickElement(element: HTMLElement) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function keyDownElement(element: HTMLElement, key: string) {
  await act(async () => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

async function clickButton(name: string) {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((element) =>
    element.textContent?.includes(name),
  );

  if (!button) {
    throw new Error(`Missing button: ${name}`);
  }

  await clickElement(button);
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
    defaultSelectedActId: "act-1",
    defaultSelectedDetailId: "quest-1",
    acts: [
      {
        id: "act-1",
        title: "ACT I — Find Your Pace",
        summary: "Start with a steady first week.",
        mainQuests: [
          {
            id: "quest-1",
            type: "main_quest",
            typeLabel: "Main Quest",
            title: "Pick three run days",
            description: "Choose three realistic run days this week.",
            doneCondition: "Your run days are chosen.",
            rewardIntent: "+20 Stamina",
            statusLabel: "Not started",
            skillRewards: [],
            linkedInventoryNames: [],
          },
        ],
        sideQuests: [],
        bossFights: [],
      },
    ],
  },
  inventory: {
    label: "Inventory",
    description: "Readiness gear for the path.",
    emptyMessage: "No inventory items yet.",
    defaultSelectedItemId: "item-1",
    items: [
      {
        id: "item-1",
        name: "Running Shoes",
        purpose: "Comfortable shoes reduce the friction of starting.",
        statusLabel: "Needed",
      },
      {
        id: "item-2",
        name: "Water Bottle",
        purpose: "Hydration keeps the path safer.",
        statusLabel: "Needed",
      },
    ],
  },
  character: {
    label: "Character",
    description: "Your Adventure skills.",
    emptyMessage: "No skills yet.",
    defaultSelectedSkillId: "skill-1",
    skills: [
      {
        id: "skill-1",
        name: "Stamina",
        description: "Keep moving when it is easier to quit.",
        level: 1,
        xp: 20,
        levelLabel: "Level 1",
        xpLabel: "XP 20 / 100",
      },
      {
        id: "skill-2",
        name: "Routine",
        description: "Protect the habit with simple repeatable plans.",
        level: 1,
        xp: 10,
        levelLabel: "Level 1",
        xpLabel: "XP 10 / 100",
      },
    ],
  },
  achievements: {
    label: "Achievements",
    description: "Campaign milestones.",
    emptyMessage: "No achievements yet.",
    defaultSelectedAchievementId: "achievement-1",
    achievements: [
      {
        id: "achievement-1",
        name: "First Steps",
        description: "Complete your first run.",
        unlockCondition: "Complete your first run.",
        statusLabel: "Available",
      },
      {
        id: "achievement-2",
        name: "Week One Warden",
        description: "Finish the first week.",
        unlockCondition: "Finish the first week.",
        statusLabel: "Available",
      },
    ],
  },
} as const;
