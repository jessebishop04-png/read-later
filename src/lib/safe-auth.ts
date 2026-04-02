import type { Session } from "next-auth";
import { auth } from "@/auth";

/** Avoids 500s when NextAuth misconfigures (e.g. missing AUTH_SECRET); treat as signed out. */
export async function safeAuth(): Promise<Session | null> {
  try {
    return await auth();
  } catch (err) {
    console.error("read-later: auth() failed", err);
    return null;
  }
}
