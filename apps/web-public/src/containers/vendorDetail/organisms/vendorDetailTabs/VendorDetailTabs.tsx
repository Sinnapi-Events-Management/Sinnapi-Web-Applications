'use client';
import type { ReactNode } from 'react';
import { Box } from '@sinnapi/ui/atoms';
import { DetailTabs, DetailTabPanel, type DetailTabItem } from '@sinnapi/ui/molecules';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import { useUrlTab } from '@/hooks/useUrlTab';
import { useStickyHeaderOffset } from '@/hooks/useStickyHeaderOffset';
import { VENDOR_DETAIL_TABS, type VendorDetailTab } from '../../utils/tabs';

/**
 * Labels and icons, keyed by the tab union rather than written out as an array,
 * so adding a section to `VENDOR_DETAIL_TABS` without labelling it here is a
 * type error rather than a tab that renders blank.
 */
const TAB_META: Record<VendorDetailTab, Omit<DetailTabItem<VendorDetailTab>, 'value'>> = {
  gallery: { label: 'Gallery', icon: <PhotoLibraryOutlinedIcon fontSize="small" /> },
  overview: { label: 'Overview', icon: <StorefrontOutlinedIcon fontSize="small" /> },
  packages: { label: 'Packages', icon: <LocalOfferOutlinedIcon fontSize="small" /> },
  reviews: { label: 'Reviews', icon: <StarOutlineIcon fontSize="small" /> },
};

const ITEMS = VENDOR_DETAIL_TABS.map((value) => ({ value, ...TAB_META[value] }));

/**
 * Each tab section's content, passed as a slot rather than as `children`.
 *
 * Named props, because this is the boundary between a server component and a
 * client one: the sections above are server-rendered and arrive here as already
 * -rendered nodes, which is what keeps their markup in the static HTML while
 * only the switcher hydrates. A single `children` would work too, but naming
 * the slots means a section can never be handed to the wrong panel.
 */
type Props = Record<VendorDetailTab, ReactNode>;

/**
 * The public profile's section switcher — now including the photo gallery,
 * which used to sit above it.
 *
 * Panels stay mounted and inactive ones are hidden, which is the opposite of
 * what the portals do — see `keepMounted` on `DetailTabPanel`. Keeping them in
 * the static HTML lets search engines read the vendor's biography, packages and
 * reviews. The gallery joining them costs nothing on that front: it was already
 * rendered unconditionally when it lived above the switcher, and its tiles
 * past the first row stay lazy either way.
 *
 * The bar pins itself under the site navbar, at whatever height the navbar
 * actually is: the header is a two-tier bar whose utility strip changes at `lg`,
 * so the offset is measured rather than assumed. That matters more now than it
 * did — with the gallery inside a panel the bar is what a visitor scrolls past
 * twenty photos *with*, rather than what they scroll twenty photos to reach.
 */
export default function VendorDetailTabs({ gallery, overview, packages, reviews }: Props) {
  const { tab, setTab } = useUrlTab(VENDOR_DETAIL_TABS);
  const headerOffset = useStickyHeaderOffset();

  const panels: Props = { gallery, overview, packages, reviews };

  return (
    <Box>
      <DetailTabs
        items={ITEMS}
        value={tab}
        onChange={setTab}
        idPrefix="vendor"
        ariaLabel="Vendor profile sections"
        sx={{ top: headerOffset }}
      />

      {VENDOR_DETAIL_TABS.map((value) => (
        <DetailTabPanel key={value} value={value} active={tab} idPrefix="vendor" keepMounted>
          {panels[value]}
        </DetailTabPanel>
      ))}
    </Box>
  );
}
