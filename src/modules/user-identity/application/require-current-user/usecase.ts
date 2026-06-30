import type {
  CurrentUser,
  RequireCurrentUserResult,
} from "@/modules/user-identity/application/require-current-user/output";

export type CurrentUserSessionReader = {
  resolveCurrentUser(): Promise<CurrentUser | null>;
};

export async function requireCurrentUser(
  sessionReader: CurrentUserSessionReader,
): Promise<RequireCurrentUserResult> {
  const user = await sessionReader.resolveCurrentUser();

  if (!user) {
    return { status: "unauthenticated" };
  }

  return {
    status: "authenticated",
    user,
  };
}
