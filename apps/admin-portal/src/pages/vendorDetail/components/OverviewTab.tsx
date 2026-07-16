import { Grid, Stack, Typography, Link, InfoCard } from '@sinnapi/ui';
import { formatDate, formatMoney, titleize } from '@/lib/config';
import type { NamedRef, OwnerRef, VendorDetailModel } from '@/lib/types';

type Props = {
  vendor: VendorDetailModel;
  owner: OwnerRef | null;
  category: NamedRef | null;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{children ?? '—'}</Typography>
    </Stack>
  );
}

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
                <Field label="Category">{category?.name ?? '—'}</Field>
              </Grid>
              <Grid item xs={6}>
                <Field label="Base city">{v.base_city ?? '—'}</Field>
              </Grid>
              <Grid item xs={6}>
                <Field label="Pricing model">
                  {v.pricing_model ? titleize(v.pricing_model) : '—'}
                </Field>
              </Grid>
              <Grid item xs={6}>
                <Field label="Starting price">{price}</Field>
              </Grid>
              <Grid item xs={6}>
                <Field label="Years in operation">
                  {v.years_in_operation ? titleize(v.years_in_operation) : '—'}
                </Field>
              </Grid>
              <Grid item xs={6}>
                <Field label="Member since">{formatDate(v.created_at)}</Field>
              </Grid>
              <Grid item xs={12}>
                <Field label="Website">
                  {v.website ? (
                    <Link href={v.website} target="_blank" rel="noopener">
                      {v.website}
                    </Link>
                  ) : (
                    '—'
                  )}
                </Field>
              </Grid>
            </Grid>
          </InfoCard>
        </Stack>
      </Grid>

      <Grid item xs={12} md={5}>
        <InfoCard title="Owner">
          <Stack spacing={2.5}>
            <Field label="Name">{owner?.full_name ?? '—'}</Field>
            <Field label="Email">
              {owner?.email ? <Link href={`mailto:${owner.email}`}>{owner.email}</Link> : '—'}
            </Field>
            <Field label="Phone">
              {owner?.phone ? <Link href={`tel:${owner.phone}`}>{owner.phone}</Link> : '—'}
            </Field>
            <Field label="Slug">{v.slug}</Field>
          </Stack>
        </InfoCard>
      </Grid>
    </Grid>
  );
}
