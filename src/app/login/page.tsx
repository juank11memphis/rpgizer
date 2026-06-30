import { redirect } from "next/navigation";

import { resolveSafePostSignInDestination } from "@/modules/user-identity/infra/auth/redirect-destination";
import { resolveAuthenticatedSessionUser } from "@/modules/user-identity/infra/auth/session";

import { LoginScreen } from "./login-screen";

type LoginPageSearchParams = Promise<{
  error?: string | string[];
  next?: string | string[];
}>;

type LoginPageProps = {
  searchParams: LoginPageSearchParams;
};

function firstSearchParamValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const signInError = firstSearchParamValue(resolvedSearchParams.error);
  const callbackUrl = resolveSafePostSignInDestination(
    firstSearchParamValue(resolvedSearchParams.next),
  );
  const currentUser = await resolveAuthenticatedSessionUser();

  if (currentUser) {
    redirect(callbackUrl);
  }

  return (
    <LoginScreen
      callbackUrl={callbackUrl}
      showSignInError={Boolean(signInError)}
    />
  );
}
