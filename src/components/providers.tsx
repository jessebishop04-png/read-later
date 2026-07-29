"use client";

import { SessionProvider } from "next-auth/react";
import { TtsProvider } from "@/components/tts-context";
import { TtsPlayer } from "@/components/tts-player";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TtsProvider>
        {children}
        <TtsPlayer />
      </TtsProvider>
    </SessionProvider>
  );
}
