import type { Session } from "next-auth";
import { AppShell } from "@/components/app-shell";
import { ReadChromeProvider } from "@/components/read-chrome-context";
import { prisma } from "@/lib/prisma";
import { safeAuth } from "@/lib/safe-auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session: Session | null = await safeAuth();
  let folders: { id: string; name: string }[] = [];
  let navUser: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null = null;

  if (session?.user?.id) {
    try {
      const [folderRows, u] = await Promise.all([
        prisma.folder.findMany({
          where: { userId: session.user.id },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { name: true, email: true, image: true },
        }),
      ]);
      folders = folderRows;
      if (u) {
        navUser = {
          name: u.name ?? null,
          email: u.email ?? null,
          image: u.image ?? null,
        };
      } else {
        navUser = {
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          image: session.user.image ?? null,
        };
      }
    } catch {
      folders = [];
      if (session.user.id) {
        navUser = {
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          image: session.user.image ?? null,
        };
      }
    }
  }

  return (
    <ReadChromeProvider>
      <AppShell folders={folders} user={navUser}>
        {children}
      </AppShell>
    </ReadChromeProvider>
  );
}
