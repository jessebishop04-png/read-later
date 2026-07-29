import { ReviewTemplatesManager } from "@/components/review/review-templates-manager";
import { safeAuth } from "@/lib/safe-auth";

export default async function ReviewPage() {
  const session = await safeAuth();
  if (!session?.user?.id) return null;

  return (
    <div className="px-4 py-6 sm:px-6">
      <ReviewTemplatesManager />
    </div>
  );
}
