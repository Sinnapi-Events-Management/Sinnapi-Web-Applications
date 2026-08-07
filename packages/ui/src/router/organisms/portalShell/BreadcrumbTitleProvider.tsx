'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface BreadcrumbTitleContextValue {
  titles: Record<string, string>;
  setTitle: (path: string, label: string | undefined) => void;
}

const BreadcrumbTitleContext = createContext<BreadcrumbTitleContextValue | null>(null);

/**
 * Holds the labels detail pages contribute to the breadcrumb trail, keyed by
 * the route they belong to. Rendered inside `PortalShell` so both the top bar
 * (which reads the labels) and the `Outlet` (whose pages write them) sit under
 * the same provider.
 */
export function BreadcrumbTitleProvider({ children }: { children: ReactNode }) {
  const [titles, setTitles] = useState<Record<string, string>>({});

  const setTitle = useCallback((path: string, label: string | undefined) => {
    setTitles((prev) => {
      if (label === undefined) {
        if (!(path in prev)) return prev;
        const next = { ...prev };
        delete next[path];
        return next;
      }
      if (prev[path] === label) return prev;
      return { ...prev, [path]: label };
    });
  }, []);

  const value = useMemo(() => ({ titles, setTitle }), [titles, setTitle]);

  return (
    <BreadcrumbTitleContext.Provider value={value}>{children}</BreadcrumbTitleContext.Provider>
  );
}

/** Registered labels. Empty outside a provider, so the trail still renders. */
export function useBreadcrumbTitles(): Record<string, string> {
  return useContext(BreadcrumbTitleContext)?.titles ?? {};
}

/**
 * Names the current route in the breadcrumb trail — call it from a detail page
 * with whatever the record is actually called:
 *
 * ```tsx
 * useBreadcrumbTitle(vendor?.business_name);
 * ```
 *
 * Pass `undefined` while the record loads and the trail falls back to a generic
 * "Details" crumb, then swaps in the real name when it arrives. The label is
 * dropped again on unmount, so a stale name never leaks onto the next route.
 */
export function useBreadcrumbTitle(label: string | undefined | null, path?: string): void {
  const ctx = useContext(BreadcrumbTitleContext);
  const { pathname } = useLocation();
  const target = path ?? pathname;
  const setTitle = ctx?.setTitle;

  useEffect(() => {
    if (!setTitle) return;
    setTitle(target, label ?? undefined);
    return () => setTitle(target, undefined);
  }, [setTitle, target, label]);
}
