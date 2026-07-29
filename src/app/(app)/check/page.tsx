import { ScanWorkspace } from "@/components/scan/scan-workspace";
import { safeAuth } from "@/lib/safe-auth";

export default async function CheckPage() {
  const session = await safeAuth();
  if (!session?.user?.id) return null;

  return <ScanWorkspace userName={session.user.name ?? null} />;
}
