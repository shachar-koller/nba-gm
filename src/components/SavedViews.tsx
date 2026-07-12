"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSavedViews } from "@/lib/savedViews";

export function SavedViewsBar({
  path,
  queryString,
}: {
  path: string;
  queryString: string;
}) {
  const router = useRouter();
  const { views, save, remove } = useSavedViews(path);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--border-strong)] transition-colors"
      >
        Saved views{views.length ? ` (${views.length})` : ""}
      </button>

      {open && (
        <div className="flex w-full flex-col gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3 sm:max-w-md">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this filter set…"
              className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  save(name, queryString);
                  setName("");
                }
              }}
            />
            <button
              type="button"
              disabled={!name.trim()}
              onClick={() => {
                save(name, queryString);
                setName("");
              }}
              className="rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              Save
            </button>
          </div>
          {views.length === 0 ? (
            <p className="text-[11px] text-[var(--muted)]">
              No saved views on this page yet. Set filters, then save.
            </p>
          ) : (
            <ul className="space-y-1">
              {views.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-2 rounded-md px-1 py-1 hover:bg-[var(--surface-2)]"
                >
                  <button
                    type="button"
                    className="min-w-0 truncate text-left text-xs font-medium hover:text-[var(--accent)]"
                    onClick={() => {
                      router.replace(v.query ? `${path}?${v.query}` : path);
                      setOpen(false);
                    }}
                  >
                    {v.name}
                  </button>
                  <button
                    type="button"
                    className="shrink-0 text-[10px] text-[var(--muted)] hover:text-[var(--neg)]"
                    onClick={() => remove(v.id)}
                    aria-label={`Delete ${v.name}`}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
