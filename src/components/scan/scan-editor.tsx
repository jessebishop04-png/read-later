"use client";

import { useCallback, useRef, useState } from "react";
import { SCAN_MIN_CHARS } from "@/lib/scan-types";

type Props = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
};

async function readFileAsText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return file.text();
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    // PDFs need server extraction elsewhere; accept raw bytes as unsupported here.
    throw new Error(
      "PDF upload on Advanced AI Scan is limited — paste text, or save the PDF in Keepr and scan from the reader."
    );
  }
  // Best-effort for other types.
  return file.text();
}

export function ScanEditor({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const ingestFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      setFileError(null);
      try {
        const parts: string[] = [];
        for (const f of list) {
          parts.push(await readFileAsText(f));
        }
        const next = parts.join("\n\n").trim();
        if (next) onChange(value.trim() ? `${value.trim()}\n\n${next}` : next);
      } catch (e) {
        setFileError(e instanceof Error ? e.message : "Could not read file");
      }
    },
    [onChange, value]
  );

  const chars = value.trim().length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Start writing, or paste in your text."
        className="min-h-[200px] w-full min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-[16px] leading-relaxed text-keepr outline-none placeholder:text-[color:var(--keepr-faint)] disabled:opacity-60"
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void ingestFiles(e.dataTransfer.files);
        }}
        className={`mt-3 shrink-0 rounded-2xl border border-dashed px-4 py-5 transition ${
          dragOver
            ? "border-sky-400/60 bg-sky-500/10"
            : "border-white/15 bg-[color:var(--keepr-elevated)]"
        }`}
      >
        <p className="text-center text-[13px] text-[color:var(--keepr-muted)]">
          Drag and drop or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-medium text-sky-400 hover:text-sky-300"
          >
            Upload files
          </button>
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,text/plain"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void ingestFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {fileError ? (
        <p className="mt-2 shrink-0 text-[12px] text-rose-400">{fileError}</p>
      ) : null}

      <p className="mt-3 shrink-0 text-[12px] text-[color:var(--keepr-faint)]">
        Enter at least {SCAN_MIN_CHARS} characters to scan | {chars.toLocaleString()} characters
      </p>
    </div>
  );
}
