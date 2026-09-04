import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, InfoRow, Link, SectionCard, Stack, StatusChip } from '@sinnapi/ui';
import StorefrontIcon from '@mui/icons-material/Storefront';
import type { SubscriptionAdminDetailModel } from '@/lib/types';

type Props = { subscription: SubscriptionAdminDetailModel };

/**
 * The vendor this subscription keeps listed, and the person who pays for it.
 *
 * The owner's email is a `mailto:` link because reaching out is the most
 * common next step on a lapsed subscription. Hiding or unhiding the vendor is
 * done on the vendor's own page, which the button leads to — this page reads
 * a subscription and cannot change one.
 */
export default function SubscriptionVendorCard({ subscription: s }: Props) {
  const owner = s.vendor.owner;

  return (
    <SectionCard title="Vendor" icon={<StorefrontIcon />} accent="info">
      <Stack spacing={2}>
        <div>
          <InfoRow
            label="Business"
            value={
              <Link
                component={RouterLink}
                to={`/vendors/${s.vendor.id}`}
                underline="hover"
                color="inherit"
              >
                {s.vendor.business_name ?? '—'}
              </Link>
            }
          />
          <InfoRow label="Account" value={<StatusChip status={s.vendor.status} />} />
          <InfoRow label="Listing" value={<StatusChip status={s.vendor.visibility} />} />
        </div>

        <div>
          <InfoRow label="Owner" value={owner.name} />
          <InfoRow
            label="Email"
            value={
              owner.email ? (
                <Link href={`mailto:${owner.email}`} underline="hover">
                  {owner.email}
                </Link>
              ) : null
            }
            copyValue={owner.email ?? undefined}
          />
        </div>

        <Box>
          <Button component={RouterLink} to={`/vendors/${s.vendor.id}`} variant="outlined">
            Open vendor
          </Button>
        </Box>
      </Stack>
    </SectionCard>
  );
}
