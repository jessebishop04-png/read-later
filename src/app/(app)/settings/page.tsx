import { ApiTokensPanel } from "@/components/api-tokens-panel";

export default function SettingsPage() {
  return (
    <div>
      <p className="text-stone-600 dark:text-stone-400">
        Connect the browser extension and other tools using an API token.
      </p>
      <div className="mt-10 max-w-xl">
        <ApiTokensPanel />
      </div>
      <section className="mt-12 rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-stone-500">
          Install as app
        </h2>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          In Chrome or Edge, use the menu → Install Read Later (or similar) to add this site to your
          home screen. Cached pages can be opened offline after you have visited them online.
        </p>
      </section>
    </div>
  );
}
