import { AddUrlForm } from "@/components/add-url-form";

export default function AddPage() {
  return (
    <div className="mx-auto max-w-xl">
      <p className="text-stone-600 dark:text-stone-400">
        Paste any article or video URL. We will fetch a clean reading view when possible.
      </p>
      <div className="mt-8">
        <AddUrlForm />
      </div>
    </div>
  );
}
