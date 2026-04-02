import Link from "next/link";
import { safeAuth } from "@/lib/safe-auth";
import { DbSetupNotice } from "@/components/db-setup-notice";
import { ProfileAccountForms } from "@/components/profile-account-forms";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
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

  const displayName = name?.trim() || email || "Your account";

  return (
    <div className="max-w-xl">
      <p className="text-stone-600 dark:text-stone-400">
        Signed in as <span className="font-medium text-stone-800 dark:text-stone-200">{displayName}</span>
      </p>

      <ProfileAccountForms
        initialName={name}
        initialImage={image}
        email={email}
        hasPasswordLogin={hasPasswordLogin}
      />

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/settings"
          className="inline-flex rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          Settings &amp; API tokens
        </Link>
        <Link
          href="/library"
          className="inline-flex rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          Back to library
        </Link>
      </div>
    </div>
  );
}
