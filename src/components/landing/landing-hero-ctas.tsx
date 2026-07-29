"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export function LandingHeroCtas() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const buttons = Array.from(root.querySelectorAll<HTMLElement>("[data-cta]"));
    const cleanups: Array<() => void> = [];

    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set(buttons, { autoAlpha: 1, y: 0, scale: 1 });
        return;
      }

      gsap.fromTo(
        buttons,
        { autoAlpha: 0, y: 16, scale: 0.96 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          stagger: 0.1,
          delay: 0.35,
          ease: "power3.out",
        }
      );

      for (const btn of buttons) {
        const enter = () => {
          gsap.to(btn, { scale: 1.04, duration: 0.28, ease: "power2.out", overwrite: "auto" });
        };
        const leave = () => {
          gsap.to(btn, { scale: 1, duration: 0.28, ease: "power2.out", overwrite: "auto" });
        };
        const down = () => {
          gsap.to(btn, { scale: 0.97, duration: 0.12, ease: "power2.out", overwrite: "auto" });
        };
        btn.addEventListener("pointerenter", enter);
        btn.addEventListener("pointerleave", leave);
        btn.addEventListener("pointerdown", down);
        btn.addEventListener("pointerup", enter);
        cleanups.push(() => {
          btn.removeEventListener("pointerenter", enter);
          btn.removeEventListener("pointerleave", leave);
          btn.removeEventListener("pointerdown", down);
          btn.removeEventListener("pointerup", enter);
        });
      }
    }, root);

    return () => {
      for (const fn of cleanups) fn();
      ctx.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="mt-10 flex flex-wrap items-center gap-3">
      <Link
        data-cta
        href="/register"
        className="inline-flex items-center rounded-full bg-[color:var(--keepr-text)] px-5 py-2.5 text-[14px] font-medium text-[color:var(--keepr-bg)] opacity-0"
      >
        Start using Keepr
      </Link>
      <Link
        data-cta
        href="#how"
        className="inline-flex items-center gap-2.5 rounded-full bg-[color:var(--keepr-elevated)] py-2 pl-4 pr-2 text-[14px] font-medium text-[color:var(--keepr-muted)] opacity-0"
      >
        How it works
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.12]"
          aria-hidden
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3 translate-x-[1px] text-white" fill="currentColor">
            <path d="M8 5.14v13.72L19 12 8 5.14z" />
          </svg>
        </span>
      </Link>
    </div>
  );
}
