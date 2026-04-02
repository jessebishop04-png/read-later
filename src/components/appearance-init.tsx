"use client";

import { APPEARANCE_INIT_SCRIPT } from "@/lib/appearance";

/** Client boundary so the inline script is not emitted from the RSC root (avoids some Next 15 / React 19 server errors). */
export function AppearanceInit() {
  return (
    <script
      id="read-later-appearance-init"
      dangerouslySetInnerHTML={{ __html: APPEARANCE_INIT_SCRIPT }}
    />
  );
}
