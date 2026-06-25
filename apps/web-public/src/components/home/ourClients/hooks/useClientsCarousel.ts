'use client';
import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import type { EmblaCarouselType } from 'embla-carousel';

/**
 * Drives the "Our clients" carousel: a looping, responsive multi-item slider
 * with manual prev/next controls plus gentle autoplay.
 *
 * Autoplay pauses on hover and is skipped entirely for users who prefer reduced
 * motion (the plugin set is fixed at init, mirroring the marquee's old
 * `prefers-reduced-motion` opt-out). With `loop` enabled prev/next never dead-end,
 * so the buttons stay perpetually actionable.
 */
export function useClientsCarousel() {
  // Resolve plugins once: embla reinitialises if this array identity changes.
  const [plugins] = useState(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return prefersReducedMotion
      ? []
      : [Autoplay({ delay: 3500, stopOnMouseEnter: true, stopOnInteraction: false })];
  });

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, plugins);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback((api: EmblaCarouselType) => {
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on('select', onSelect).on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect).off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  return { emblaRef, scrollPrev, scrollNext, selectedIndex };
}
