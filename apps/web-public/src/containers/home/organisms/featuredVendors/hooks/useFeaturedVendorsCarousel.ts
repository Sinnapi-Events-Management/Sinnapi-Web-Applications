'use client';
import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaCarouselType } from 'embla-carousel';

/**
 * Drives the featured-vendors rail: a responsive, page-at-a-time carousel whose
 * slide widths are set in CSS, not here.
 *
 * Deliberately different from the clients marquee ([useClientsCarousel]): these
 * slides are interactive links, so there is no autoplay to yank a card out from
 * under a click, and no `loop` — a visitor should be able to tell they've reached
 * the end of the paid placements rather than cycling forever. `slidesToScroll:
 * 'auto'` advances by a full visible page, so the snap count matches the number
 * of pages and the dots stay meaningful at every breakpoint.
 *
 * Everything embla reports is mirrored into React state on `select`/`reInit`
 * (reInit fires on resize, which is what keeps the dots correct across
 * breakpoints) so the rail components stay purely declarative.
 */
export function useFeaturedVendorsCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    slidesToScroll: 'auto',
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  const sync = useCallback((api: EmblaCarouselType) => {
    setSelectedIndex(api.selectedScrollSnap());
    setPageCount(api.scrollSnapList().length);
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    sync(emblaApi);
    emblaApi.on('select', sync).on('reInit', sync);
    return () => {
      emblaApi.off('select', sync).off('reInit', sync);
    };
  }, [emblaApi, sync]);

  return {
    emblaRef,
    selectedIndex,
    pageCount,
    canScrollPrev,
    canScrollNext,
    scrollPrev,
    scrollNext,
    scrollTo,
  };
}
