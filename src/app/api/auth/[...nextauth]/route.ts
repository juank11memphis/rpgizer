import NextAuth from "next-auth";
import type { NextRequest } from "next/server";

import { buildAuthOptions } from "@/modules/user-identity/infra/auth/config";

type AuthRouteContext = {
  params: Promise<{
    nextauth: string[];
  }>;
};

function handler(request: NextRequest, context: AuthRouteContext) {
  return NextAuth(request, context, buildAuthOptions());
}

export { handler as GET, handler as POST };
