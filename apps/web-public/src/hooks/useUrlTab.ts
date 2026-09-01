'use client';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server.
 *
 * The deep-linked section has to be applied *before* the browser paints, or a
 * visitor opening `?tab=packages` watches the overview render and swap out from
 * under them. React logs a warning for a layout effect during server rendering,
 * hence the switch — the server branch never runs anything either way.
 */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function readTab<T extends string>(tabs: readonly T[], param: string): T {
  const raw = new URLSearchParams(window.location.search).get(param);
  return tabs.includes(raw as T) ? (raw as T) : tabs[0];
}

/**
 * Keeps the open section in the URL, so `/vendors/acme?tab=packages` deep-links
 * and a reload — or a link shared into a planning thread — lands on the section
 * that was being read.
 *
 * The App Router twin of the portals' `useUrlTab` (`@sinnapi/ui/router`), which
 * cannot be reused here because it is built on react-router. Same contract, so
 * the two behave identically: the first entry in `tabs` is the default and is
 * represented by the *absence* of the parameter, which keeps the canonical URL
 * clean — it matters more on this side, where that URL is the one indexed — and
 * means adding a section later can never re-point an existing link. An
 * unrecognised value falls back to the default rather than rendering nothing.
 *
 * Deliberately *not* built on `next/navigation`'s `useSearchParams`. This page
 * is statically generated (`generateStaticParams` plus ISR), and reading search
 * params during prerender forces the whole subtree behind a Suspense boundary
 * and out of the static HTML — which would hand crawlers a spinner in place of
 * the vendor's biography, packages and reviews. Reading `window.location`
 * after hydration keeps every panel in the prerendered document, which is the
 * entire reason the panels stay mounted.
 *
 * Writes go through `replaceState` rather than a router call, the same way the
 * vendors listing writes its filters: no navigation, no RSC refetch, and Back
 * returns to the listing instead of walking the reader back through the four
 * tabs they happened to tap. `popstate` is still honoured, so a Back that
 * *does* re-enter this page at a `?tab=` lands on the right section.
 */
export function useUrlTab<T extends string>(tabs: readonly T[], param = 'tab') {
  const [tab, setTabState] = useState<T>(tabs[0]);

  // Seeds from the URL after hydration. The server rendered the default, which
  // is what the static HTML has to contain; this corrects it before paint.
  useIsomorphicLayoutEffect(() => {
    setTabState(readTab(tabs, param));
  }, [param, tabs]);

  useEffect(() => {
    const onPopState = () => setTabState(readTab(tabs, param));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [param, tabs]);

  const setTab = useCallback(
    (next: T) => {
      setTabState(next);

      const params = new URLSearchParams(window.location.search);
      if (next === tabs[0]) params.delete(param);
      else params.set(param, next);

      const query = params.toString();
      window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
    },
    [param, tabs],
  );

  return { tab, setTab };
}
