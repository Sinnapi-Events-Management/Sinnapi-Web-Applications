import { AccountFactsCard, type AccountFact } from '@sinnapi/ui/profile';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import CalendarIcon from '@mui/icons-material/CalendarMonthOutlined';
import LinkIcon from '@mui/icons-material/LinkOutlined';
import StoreIcon from '@mui/icons-material/StorefrontOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import { formatDate, titleize } from '@/lib/config';
import type { VendorProfileEditModel } from '@/lib/types';

type Props = {
  vendor: VendorProfileEditModel;
};

/**
 * Read-only facts about the listing.
 *
 * None of these are the vendor's to change and the card says so rather than
 * offering disabled inputs: status and visibility are set by the admin review
 * flow, and the slug is what every existing link to this vendor is built from, so
 * letting it be edited would break URLs already in the wild.
 */
export default function ListingFactsCard({ vendor }: Props) {
  const facts: AccountFact[] = [
    {
      key: 'status',
      label: 'Listing status',
      icon: <StoreIcon />,
      value: titleize(vendor.status),
    },
    {
      key: 'visibility',
      label: 'Visibility',
      icon: <VisibilityIcon />,
      value: titleize(vendor.visibility),
    },
    {
      key: 'slug',
      label: 'Public link',
      icon: <LinkIcon />,
      value: `/vendors/${vendor.slug}`,
      copyValue: `/vendors/${vendor.slug}`,
      mono: true,
    },
    {
      key: 'created',
      label: 'Listed since',
      icon: <CalendarIcon />,
      value: vendor.created_at ? formatDate(vendor.created_at) : undefined,
    },
    {
      key: 'id',
      label: 'Vendor ID',
      icon: <BadgeIcon />,
      value: vendor.id,
      copyValue: vendor.id,
      mono: true,
    },
  ];

  return (
    <AccountFactsCard
      facts={facts}
      title="Listing"
      icon={<StoreIcon />}
      note="Status and visibility are set by our review team. Contact support if either looks wrong."
    />
  );
}
