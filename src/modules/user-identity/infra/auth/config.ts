import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { Adapter } from "next-auth/adapters";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/db/schema";
import { getUserIdentityDb } from "@/modules/user-identity/infra/db/client";

function readRequiredEnvironmentValue(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for Google sign-in.`);
  }

  return value;
}

export function buildAuthOptions(): NextAuthOptions {
  return {
    adapter: DrizzleAdapter(getUserIdentityDb(), {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }) as Adapter,
    providers: [
      GoogleProvider({
        clientId: readRequiredEnvironmentValue("GOOGLE_CLIENT_ID"),
        clientSecret: readRequiredEnvironmentValue("GOOGLE_CLIENT_SECRET"),
      }),
    ],
    session: {
      strategy: "database",
    },
    callbacks: {
      session({ session, user }) {
        if (session.user) {
          session.user.id = user.id;
        }

        return session;
      },
    },
    secret: readRequiredEnvironmentValue("AUTH_SECRET"),
  };
}
