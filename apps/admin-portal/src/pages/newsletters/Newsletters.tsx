import { useState } from 'react';
import { Alert, Button, PageTitle, Stack } from '@sinnapi/ui';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import { useNavigate } from 'react-router-dom';
import StatusTabs from '@/components/ui/StatusTabs';
import { useNewsletters } from './hooks/useNewsletters';
import NewslettersSummary from './components/organisms/NewslettersSummary';
import NewslettersToolbar from './components/organisms/NewslettersToolbar';
import NewslettersTable from './components/organisms/NewslettersTable';
import CreateCampaignDialog from './components/organisms/CreateCampaignDialog';

export default function Newsletters() {
  const navigate = useNavigate();
  const [creatingOpen, setCreatingOpen] = useState(false);
  const {
    rows,
    total,
    counts,
    countsLoading,
    isLoading,
    isFetching,
    pageError,
    emptyMessage,
    tabs,
    statusTab,
    onStatusChange,
    audienceValue,
    onAudienceChange,
    search,
    table,
    create,
    creating,
    openCampaign,
  } = useNewsletters();

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ sm: 'flex-start' }}
        justifyContent="space-between"
      >
        <PageTitle
          title="Newsletters"
          subtitle="Compose and send marketing email to clients and vendors, independently."
        />
        {/* The consent register is one click from here on purpose: the number
            of people you can legally reach is the first thing that shapes a
            campaign, and it should never be a page somebody has to go looking
            for after writing one. */}
        <Button
          variant="outlined"
          startIcon={<PeopleOutlineIcon />}
          onClick={() => navigate('/newsletters/subscribers')}
        >
          Subscribers
        </Button>
      </Stack>

      <NewslettersSummary counts={counts} loading={countsLoading} />

      <StatusTabs
        options={tabs}
        value={statusTab}
        onChange={onStatusChange}
        loadingCounts={countsLoading}
        ariaLabel="Filter campaigns by status"
      />

      <NewslettersToolbar
        search={search}
        audienceValue={audienceValue}
        onAudienceChange={onAudienceChange}
        onCreate={() => setCreatingOpen(true)}
      />

      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}

      <NewslettersTable
        rows={rows}
        total={total}
        loading={isLoading || isFetching}
        emptyMessage={emptyMessage}
        controls={table.controls}
        onOpen={openCampaign}
      />

      <CreateCampaignDialog
        open={creatingOpen}
        saving={creating}
        onCancel={() => setCreatingOpen(false)}
        onCreate={(next) => {
          setCreatingOpen(false);
          void create(next);
        }}
      />
    </>
  );
}
