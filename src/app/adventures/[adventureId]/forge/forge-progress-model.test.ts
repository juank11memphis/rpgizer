import { describe, expect, it } from "vitest";

import {
  FORGE_STAGE_LABELS,
  applyForgeProgressEvent,
  buildForgeRoadStageViews,
  createInitialForgeProgressSnapshot,
} from "./forge-progress-model";

const forbiddenUserTerms = /quest_lore|adventure_roadmap|xp_rewards|artifact|provider|backend|model|schema/i;

describe("forge progress model", () => {
  it("starts with all stages visible and quest lore current", () => {
    const views = buildForgeRoadStageViews(createInitialForgeProgressSnapshot());

    expect(views.map((stage) => stage.label)).toEqual([
      "Gathering your quest lore",
      "Building your adventure roadmap",
      "Connecting quests, skills, and inventory",
      "Balancing XP and rewards",
      "Opening your adventure",
    ]);
    expect(views.map((stage) => stage.state)).toEqual([
      "current",
      "future",
      "future",
      "future",
      "future",
    ]);
    expect(views.map((stage) => stage.label).join(" ")).not.toMatch(forbiddenUserTerms);
  });

  it("derives completed, current, and future states from started progress", () => {
    const snapshot = applyForgeProgressEvent(createInitialForgeProgressSnapshot(), {
      stage: "connections",
      status: "started",
    });

    expect(buildForgeRoadStageViews(snapshot).map((stage) => stage.state)).toEqual([
      "completed",
      "completed",
      "current",
      "future",
      "future",
    ]);
  });

  it("advances to the next stage when a stage completes", () => {
    const snapshot = applyForgeProgressEvent(createInitialForgeProgressSnapshot(), {
      stage: "quest_lore",
      status: "completed",
    });

    expect(buildForgeRoadStageViews(snapshot).map((stage) => stage.state)).toEqual([
      "completed",
      "current",
      "future",
      "future",
      "future",
    ]);
  });

  it("keeps the final stage completed without inventing another stage", () => {
    const openingSnapshot = applyForgeProgressEvent(createInitialForgeProgressSnapshot(), {
      stage: "opening_adventure",
      status: "started",
    });
    const completedSnapshot = applyForgeProgressEvent(openingSnapshot, {
      stage: "opening_adventure",
      status: "completed",
    });

    expect(buildForgeRoadStageViews(completedSnapshot).map((stage) => stage.state)).toEqual([
      "completed",
      "completed",
      "completed",
      "completed",
      "completed",
    ]);
  });

  it("ignores unknown or malformed payloads", () => {
    const snapshot = createInitialForgeProgressSnapshot();

    expect(applyForgeProgressEvent(snapshot, { stage: "provider_call", status: "started" })).toBe(snapshot);
    expect(applyForgeProgressEvent(snapshot, { stage: "quest_lore", status: "running" })).toBe(snapshot);
    expect(applyForgeProgressEvent(snapshot, null)).toBe(snapshot);
  });

  it("keeps exact UX-approved labels", () => {
    expect(FORGE_STAGE_LABELS).toEqual({
      quest_lore: "Gathering your quest lore",
      adventure_roadmap: "Building your adventure roadmap",
      connections: "Connecting quests, skills, and inventory",
      xp_rewards: "Balancing XP and rewards",
      opening_adventure: "Opening your adventure",
    });
  });
});
