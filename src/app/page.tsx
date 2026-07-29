import Link from "next/link";
import { redirect } from "next/navigation";
import { KeeprLogo } from "@/components/keepr-logo";
import { LandingHeroCtas } from "@/components/landing/landing-hero-ctas";
import { LandingHeroMotion } from "@/components/landing/landing-hero-motion";
import { safeAuth } from "@/lib/safe-auth";

export default async function HomePage() {
  const session = await safeAuth();
  if (session?.user?.id) {
    redirect("/library");
  }

  return (
    <div className="landing-root relative min-h-dvh max-w-full overflow-x-hidden overflow-y-auto overscroll-x-none bg-[color:var(--keepr-bg)] font-sans text-keepr">
      <section className="relative isolate min-h-dvh max-w-full overflow-x-hidden">
        <LandingHeroMotion />

        <div className="pointer-events-none relative z-10 flex min-h-dvh flex-col">
          <header className="pointer-events-auto flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
            <KeeprLogo className="text-[18px] text-keepr" />
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-[13px] font-medium text-[color:var(--keepr-muted)] transition hover:text-keepr"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-[color:var(--keepr-text)] px-3.5 py-2 text-[13px] font-medium text-[color:var(--keepr-bg)] transition hover:opacity-90"
              >
                Sign up
              </Link>
            </div>
          </header>

          <div className="flex flex-1 flex-col justify-end px-5 pb-[18vh] pt-6 sm:px-8 lg:max-w-[40%] lg:px-12 lg:pb-[20vh]">
            <p className="mb-5 w-fit rounded-full bg-white/[0.08] px-3.5 py-1.5 text-[12px] font-medium tracking-wide text-white/80 sm:text-[13px]">
              Save for later. Check with AI.
            </p>
            <h1 className="text-[clamp(2.1rem,5vw,3.25rem)] font-bold leading-[1.08] tracking-[-0.04em] text-keepr">
              Save. Read. Verify.
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[color:var(--keepr-muted)] sm:text-[16px]">
              Articles, videos, PDFs, and forwarded newsletters in one library with
              highlights, semantic search, listening, and AI scans built in.
            </p>
            <div className="pointer-events-auto">
              <LandingHeroCtas />
            </div>
          </div>
        </div>
      </section>

      <section
        id="how"
        className="relative border-t border-[color:var(--keepr-border)] bg-[color:var(--keepr-elevated)] px-5 py-24 sm:px-8 lg:px-12"
      >
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-[clamp(1.7rem,3.8vw,2.4rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-keepr">
            From clipped pages to highlighted proof.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[color:var(--keepr-muted)]">
            Keep a calm library, then open Advanced Scan when you need sentence-level clarity —
            AI probability, writing feedback, and originality checks.
          </p>
          <Link
            href="/register"
            className="mt-10 inline-flex items-center gap-2 text-[14px] font-medium text-keepr transition hover:opacity-70"
          >
            Create your library
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <footer className="flex items-center justify-between border-t border-[color:var(--keepr-border)] bg-[color:var(--keepr-bg)] px-5 py-6 text-[12px] text-[color:var(--keepr-faint)] sm:px-8">
        <KeeprLogo className="text-[15px] text-keepr" />
        <span>Read · Save · Scan</span>
      </footer>
    </div>
  );
}
