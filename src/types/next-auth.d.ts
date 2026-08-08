import type { DefaultSession } from "next-auth";

// Extend the default NextAuth types so `session.user.id` is available.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
