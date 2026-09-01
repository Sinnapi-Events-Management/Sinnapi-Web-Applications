import { Box, Typography } from '@mui/material';
import OpenIcon from '@mui/icons-material/OpenInNewOutlined';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import { Alert, Button, SectionCard } from '@sinnapi/ui';
import { Link as RouterLink } from 'react-router-dom';
import type { PublicIdLookupModel } from '@/lib/publicIdLookup';
import PublicIdText from '../atoms/PublicIdText';
import EntityChip from '../atoms/EntityChip';
import LookupResultRow from '../molecules/LookupResultRow';

type Props = {
  result: PublicIdLookupModel;
};

/**
 * What an identifier turned out to be.
 *
 * There are four outcomes and each gets its own words, because "not found" as a
 * catch-all is the answer that sends an agent looking for a typo that is not
 * there:
 *
 *   1. NOT AN ID WE EVER ISSUED — `found: false`. Almost always a
 *      mistranscription, so the copy says to check the digits rather than
 *      asserting the record does not exist.
 *   2. ISSUED, RECORD DELETED — `found` with no `row_id`. The registry keeps
 *      identifiers after their rows go, so this is a real and useful answer.
 *   3. RESOLVED, WITH A PAGE — the ordinary case, and the button is the point
 *      of the whole page.
 *   4. RESOLVED, NO PAGE — promotions have no admin screen. The record is named
 *      and no button is offered, rather than a button that would 404.
 *
 * A legacy match is called out whenever it happens: the agent should know the
 * caller is reading from an old document, because it tells them the record
 * predates the current reference format and that the caller's paperwork will
 * not match what the portal shows.
 */
export default function LookupResultCard({ result }: Props) {
  if (!result.found) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        <Typography variant="body2">
          No record has ever been issued the ID <PublicIdText value={result.public_id} />. Check the
          digits with the caller — <strong>I</strong>, <strong>L</strong>, <strong>O</strong> and{' '}
          <strong>U</strong> are never used, so an <strong>O</strong> is a zero and an{' '}
          <strong>I</strong> is a one.
        </Typography>
      </Alert>
    );
  }

  const isDeleted = !result.row_id;

  return (
    <SectionCard
      title="Match"
      icon={<BadgeIcon />}
      accent={isDeleted ? 'warning' : 'primary'}
      action={
        result.route ? (
          <Button
            component={RouterLink}
            to={result.route}
            size="small"
            variant="contained"
            endIcon={<OpenIcon />}
            sx={{ flexShrink: 0 }}
          >
            Open
          </Button>
        ) : undefined
      }
    >
      <Box sx={{ mb: 1 }}>
        <PublicIdText value={result.public_id} size="lg" />
      </Box>

      <LookupResultRow label="Type">
        <EntityChip publicId={result.public_id} />
      </LookupResultRow>

      <LookupResultRow label="Record">
        <Typography variant="body2">{result.label}</Typography>
      </LookupResultRow>

      {result.matched_on === 'legacy' && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Matched an older reference format. The caller is reading from a document issued before the
          record was renumbered, so the ID they have will not match the one shown in the portal.
        </Alert>
      )}

      {isDeleted && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          This ID was issued, but the record it named has since been deleted. IDs are never reused,
          so nothing else will ever carry it.
        </Alert>
      )}

      {!isDeleted && !result.route && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          This record type has no admin page yet, so there is nowhere to open it.
        </Typography>
      )}
    </SectionCard>
  );
}
