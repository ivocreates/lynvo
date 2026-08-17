"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function SearchInput({ placeholder = "Search..." }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    const params = new URLSearchParams(searchParams.toString());

    if (query) params.set("q", query);
    else params.delete("q");

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
      <label htmlFor="q" className="sr-only">
        Search
      </label>
      <input
        id="q"
        name="q"
        defaultValue={searchParams.get("q") ?? ""}
        placeholder={placeholder}
        className="w-full max-w-xs rounded-card border border-border bg-surface px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-card border border-border px-3 py-2 text-sm hover:bg-surface"
      >
        Search
      </button>
    </form>
  );
}
