export const APPLICATION_LOG_EVENTS = {
  ADVENTURE_DRAFT_CREATE_SUCCESS: "adventure_draft.create.success",
  INTERVIEW_ANSWER_PERSISTED: "interview.answer.persisted",
  INTERVIEW_TURN_COMPLETED: "interview.turn.completed",
  INTERVIEW_TURN_RECOVERABLE_FAILURE: "interview.turn.recoverable_failure",
  INTERVIEW_READINESS_CHANGED: "interview.readiness.changed",
  INTERVIEW_CONFIRMED: "interview.confirmed",
} as const;

export type ApplicationLogEventName =
  (typeof APPLICATION_LOG_EVENTS)[keyof typeof APPLICATION_LOG_EVENTS];
