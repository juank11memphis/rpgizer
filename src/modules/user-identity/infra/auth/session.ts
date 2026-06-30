import { getServerSession } from "next-auth";

import type { CurrentUser } from "@/modules/user-identity/application/require-current-user/output";
import { requireCurrentUser } from "@/modules/user-identity/application/require-current-user/usecase";
import { buildAuthOptions } from "@/modules/user-identity/infra/auth/config";

export async function resolveAuthenticatedSessionUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(buildAuthOptions());
  const sessionUser = session?.user;

  if (!sessionUser?.id) {
    return null;
  }

  return {
    id: sessionUser.id,
    name: sessionUser.name ?? null,
    email: sessionUser.email ?? null,
    image: sessionUser.image ?? null,
  };
}

export async function requireCurrentSessionUser() {
  return requireCurrentUser({
    resolveCurrentUser: resolveAuthenticatedSessionUser,
  });
}
