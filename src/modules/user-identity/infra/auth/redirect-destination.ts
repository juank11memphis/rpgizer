export const defaultPostSignInDestination = "/adventures/new";

export function resolveSafePostSignInDestination(
  rawDestination: string | undefined,
): string {
  if (!rawDestination) {
    return defaultPostSignInDestination;
  }

  if (!rawDestination.startsWith("/")) {
    return defaultPostSignInDestination;
  }

  if (rawDestination.startsWith("//")) {
    return defaultPostSignInDestination;
  }

  return rawDestination;
}
