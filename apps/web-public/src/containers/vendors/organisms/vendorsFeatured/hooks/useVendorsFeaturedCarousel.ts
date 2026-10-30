'use client';
import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import type { EmblaCarouselType } from 'embla-carousel';

/**
 * Drives the vendors-page featured rail: an infinite, auto-advancing carousel
 * that steps one page at a time and holds still while the visitor is engaging.
 *
 * Autoplay pauses on hover and keyboard focus (so a card can't slide out from
 * under a click or a tab stop) and resumes on leave. `stopOnInteraction: false`
 * keeps it running after a manual arrow/dot/drag once the pointer moves away.
 * It is omitted entirely for `prefers-reduced-motion`, leaving manual controls.
 * The plugin array is resolved once; a new identity would make embla reinitialise.
 */
export function useVendorsFeaturedCarousel() {
  const [plugins] = useState(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return prefersReducedMotion
      ? []
      : [
          Autoplay({
            delay: 3500,
            stopOnMouseEnter: true,
            stopOnFocusIn: true,
            stopOnInteraction: false,
          }),
        ];
  });

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start', slidesToScroll: 'auto' },
    plugins,
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  const sync = useCallback((api: EmblaCarouselType) => {
    setSelectedIndex(api.selectedScrollSnap());
    setPageCount(api.scrollSnapList().length);
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    sync(emblaApi);
    emblaApi.on('select', sync).on('reInit', sync);
    return () => {
      emblaApi.off('select', sync).off('reInit', sync);
    };
  }, [emblaApi, sync]);

  return { emblaRef, selectedIndex, pageCount, scrollPrev, scrollNext, scrollTo };
}
