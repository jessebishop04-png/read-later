"use client";

import { useEffect } from "react";
import { useReadChrome } from "@/components/read-chrome-context";
import { useTts } from "@/components/tts-context";
import type { ReadSidebarItem } from "@/components/read-right-sidebar";

type Props = {
  item: ReadSidebarItem;
  children: React.ReactNode;
};

/** Registers the read right panel + TTS document and renders article content. */
export function ReadWorkspace({ item, children }: Props) {
  const { setPanelItem } = useReadChrome();
  const { registerDocument, visible: ttsVisible } = useTts();

  useEffect(() => {
    setPanelItem(item);
    return () => setPanelItem(null);
  }, [item, setPanelItem]);

  useEffect(() => {
    registerDocument({
      itemId: item.id,
      title: item.title,
      text: item.contentText || item.excerpt || "",
      siteName: item.siteName,
      imageUrl: item.imageUrl,
      sourceUrl: item.sourceUrl,
    });
    return () => registerDocument(null);
  }, [
    item.id,
    item.title,
    item.contentText,
    item.excerpt,
    item.siteName,
    item.imageUrl,
    item.sourceUrl,
    registerDocument,
  ]);

  return (
    <div
      className={`reader-column mx-auto w-full px-4 pt-2 sm:px-6 lg:px-8 ${
        ttsVisible ? "pb-28" : "pb-10"
      }`}
    >
      {children}
    </div>
  );
}
