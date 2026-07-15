type LocalEvalDashboardGuardInput = {
  nodeEnv?: string;
};

export function isLocalEvalDashboardEnabled({
  nodeEnv = process.env.NODE_ENV,
}: LocalEvalDashboardGuardInput = {}): boolean {
  return nodeEnv !== "production";
}
