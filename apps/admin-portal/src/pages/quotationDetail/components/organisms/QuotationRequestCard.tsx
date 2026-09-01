import { SectionCard, Typography } from '@sinnapi/ui';
import ForumIcon from '@mui/icons-material/Forum';

type Props = { requestDetails: string };

/**
 * What the client asked for, in their own words.
 *
 * The brief is the only unstructured text on the page and is often the whole
 * answer to a dispute — what was asked for is what a quote is judged against.
 * Rendered verbatim with its line breaks intact rather than normalised into a
 * paragraph, because an operator quoting it back needs to be quoting what was
 * written.
 */
export default function QuotationRequestCard({ requestDetails }: Props) {
  return (
    <SectionCard title="Client request" icon={<ForumIcon />} accent="primary">
      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{requestDetails}</Typography>
    </SectionCard>
  );
}
