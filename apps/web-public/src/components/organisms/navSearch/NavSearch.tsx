'use client';
import { type Theme } from '@sinnapi/ui/theme';
import { type SxProps } from '@sinnapi/ui/system';
import { useNavSearch } from './hooks/useNavSearch';
import SearchTrigger from './molecules/SearchTrigger';
import SearchOverlay from './molecules/SearchOverlay';

type NavSearchProps = {
  /** When true, styles the pill for legibility over the dark hero overlay. */
  transparent?: boolean;
  /** Styling for the pill — lets callers control width/placement. */
  sx?: SxProps<Theme>;
};

/**
 * Site-wide discovery search: the navbar pill, and the palette it opens.
 *
 * Two surfaces, one state. The pill is what sits in the utility bar on every
 * public page; the palette is the centred card that takes over when the
 * visitor engages with it. `useNavSearch` owns everything they share — the
 * term, the suggestions, the highlighted row — so neither can disagree with
 * the other about what is being searched for.
 *
 * Replaces the old `navSearchForm`, which was a plain GET form: whatever you
 * typed went to /vendors and you learned whether it matched anything only
 * after a page load. The form is still there underneath (see `SearchTrigger`)
 * and still works with no JavaScript — the palette is layered on top of it,
 * not in place of it.
 */
export default function NavSearch({ transparent = false, sx }: NavSearchProps) {
  const search = useNavSearch();

  return (
    <>
      <SearchTrigger
        transparent={transparent}
        sx={sx}
        value={search.open ? '' : search.typed}
        onOpen={search.openWith}
      />
      <SearchOverlay search={search} />
    </>
  );
}
