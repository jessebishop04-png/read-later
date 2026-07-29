"use client";

import { useCallback, useEffect, useState } from "react";

type InboundInfo = {
  local: string;
  address: string;
  domain: string;
  configured: boolean;
};

type Props = {
  /** Compact layout for add-menu / empty states */
  compact?: boolean;
  className?: string;
};

export function ForwardEmailPanel({ compact = false, className = "" }: Props) {
  const [info, setInfo] = useState<InboundInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [personalizing, setPersonalizing] = useState(false);
  const [draftLocal, setDraftLocal] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/account/inbound-email", { credentials: "include" });
    const data = (await res.json().catch(() => ({}))) as InboundInfo & { error?: string };
    if (!res.ok) {
      setError(data.error || "Could not load address");
      return;
    }
    setInfo(data);
    setDraftLocal(data.local);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = async () => {
    if (!info?.address) return;
    try {
      await navigator.clipboard.writeText(info.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy");
    }
  };

  const savePersonalized = async () => {
    if (!draftLocal.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/account/inbound-email", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ local: draftLocal.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as InboundInfo & { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not update address");
        return;
      }
      setInfo(data);
      setDraftLocal(data.local);
      setPersonalizing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={className}>
      {!compact ? (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--keepr-faint)]">
            Forward email
          </h2>
          <p className="mt-2 text-sm text-[color:var(--keepr-muted)]">
            To import any email into Keepr, forward it to your unique address. Subscribe newsletters
            directly to this address, or set up auto-forward filters in Gmail.
          </p>
        </>
      ) : (
        <p className="text-[12px] text-[color:var(--keepr-muted)]">
          Forward email to import into Keepr:
        </p>
      )}

      {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}

      <div className={`flex gap-2 ${compact ? "mt-2" : "mt-4"}`}>
        <input
          readOnly
          value={info?.address ?? "Loading…"}
          className="min-w-0 flex-1 truncate rounded-xl border-0 bg-[color:var(--keepr-pill)] px-3 py-2 text-sm text-white focus:outline-none"
          aria-label="Keepr inbound email address"
        />
        <button
          type="button"
          onClick={() => void copy()}
          disabled={!info}
          className="shrink-0 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {!personalizing ? (
        <button
          type="button"
          onClick={() => {
            setPersonalizing(true);
            setDraftLocal(info?.local ?? "");
          }}
          className="mt-2 text-sm text-sky-400 hover:text-sky-300"
        >
          Personalize email address
        </button>
      ) : (
        <div className="mt-3 space-y-2 rounded-xl bg-black/20 p-3">
          <p className="text-xs text-[color:var(--keepr-muted)]">
            Choose a unique local part (4–32 characters).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={draftLocal}
              onChange={(e) => setDraftLocal(e.target.value.toLowerCase())}
              className="min-w-0 flex-1 rounded-lg border-0 bg-[color:var(--keepr-pill)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              spellCheck={false}
              autoComplete="off"
            />
            <span className="text-sm text-[color:var(--keepr-faint)]">
              @{info?.domain ?? "…"}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void savePersonalized()}
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setPersonalizing(false);
                setError(null);
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-[color:var(--keepr-muted)] hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!info?.configured && !compact ? (
        <p className="mt-4 text-xs leading-relaxed text-[color:var(--keepr-faint)]">
          Inbound delivery needs{" "}
          <code className="text-white/70">INBOUND_EMAIL_DOMAIN</code>,{" "}
          <code className="text-white/70">RESEND_API_KEY</code>, and{" "}
          <code className="text-white/70">RESEND_WEBHOOK_SECRET</code>. Point the domain MX to
          Resend and set the webhook to{" "}
          <code className="text-white/70">/api/inbound/email</code>. Until then you can still copy
          this address, or import via{" "}
          <code className="text-white/70">POST /api/items/email</code>.
        </p>
      ) : null}
    </div>
  );
}
