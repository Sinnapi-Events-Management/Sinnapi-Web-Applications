import type { ReactNode } from 'react';
import { Grid, Paper } from '@sinnapi/ui';
import { Payments, RequestQuote, Schedule, WorkspacePremium } from '@sinnapi/ui/icons';
import { formatMoney } from '@/lib/config/site';
import type { VendorDetailModel } from '@/lib/types';
import DetailRow from './molecules/DetailRow';
import { pricingModelLabel, leadTimeLabel, yearsLabel } from '../../utils/vendorMeta';

type Highlight = { icon: ReactNode; label: string; value: string };

/**
 * Bento-style "at a glance" strip directly under the hero. Surfaces the vendor's
 * key facts (starting price, pricing model, lead time, experience) as equal
 * rounded tiles across the full width, so the page leads with scannable data.
 * Tiles render only for facts that exist, and the row keeps its rhythm regardless.
 */
export default function VendorDetailHighlights({ vendor }: { vendor: VendorDetailModel }) {
  const price = formatMoney(vendor.starting_price, vendor.starting_price_currency);
  const pricing = pricingModelLabel(vendor.pricing_model);
  const lead = leadTimeLabel(vendor.lead_time);
  const years = yearsLabel(vendor.years_in_operation);

  const highlights: Highlight[] = [
    price && { icon: <Payments fontSize="small" />, label: 'Starting from', value: price },
    pricing && { icon: <RequestQuote fontSize="small" />, label: 'Pricing', value: pricing },
    lead && { icon: <Schedule fontSize="small" />, label: 'Lead time', value: lead },
    years && { icon: <WorkspacePremium fontSize="small" />, label: 'Experience', value: years },
  ].filter(Boolean) as Highlight[];

  if (highlights.length === 0) return null;

  return (
    <Grid container spacing={2}>
      {highlights.map((highlight) => (
        <Grid item xs={12} sm={6} md={3} key={highlight.label}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              height: '100%',
              borderRadius: 3,
              transition: 'box-shadow .2s ease, border-color .2s ease, transform .2s ease',
              '&:hover': {
                boxShadow: 3,
                borderColor: 'primary.main',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <DetailRow icon={highlight.icon} label={highlight.label} value={highlight.value} />
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
