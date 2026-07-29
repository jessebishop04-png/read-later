"use client";

import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useReadChrome } from "@/components/read-chrome-context";
import { useContainRegionWheel } from "@/lib/contain-region-wheel";

const OPEN_WIDTH = 340;
const COLLAPSED_WIDTH = 48;

function IconPanel({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15.5 4.5v15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

type Props = {
  ariaLabel: string;
  /** Optional header row under the toggle (e.g. reader tabs). */
  header?: ReactNode;
  children: ReactNode;
  /** Extra elements to animate with the body on open (e.g. tab labels). */
  labelsRef?: React.RefObject<HTMLElement | null>;
  /** When true, body fills height without outer scroll (child manages scroll). */
  fill?: boolean;
  /** Open width in px (default 340). */
  widthOpen?: number;
};

/** Shared Keepr right panel chrome — same shell/animation as the reader sidebar. */
export function RightPanelShell({
  ariaLabel,
  header,
  children,
  labelsRef,
  fill = false,
  widthOpen = OPEN_WIDTH,
}: Props) {
  const { rightPanelOpen: open, toggleRightPanel } = useReadChrome();
  const [hydrated, setHydrated] = useState(false);
  const shellRef = useRef<HTMLElement | null>(null);
  const regionRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  useContainRegionWheel(regionRef);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell || !hydrated) return;

    tweenRef.current?.kill();

    const labels = labelsRef?.current
      ? Array.from(labelsRef.current.querySelectorAll("[data-tab-label]"))
      : [];
    const body = bodyRef.current;
    const targetWidth = open ? widthOpen : COLLAPSED_WIDTH;

    if (open) {
      tweenRef.current = gsap.to(shell, {
        width: targetWidth,
        duration: 0.42,
        ease: "power3.out",
        overwrite: true,
        onStart: () => {
          shell.setAttribute("aria-hidden", "false");
        },
      });
      if (labels.length) {
        gsap.fromTo(
          labels,
          { autoAlpha: 0, x: 10 },
          { autoAlpha: 1, x: 0, duration: 0.28, stagger: 0.04, delay: 0.12, ease: "power2.out" }
        );
      }
      if (body) {
        gsap.fromTo(
          body,
          { autoAlpha: 0, x: 16 },
          { autoAlpha: 1, x: 0, duration: 0.34, delay: 0.1, ease: "power2.out" }
        );
      }
    } else {
      if (body) gsap.to(body, { autoAlpha: 0, x: 12, duration: 0.16, ease: "power1.in" });
      if (labels.length) gsap.to(labels, { autoAlpha: 0, x: 8, duration: 0.14, ease: "power1.in" });
      tweenRef.current = gsap.to(shell, {
        width: targetWidth,
        duration: 0.38,
        ease: "power3.inOut",
        overwrite: true,
        onComplete: () => {
          shell.setAttribute("aria-hidden", "true");
        },
      });
    }

    return () => {
      tweenRef.current?.kill();
    };
  }, [open, hydrated, labelsRef, widthOpen]);

  return (
    <div
      ref={regionRef}
      className="sticky top-0 z-20 hidden h-dvh shrink-0 self-start overscroll-contain lg:block"
    >
      <aside
        ref={shellRef}
        className="relative h-full overflow-hidden bg-keepr text-keepr"
        style={{ width: open ? widthOpen : COLLAPSED_WIDTH }}
        aria-label={ariaLabel}
      >
        <button
          type="button"
          onClick={() => toggleRightPanel()}
          className="absolute right-1.5 top-2.5 z-20 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--keepr-muted)] hover:bg-[color:var(--keepr-elevated)] hover:text-keepr"
          title={open ? "Hide right panel" : "Show right panel"}
          aria-label={open ? "Hide right panel" : "Show right panel"}
          aria-pressed={open}
        >
          <IconPanel className="h-5 w-5" />
        </button>

        <div className="flex h-full flex-col bg-keepr" style={{ width: widthOpen }}>
          <div
            className={`flex h-14 shrink-0 items-center px-2 pr-12 ${
              open ? "" : "pointer-events-none invisible"
            }`}
          >
            {header}
          </div>
          <div
            ref={bodyRef}
            className={`min-h-0 flex-1 overscroll-contain ${
              fill ? "flex flex-col overflow-hidden" : "overflow-y-auto scrollbar-hide"
            } ${open ? "" : "pointer-events-none invisible"}`}
          >
            {children}
          </div>
        </div>
      </aside>
    </div>
  );
}
