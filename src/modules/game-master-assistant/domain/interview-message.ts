export const INTERVIEW_MESSAGE_ROLES = ["user", "game_master"] as const;

export type InterviewMessageRole = (typeof INTERVIEW_MESSAGE_ROLES)[number];

export type InterviewMessage = {
  id: string;
  role: InterviewMessageRole;
  content: string;
  sequenceNumber: number;
  createdAt: Date;
};

export function normalizeRequiredInterviewText(
  fieldName: string,
  value: string,
): string {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new Error(`${fieldName} must not be blank.`);
  }

  return trimmedValue;
}
