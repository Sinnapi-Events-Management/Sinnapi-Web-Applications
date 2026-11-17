import { useEffect, useRef, useState } from 'react';

/**
 * Watches an element (the in-card main button) and reports whether it is on
 * screen, so the sticky copy below shows only once the original has scrolled
 * away — never two identical buttons in view at once.
 */
export function useAnchorVisible<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [dep]);
  return { ref, visible };
}
