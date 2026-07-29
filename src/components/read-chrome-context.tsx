"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReadSidebarItem } from "@/components/read-right-sidebar";
import type { ScanResultTabId } from "@/lib/scan-result-tabs";
import type { PlagiarismResultPayload } from "@/lib/plagiarism-types";
import type { ReviewResultPayload } from "@/lib/review-presets";
import type { ScanResultPayload, ScanSentence, ScanTypeId } from "@/lib/scan-types";

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

/** Props for the Advanced AI Scan right panel (mounted in AppShell). */
export type ScanPanelState = {
  userName?: string | null;
  selected: ScanTypeId[];
  onToggle: (id: ScanTypeId) => void;
  onScan: () => void;
  onOpenReviewer: () => void;
  scanning: boolean;
  text: string;
  configured: boolean | null;
  /** @deprecated Prefer aiResult — kept for gradual migration. */
  result?: ScanResultPayload | null;
  aiResult?: ScanResultPayload | null;
  reviewResult?: ReviewResultPayload | null;
  plagiarismResult?: PlagiarismResultPayload | null;
  resultTab?: ScanResultTabId;
  /** Activate a top tab and run that tool. */
  onActivateResultTab?: (tab: ScanResultTabId) => void;
  onSelectResultTab?: (tab: ScanResultTabId) => void;
  lastScans?: ScanTypeId[];
  showSentences?: boolean;
  selectedSentence?: number | null;
  onSelectSentence?: (index: number) => void;
  onClearResult?: () => void;
  onClearReview?: () => void;
  onClearPlagiarism?: () => void;
};

/** Reader article overlay driven by the Scan tab. */
export type ReaderScanOverlay = {
  sentences: ScanSentence[];
  selectedIndex: number | null;
  setSelectedIndex: (index: number | null) => void;
};

const PANEL_STORAGE_KEY = "keepr-read-right-open";

type Ctx = {
  chrome: ReadChromeValue | null;
  setChrome: (v: ReadChromeValue | null) => void;
  panelItem: ReadSidebarItem | null;
  setPanelItem: (v: ReadSidebarItem | null) => void;
  scanPanel: ScanPanelState | null;
  setScanPanel: (v: ScanPanelState | null) => void;
  readerScanOverlay: ReaderScanOverlay | null;
  setReaderScanOverlay: (v: ReaderScanOverlay | null) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (v: boolean) => void;
  toggleRightPanel: () => void;
};

const ReadChromeContext = createContext<Ctx | null>(null);

export function ReadChromeProvider({ children }: { children: React.ReactNode }) {
  const [chrome, setChromeState] = useState<ReadChromeValue | null>(null);
  const [panelItem, setPanelItemState] = useState<ReadSidebarItem | null>(null);
  const [scanPanel, setScanPanelState] = useState<ScanPanelState | null>(null);
  const [readerScanOverlay, setReaderScanOverlayState] =
    useState<ReaderScanOverlay | null>(null);
  const [rightPanelOpen, setRightPanelOpenState] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PANEL_STORAGE_KEY);
      if (stored === "0") setRightPanelOpenState(false);
      if (stored === "1") setRightPanelOpenState(true);
    } catch {
      /* ignore */
    }
  }, []);

  const setChrome = useCallback((v: ReadChromeValue | null) => {
    setChromeState(v);
  }, []);
  const setPanelItem = useCallback((v: ReadSidebarItem | null) => {
    setPanelItemState(v);
  }, []);
  const setScanPanel = useCallback((v: ScanPanelState | null) => {
    setScanPanelState(v);
  }, []);
  const setReaderScanOverlay = useCallback((v: ReaderScanOverlay | null) => {
    setReaderScanOverlayState(v);
  }, []);
  const setRightPanelOpen = useCallback((v: boolean) => {
    setRightPanelOpenState(v);
    try {
      localStorage.setItem(PANEL_STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);
  const toggleRightPanel = useCallback(() => {
    setRightPanelOpenState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PANEL_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      chrome,
      setChrome,
      panelItem,
      setPanelItem,
      scanPanel,
      setScanPanel,
      readerScanOverlay,
      setReaderScanOverlay,
      rightPanelOpen,
      setRightPanelOpen,
      toggleRightPanel,
    }),
    [
      chrome,
      setChrome,
      panelItem,
      setPanelItem,
      scanPanel,
      setScanPanel,
      readerScanOverlay,
      setReaderScanOverlay,
      rightPanelOpen,
      setRightPanelOpen,
      toggleRightPanel,
    ]
  );

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
