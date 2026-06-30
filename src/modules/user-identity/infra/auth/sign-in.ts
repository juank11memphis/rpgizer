export const googleProviderId = "google";

export async function startGoogleSignIn(callbackUrl: string): Promise<void> {
  const { signIn } = await import("next-auth/react");

  await signIn(googleProviderId, {
    callbackUrl,
  });
}
