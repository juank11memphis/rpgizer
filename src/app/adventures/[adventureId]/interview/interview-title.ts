export function deriveInterviewDraftTitle(goalText: string): string {
  const trimmedGoal = goalText.trim();

  if (trimmedGoal.length <= 56) {
    return trimmedGoal;
  }

  return `${trimmedGoal.slice(0, 53).trimEnd()}…`;
}
