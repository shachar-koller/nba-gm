"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface ActiveFilterChip {
  key: string;
  label: string;
  value: string;
  display: string;
}

/**
 * Sync a small set of string filters to the URL query string.
 * Empty values are omitted. Replaces history (no stack spam).
 */
export function useUrlFilters<T extends Record<string, string>>(
  defaults: T,
  labels?: Partial<Record<keyof T & string, string>>
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultsKey = JSON.stringify(defaults);
  const stableDefaults = useMemo(
    () => JSON.parse(defaultsKey) as T,
    [defaultsKey]
  );

  const values = useMemo(() => {
    const next = { ...stableDefaults };
    for (const key of Object.keys(stableDefaults) as Array<keyof T & string>) {
      const v = searchParams.get(key);
      if (v != null) next[key] = v as T[typeof key];
    }
    return next;
  }, [stableDefaults, searchParams]);

  const writeParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const setFilter = useCallback(
    (key: keyof T & string, value: string) => {
      writeParams((params) => {
        const def = stableDefaults[key] ?? "";
        if (!value || value === def) params.delete(key);
        else params.set(key, value);
      });
    },
    [stableDefaults, writeParams]
  );

  const setFilters = useCallback(
    (patch: Partial<T>) => {
      writeParams((params) => {
        for (const [key, value] of Object.entries(patch) as Array<
          [keyof T & string, string]
        >) {
          const def = stableDefaults[key] ?? "";
          if (!value || value === def) params.delete(key);
          else params.set(key, value);
        }
      });
    },
    [stableDefaults, writeParams]
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const clearFilter = useCallback(
    (key: string) => {
      if (!(key in stableDefaults)) return;
      const k = key as keyof T & string;
      setFilter(k, stableDefaults[k] ?? "");
    },
    [setFilter, stableDefaults]
  );

  const hasActive = useMemo(() => {
    return (Object.keys(stableDefaults) as Array<keyof T & string>).some(
      (key) => {
        const v = values[key];
        const def = stableDefaults[key] ?? "";
        return Boolean(v) && v !== def;
      }
    );
  }, [stableDefaults, values]);

  const chips: ActiveFilterChip[] = useMemo(() => {
    const out: ActiveFilterChip[] = [];
    for (const key of Object.keys(stableDefaults) as Array<keyof T & string>) {
      const v = values[key];
      const def = stableDefaults[key] ?? "";
      if (!v || v === def) continue;
      // Hide internal sort keys from chip row if labeled as such — still allow if labeled
      const label = labels?.[key] ?? key;
      out.push({
        key,
        label,
        value: v,
        display: v,
      });
    }
    return out;
  }, [stableDefaults, values, labels]);

  const queryString = searchParams.toString();

  return {
    values,
    setFilter,
    setFilters,
    clearFilters,
    clearFilter,
    hasActive,
    chips,
    queryString,
    pathname,
  };
}
