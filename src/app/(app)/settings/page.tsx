import { ApiTokensPanel } from "@/components/api-tokens-panel";
import { ForwardEmailPanel } from "@/components/forward-email-panel";
import { SearchReindexPanel } from "@/components/search-reindex-panel";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white">Settings</h1>
      <p className="mt-2 text-[color:var(--keepr-muted)]">
        Connect the browser extension and other tools using an API token.
      </p>
      <div className="mt-10 max-w-xl rounded-xl bg-[color:var(--keepr-elevated)] p-6">
        <ForwardEmailPanel />
      </div>
      <div className="mt-10 max-w-xl">
        <ApiTokensPanel />
      </div>
      <div className="max-w-xl">
        <SearchReindexPanel />
      </div>
      <section className="mt-12 max-w-xl rounded-xl bg-[color:var(--keepr-elevated)] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--keepr-faint)]">
          Advanced AI Scan & Review
        </h2>
        <p className="mt-2 text-sm text-[color:var(--keepr-muted)]">
          AI detection on the{" "}
          <a href="/check" className="text-sky-400 hover:text-sky-300">
            Advanced AI Scan
          </a>{" "}
          page and reader tab requires{" "}
          <code className="text-white/80">GPTZERO_API_KEY</code> in your environment (from{" "}
          <a
            href="https://gptzero.me/developers"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300"
          >
            GPTZero
          </a>
          ). Writing Feedback and Plagiarism use{" "}
          <code className="text-white/80">OPENAI_API_KEY</code>. For live plagiarism source
          URLs, also set <code className="text-white/80">SERPER_API_KEY</code> (
          <a
            href="https://serper.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300"
          >
            Serper
          </a>
          ). Restart the dev server after adding keys.
        </p>
      </section>
      <section className="mt-12 max-w-xl rounded-xl bg-[color:var(--keepr-elevated)] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--keepr-faint)]">
          Install as app
        </h2>
        <p className="mt-2 text-sm text-[color:var(--keepr-muted)]">
          In Chrome or Edge, use the menu → Install Keepr (or similar) to add this site to your
          home screen. Cached pages can be opened offline after you have visited them online.
        </p>
      </section>
    </div>
  );
}
