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
  const callbackUrl = firstSearchParamValue(resolvedSearchParams.next) ?? "/adventures/new";

  return (
    <LoginScreen
      callbackUrl={callbackUrl}
      showSignInError={Boolean(signInError)}
    />
  );
}
