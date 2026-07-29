"use client";

import { ForwardEmailPanel } from "@/components/forward-email-panel";

export function EmailsEmptyState() {
  return (
    <div className="mx-auto mt-10 max-w-lg text-center">
      <p className="text-[color:var(--keepr-muted)]">No emails yet.</p>
      <div className="mt-6 rounded-xl bg-[color:var(--keepr-elevated)] p-5 text-left">
        <ForwardEmailPanel compact />
      </div>
      <p className="mt-4 text-sm text-[color:var(--keepr-faint)]">
        Forwarded messages appear here and open in the reader like articles.
      </p>
    </div>
  );
}
