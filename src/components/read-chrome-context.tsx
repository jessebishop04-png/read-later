"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type ReadChromeFolder = { id: string; name: string };

export type ReadChromeValue = {
  itemId: string;
  title: string;
  sourceUrl: string;
  archived: boolean;
  liked: boolean;
  tags: string[];
  folderId: string | null;
  folders: ReadChromeFolder[];
};

type Ctx = {
  chrome: ReadChromeValue | null;
  setChrome: (v: ReadChromeValue | null) => void;
};

const ReadChromeContext = createContext<Ctx | null>(null);

export function ReadChromeProvider({ children }: { children: React.ReactNode }) {
  const [chrome, setChromeState] = useState<ReadChromeValue | null>(null);
  const setChrome = useCallback((v: ReadChromeValue | null) => {
    setChromeState(v);
  }, []);

  const value = useMemo(() => ({ chrome, setChrome }), [chrome, setChrome]);

  return <ReadChromeContext.Provider value={value}>{children}</ReadChromeContext.Provider>;
}

export function useReadChrome() {
  const ctx = useContext(ReadChromeContext);
  if (!ctx) {
    throw new Error("useReadChrome must be used within ReadChromeProvider");
  }
  return ctx;
}

export function useOptionalReadChrome() {
  return useContext(ReadChromeContext);
}
