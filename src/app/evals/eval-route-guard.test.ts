import { describe, expect, it } from "vitest";

import { isLocalEvalDashboardEnabled } from "./eval-route-guard";

describe("isLocalEvalDashboardEnabled", () => {
  it("allows local development", () => {
    expect(isLocalEvalDashboardEnabled({ nodeEnv: "development" })).toBe(true);
  });

  it("blocks production dashboard rendering", () => {
    expect(isLocalEvalDashboardEnabled({ nodeEnv: "production" })).toBe(false);
  });
});
