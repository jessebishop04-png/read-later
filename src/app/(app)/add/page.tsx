import { AddUrlForm } from "@/components/add-url-form";

export default function AddPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold text-white">Add</h1>
      <p className="mt-2 text-[color:var(--keepr-muted)]">
        Paste a URL (articles, videos, or PDFs) or upload a PDF. We’ll extract text and index it for search.
      </p>
      <div className="mt-8">
        <AddUrlForm />
      </div>
    </div>
  );
}
