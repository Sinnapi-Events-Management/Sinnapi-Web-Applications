import { useState } from 'react';
import { Box, Paper, Tabs, Tab } from '@sinnapi/ui';
import type { PlanDetailModel } from '@/lib/types';
import PlanOverviewTab from './PlanOverviewTab';
import PlanFeaturesCard from './PlanFeaturesCard';

type Props = { plan: PlanDetailModel };

/** Tabbed body for the plan record: positioning/details and the feature list. */
export default function PlanTabs({ plan }: Props) {
  const [tab, setTab] = useState(0);

  const panels = [
    { label: 'Overview', render: () => <PlanOverviewTab plan={plan} /> },
    { label: 'Features', render: () => <PlanFeaturesCard plan={plan} /> },
  ];

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, next) => setTab(next)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTabs-indicator': { bgcolor: 'secondary.main', height: 3, borderRadius: 1.5 },
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none' },
            '& .MuiTab-root.Mui-selected': { color: 'secondary.dark' },
          }}
        >
          {panels.map((p) => (
            <Tab key={p.label} label={p.label} />
          ))}
        </Tabs>
      </Box>
      {panels[tab].render()}
    </Paper>
  );
}
