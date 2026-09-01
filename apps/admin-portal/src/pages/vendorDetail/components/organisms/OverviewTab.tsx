import { Grid, Stack, Typography, Link, InfoCard } from '@sinnapi/ui';
import { formatDate, formatMoney, titleize } from '@/lib/config';
import type { NamedRef, OwnerRef, VendorDetailModel } from '@/lib/types';
import InfoField from '../atoms/InfoField';
import CoverageCard from '../molecules/CoverageCard';

type Props = {
  vendor: VendorDetailModel;
  owner: OwnerRef | null;
  category: NamedRef | null;
};

/** Vendor profile: biography, business facts and the owner's contact. */
export default function OverviewTab({ vendor: v, owner, category }: Props) {
  const price =
    v.starting_price != null ? formatMoney(v.starting_price, v.starting_price_currency) : '—';

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={7}>
        <Stack spacing={3}>
          <InfoCard title="About">
            <Typography variant="body2" color={v.biography ? 'text.primary' : 'text.secondary'}>
              {v.biography || 'No biography provided.'}
            </Typography>
          </InfoCard>

          <InfoCard title="Business details">
            <Grid container spacing={2.5}>
              <Grid item xs={6}>
                <InfoField label="Category">{category?.name ?? '—'}</InfoField>
              </Grid>
              <Grid item xs={6}>
                <InfoField label="Base city">{v.base_city ?? '—'}</InfoField>
              </Grid>
              <Grid item xs={6}>
                <InfoField label="Pricing model">
                  {v.pricing_model ? titleize(v.pricing_model) : '—'}
                </InfoField>
              </Grid>
              <Grid item xs={6}>
                <InfoField label="Starting price">{price}</InfoField>
              </Grid>
              <Grid item xs={6}>
                <InfoField label="Years in operation">
                  {v.years_in_operation ? titleize(v.years_in_operation) : '—'}
                </InfoField>
              </Grid>
              <Grid item xs={6}>
                <InfoField label="Member since">{formatDate(v.created_at)}</InfoField>
              </Grid>
              <Grid item xs={12}>
                <InfoField label="Website">
                  {v.website ? (
                    <Link href={v.website} target="_blank" rel="noopener">
                      {v.website}
                    </Link>
                  ) : (
                    '—'
                  )}
                </InfoField>
              </Grid>
            </Grid>
          </InfoCard>
        </Stack>
      </Grid>

      <Grid item xs={12} md={5}>
        <Stack spacing={3}>
          <CoverageCard vendorId={v.id} />

          <InfoCard title="Owner">
            <Stack spacing={2.5}>
              <InfoField label="Name">{owner?.full_name ?? '—'}</InfoField>
              <InfoField label="Email">
                {owner?.email ? <Link href={`mailto:${owner.email}`}>{owner.email}</Link> : '—'}
              </InfoField>
              <InfoField label="Phone">
                {owner?.phone ? <Link href={`tel:${owner.phone}`}>{owner.phone}</Link> : '—'}
              </InfoField>
              <InfoField label="Slug">{v.slug}</InfoField>
            </Stack>
          </InfoCard>
        </Stack>
      </Grid>
    </Grid>
  );
}
