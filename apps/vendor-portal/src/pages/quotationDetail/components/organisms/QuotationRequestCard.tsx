import { SectionCard, Typography } from '@sinnapi/ui';
import ForumIcon from '@mui/icons-material/Forum';

type Props = { requestDetails: string };

/**
 * What the client actually asked for, in their own words.
 *
 * Kept above the builder rather than beside it: it is the brief, and a vendor
 * pricing a job should have read it before the first line item — not be
 * scrolling back to it halfway down the form.
 */
export default function QuotationRequestCard({ requestDetails }: Props) {
  return (
    <SectionCard title="Client request" icon={<ForumIcon />} accent="primary">
      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{requestDetails}</Typography>
    </SectionCard>
  );
}
