import { Alert, Box, PageTitle, QueryState, StatusChip } from '@sinnapi/ui';
import { formatDate } from '@/lib/config';
import { useDashboard } from './hooks/useDashboard';
import QuickActions from './components/organisms/QuickActions';
import WaitingForYou from './components/organisms/WaitingForYou';
import NextJobCard from './components/organisms/NextJobCard';
import MoneyCard from './components/organisms/MoneyCard';
import ListingStrengthCard from './components/organisms/ListingStrengthCard';
import ApplicationStatusCard from './components/organisms/ApplicationStatusCard';

/**
 * The vendor's landing page. State, the vendor record and the single overview
 * read all live in `useDashboard`; layout, tabs and every panel live in the
 * workspace — so this stays a wiring point between the two, plus the one branch
 * that decides which of the two screens a caller gets.
 */
/**
 * The vendor's home, redesigned phone-first on 2026-11-17 (concept "A+C",
 * chosen by the user): quick actions with "Add photos & videos" always first,
 * then the people waiting for an answer (a WhatsApp-style list), the next
 * job, the money in three plain lines, and how complete the page is.
 */
export default function Dashboard() {
  const d = useDashboard();

  if (d.loading) {
    return (
      <QueryState isLoading error={null}>
        {null}
      </QueryState>
    );
  }

  if (!d.vendor) {
    return (
      <>
        <PageTitle
          title="Welcome to Sinnapi for Vendors"
          subtitle="Let's get your business listed."
        />
        <ApplicationStatusCard application={d.application.data} loading={d.application.isLoading} />
      </>
    );
  }

  return (
    <>
      <PageTitle
        title={d.title}
        subtitle={d.vendor.business_name}
        action={
          d.subscription && (
            <Box sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}>
              <StatusChip status={d.subscription.status} size="medium" />
            </Box>
          )
        }
      />

      {d.subscription?.status === 'trialing' && d.vendor.trial_ends_at && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Free trial active — ends {formatDate(d.vendor.trial_ends_at)}. Choose a plan before then
          to stay visible.
        </Alert>
      )}
      {d.overviewError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          Some of your numbers could not load. Pull down or refresh to try again.
        </Alert>
      ) : null}

      <QuickActions publicUrl={d.publicUrl} businessName={d.vendor.business_name} />

      <Box
        sx={{
          display: 'grid',
          gap: { md: 3 },
          gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' },
          alignItems: 'start',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <WaitingForYou
            items={d.waiting.items}
            total={d.waiting.total}
            isLoading={d.waiting.isLoading}
          />
          <NextJobCard
            next={d.upcoming[0]}
            more={Math.max(d.upcoming.length - 1, 0)}
            isLoading={d.overviewLoading}
          />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <MoneyCard earnings={d.earnings} owed={d.owed} isLoading={d.overviewLoading} />
          {!d.listingLoading && (
            <ListingStrengthCard percent={d.listingPercent} tip={d.listingTip} />
          )}
        </Box>
      </Box>
    </>
  );
}
