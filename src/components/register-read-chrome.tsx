"use client";

import { useEffect } from "react";
import { useReadChrome, type ReadChromeValue } from "@/components/read-chrome-context";

export function RegisterReadChrome(props: ReadChromeValue) {
  const { setChrome } = useReadChrome();
  const {
    itemId,
    title,
    sourceUrl,
    archived,
    liked,
    tags,
    folderId,
    folders,
  } = props;

  useEffect(() => {
    void fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ markRead: true }),
    });
  }, [itemId]);

  useEffect(() => {
    setChrome({
      itemId,
      title,
      sourceUrl,
      archived,
      liked,
      tags,
      folderId,
      folders,
    });
    return () => setChrome(null);
  }, [
    setChrome,
    itemId,
    title,
    sourceUrl,
    archived,
    liked,
    tags,
    folderId,
    folders,
  ]);

  return null;
}
