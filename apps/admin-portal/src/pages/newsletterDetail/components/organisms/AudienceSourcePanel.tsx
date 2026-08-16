import { SectionCard, Stack } from '@sinnapi/ui';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import type { AudienceApi } from '../../hooks/useCampaignAudience';
import type { RecipientSource } from '../../schema';
import AudienceCounts from './AudienceCounts';
import AudiencePicker from './AudiencePicker';
import AudienceExtras from './AudienceExtras';

type Props = {
  source: RecipientSource;
  api: AudienceApi;
  audienceLabel: string;
  disabled?: boolean;
};

/**
 * The chosen source, and nothing else.
 *
 * One `switch` in one place is the whole cost of showing a single source at a
 * time; it lives here rather than in `AudienceStep` so the step stays a
 * description of the screen's furniture — strip, panel, attestation — and this
 * file stays the one place a fifth source would be added.
 *
 * The account reach tiles are part of the accounts panel, not the step: they
 * describe consent among account holders and say nothing at all about a
 * spreadsheet, so showing them above an importer would invite the wrong sum.
 */
export default function AudienceSourcePanel({ source, api, audienceLabel, disabled }: Props) {
  if (source === 'accounts') {
    return (
      <Stack spacing={2}>
        <AudienceCounts
          counts={api.counts}
          loading={api.countsLoading}
          audienceLabel={audienceLabel}
        />
        <SectionCard
          title="Sinnapi accounts"
          icon={<GroupsOutlinedIcon />}
          subtitle="Account holders who opted in to this topic."
        >
          <AudiencePicker api={api} disabled={disabled} />
        </SectionCard>
      </Stack>
    );
  }

  return <AudienceExtras api={api} source={source} disabled={disabled} />;
}
