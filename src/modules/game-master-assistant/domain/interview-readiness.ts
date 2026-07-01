export const INTERVIEW_READINESS_STATUSES = [
  "not_ready",
  "ready_to_generate",
] as const;

export type InterviewReadinessStatus = (typeof INTERVIEW_READINESS_STATUSES)[number];

export function isInterviewReadinessStatus(
  value: string,
): value is InterviewReadinessStatus {
  return INTERVIEW_READINESS_STATUSES.includes(
    value as InterviewReadinessStatus,
  );
}
