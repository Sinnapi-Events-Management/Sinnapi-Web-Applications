import { Stack } from '@sinnapi/ui';
import { AUDIENCE_META } from '@/pages/newsletters/schema';
import type { CampaignApi } from '../../hooks/useNewsletterCampaign';
import CampaignDetailsForm from './CampaignDetailsForm';
import CampaignComposer from './CampaignComposer';
import AudienceStep from './AudienceStep';
import CampaignReview from './CampaignReview';

type Props = {
  api: CampaignApi;
  /** Past `draft` the campaign is a record, so every step reads rather than writes. */
  locked: boolean;
  /** The signed-in operator's address, offered as the default test recipient. */
  myEmail?: string;
};

/**
 * The body under the tabs: whichever of the three steps is open.
 *
 * The switch lives here rather than in the page so the page stays a list of
 * regions — header, banners, tabs, body, dialogs — and so adding a fourth step
 * is one edit in one file. It takes the whole `api` for the same reason
 * `AudienceStep` does: these are steps of one flow, and threading forty props
 * through a shell that reads none of them buys nothing.
 */
export default function CampaignStepPanel({ api, locked, myEmail }: Props) {
  const { campaign, step, audience } = api;
  if (!campaign) return null;

  if (step === 'compose') {
    return (
      <Stack spacing={3}>
        <CampaignDetailsForm details={api.details} disabled={locked} onChange={api.setDetail} />
        <CampaignComposer blocks={api.blocks} disabled={locked} />
      </Stack>
    );
  }

  if (step === 'audience') {
    return (
      <AudienceStep
        api={audience}
        audienceLabel={AUDIENCE_META[campaign.audience].label}
        disabled={locked}
      />
    );
  }

  return (
    <CampaignReview
      issues={api.issues}
      audienceCount={audience.totalSelected}
      canQueue={audience.canQueue && !locked}
      needsAttestation={audience.needsAttestation}
      attested={audience.attested}
      queueResult={api.queueResult}
      busy={api.busy}
      myEmail={myEmail}
      onQueue={() => void api.queueRecipients()}
      onSendTest={(email) => void api.sendTest(email)}
      onSendNow={() => void api.sendNow()}
    />
  );
}
