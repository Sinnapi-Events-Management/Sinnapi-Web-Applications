import { Box, Stack } from '@sinnapi/ui';
import type { AudienceApi } from '../../hooks/useCampaignAudience';
import { useRecipientSources } from '../../hooks/useRecipientSources';
import RecipientSourceTabs from '../molecules/RecipientSourceTabs';
import RecipientTotalBar from '../molecules/RecipientTotalBar';
import AttestationNotice from '../molecules/AttestationNotice';
import AudienceSourcePanel from './AudienceSourcePanel';

type Props = { api: AudienceApi; audienceLabel: string; disabled?: boolean };

/** Clears the portal's fixed top bar; below that the strip pins itself. */
const TOP_BAR = { xs: 56, md: 64 };

/**
 * Who this campaign goes to.
 *
 * ── The screen is a strip and one panel ───────────────────────────────────
 * Before, the four sources were four blocks stacked down a page about two
 * thousand pixels long, so the spreadsheet importer and the address book were
 * below the fold of a table that could itself be paged forever. An operator
 * whose audience had nobody opted in — the ordinary state of a new consent
 * regime — saw an empty table and no visible way forward, when three of them
 * were sitting underneath.
 *
 * Now the four are a strip of cards at the top, each showing what it is
 * currently contributing, and only the chosen one takes any height. The strip
 * pins itself under the top bar on a wide screen: the counts are worth watching
 * precisely while a long table is being paged through, which is the only moment
 * they change.
 *
 * ── The attestation is deliberately outside the panel ─────────────────────
 * It covers every non-account recipient at once, so it belongs to the step
 * rather than to the source that happened to add the last one. Kept in the
 * panel it would vanish the moment the operator looked at the account table,
 * leaving a send blocked by a checkbox on a screen that was not showing it.
 */
export default function AudienceStep({ api, audienceLabel, disabled }: Props) {
  const sources = useRecipientSources(api);
  const extras = api.extras;
  const blocked = extras.needsAttestation && !extras.attested;

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          position: { lg: 'sticky' },
          top: TOP_BAR,
          zIndex: 2,
          // Sticky over scrolling content has to be opaque, and the page canvas
          // is what it is covering.
          bgcolor: 'background.default',
          py: { lg: 1.5 },
        }}
      >
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems="stretch">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <RecipientSourceTabs
              tabs={sources.tabs}
              value={sources.source}
              onChange={sources.setSource}
            />
          </Box>
          <RecipientTotalBar total={sources.total} blocked={blocked} />
        </Stack>
      </Box>

      <AudienceSourcePanel
        source={sources.source}
        api={api}
        audienceLabel={audienceLabel}
        disabled={disabled}
      />

      {extras.needsAttestation && (
        <AttestationNotice
          count={extras.extraCount}
          attested={extras.attested}
          disabled={disabled}
          onChange={extras.setAttested}
        />
      )}
    </Stack>
  );
}
