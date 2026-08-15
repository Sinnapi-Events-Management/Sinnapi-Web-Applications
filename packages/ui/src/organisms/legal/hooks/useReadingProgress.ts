'use client';
import { useEffect, useState } from 'react';

/**
 * How far down the page the reader is, 0–100.
 *
 * Drives the hairline under the header. On a document that runs to forty
 * numbered clauses, the single most useful thing the chrome can say is "you are
 * a third of the way through" — a scrollbar says it too, but browsers hide
 * those until you move.
 *
 * Reads are throttled to one per animation frame: `scroll` fires far faster
 * than the screen refreshes, and `documentElement.scrollHeight` forces layout.
 */
export function useReadingProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const el = document.documentElement;
      const scrollable = el.scrollHeight - el.clientHeight;
      setProgress(scrollable <= 0 ? 0 : Math.min(100, (el.scrollTop / scrollable) * 100));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return progress;
}
