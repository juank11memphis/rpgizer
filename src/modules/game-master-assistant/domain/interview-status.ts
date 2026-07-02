export const INTERVIEW_STATUSES = [
  "interviewing",
  "awaiting_confirmation",
  "confirmed",
] as const;

export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export function isInterviewStatus(value: string): value is InterviewStatus {
  return INTERVIEW_STATUSES.includes(value as InterviewStatus);
}

export function deriveInterviewStatusFromReadiness(
  readinessStatus: "not_ready" | "ready_to_generate",
): InterviewStatus {
  return readinessStatus === "ready_to_generate"
    ? "awaiting_confirmation"
    : "interviewing";
}
