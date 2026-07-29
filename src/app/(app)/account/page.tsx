import { safeAuth } from "@/lib/safe-auth";
import { DbSetupNotice } from "@/components/db-setup-notice";
import { AccountPanel } from "@/components/account-panel";
import { prisma } from "@/lib/prisma";

export default async function AccountPage() {
  const session = await safeAuth();
  if (!session?.user?.id) return null;

  let name: string | null = null;
  let email: string | null = null;
  let image: string | null = null;
  let hasPasswordLogin = false;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, image: true, passwordHash: true },
    });
    name = user?.name ?? null;
    email = user?.email ?? null;
    image = user?.image ?? null;
    hasPasswordLogin = Boolean(user?.passwordHash);
  } catch {
    return <DbSetupNotice />;
  }

  return (
    <AccountPanel
      initialName={name}
      initialImage={image}
      email={email}
      hasPasswordLogin={hasPasswordLogin}
    />
  );
}
