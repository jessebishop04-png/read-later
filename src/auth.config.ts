import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth options (no Prisma / bcrypt). Used by middleware.
 * Full providers live in auth.ts.
 */
export const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email ?? null;
        token.name = user.name ?? null;
        token.image = user.image ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        const email = token.email as string | null | undefined;
        const name = token.name as string | null | undefined;
        const image = token.image as string | null | undefined;
        session.user.email = email ?? session.user.email;
        session.user.name = name ?? session.user.name;
        session.user.image = image ?? session.user.image;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
