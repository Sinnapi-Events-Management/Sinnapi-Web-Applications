import { DetailTabs, type DetailTabItem } from '@sinnapi/ui';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import LocalActivityOutlinedIcon from '@mui/icons-material/LocalActivityOutlined';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { VENDOR_DETAIL_TABS, type VendorDetailTab } from '../../schema';

type Props = {
  value: VendorDetailTab;
  onChange: (next: VendorDetailTab) => void;
  /** Quotes that need the client's answer or a booking. Zero shows no badge. */
  quotationsBadge?: number;
};

/**
 * This page's labels and icons for the shared detail-tab bar.
 *
 * Keyed by the tab union rather than written out as an array, so adding a
 * section to `VENDOR_DETAIL_TABS` without labelling it here is a type error
 * rather than a tab that renders blank.
 *
 * The same words the public profile uses for its own sections, so a visitor
 * who browsed signed-out and came back signed in does not have to relearn where
 * the prices live.
 */
const TAB_META: Record<VendorDetailTab, Omit<DetailTabItem<VendorDetailTab>, 'value'>> = {
  overview: { label: 'Overview', icon: <StorefrontOutlinedIcon fontSize="small" /> },
  quotations: { label: 'Quotations', icon: <ReceiptLongOutlinedIcon fontSize="small" /> },
  packages: { label: 'Packages', icon: <LocalOfferOutlinedIcon fontSize="small" /> },
  offers: { label: 'Offers', icon: <LocalActivityOutlinedIcon fontSize="small" /> },
  portfolio: { label: 'Portfolio', icon: <PhotoLibraryOutlinedIcon fontSize="small" /> },
  availability: { label: 'Availability', icon: <EventAvailableOutlinedIcon fontSize="small" /> },
  reviews: { label: 'Reviews', icon: <StarOutlineIcon fontSize="small" /> },
};

const ITEMS = VENDOR_DETAIL_TABS.map((value) => ({ value, ...TAB_META[value] }));

export default function VendorDetailTabs({ value, onChange, quotationsBadge }: Props) {
  // Only the quotations tab carries a live count. Built per render rather than
  // in the module constant, because the count arrives with the quotes.
  const items = ITEMS.map((item) =>
    item.value === 'quotations' ? { ...item, badge: quotationsBadge } : item,
  );

  return (
    <DetailTabs
      items={items}
      value={value}
      onChange={onChange}
      idPrefix="vendor"
      ariaLabel="Vendor profile sections"
    />
  );
}
