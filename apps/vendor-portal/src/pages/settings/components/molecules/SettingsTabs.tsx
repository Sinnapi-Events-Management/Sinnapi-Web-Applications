import { alpha, Box, Tab, Tabs, Typography, useMediaQuery, useTheme } from '@sinnapi/ui';
import { panelId, tabId, type SettingsTab, type SettingsTabMeta } from '../../schema';

type Props = {
  items: readonly { value: SettingsTab; meta: SettingsTabMeta }[];
  value: SettingsTab;
  onChange: (next: SettingsTab) => void;
};

/**
 * The settings section switcher: a vertical rail from `md` up, a scrollable strip
 * below it.
 *
 * Vertical is the orientation the content asks for. There are only three sections,
 * so a horizontal bar would fit — but a horizontal bar sits *above* the panel and
 * leaves the width beside it empty, which is the problem this page had in the
 * first place. Turning the switcher on its side spends that width on navigation
 * and gives each label room for a line of explanation, so the sections can be
 * chosen by what they do rather than by a one-word noun.
 *
 * It collapses to a horizontal scroller under `md`, where a vertical rail would
 * eat a phone's whole first screen before any setting appeared.
 *
 * Values are the section *names*, not indices — that is what lets them go into the
 * URL through `useUrlTab`, and it means inserting a section later cannot silently
 * re-point an existing link.
 */
export default function SettingsTabs({ items, value, onChange }: Props) {
  const theme = useTheme();
  const vertical = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <Box
      sx={{
        borderBottom: { xs: 1, md: 0 },
        borderColor: 'divider',
        mb: { xs: 1, md: 0 },
      }}
    >
      <Tabs
        orientation={vertical ? 'vertical' : 'horizontal'}
        value={value}
        onChange={(_, next: SettingsTab) => onChange(next)}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label="Settings sections"
        TabIndicatorProps={{ sx: { display: { md: 'none' } } }}
        sx={{ '& .MuiTabs-flexContainer': { gap: { md: 0.5 } } }}
      >
        {items.map(({ value: v, meta }) => {
          const Icon = meta.icon;
          const selected = v === value;
          return (
            <Tab
              key={v}
              value={v}
              id={tabId(v)}
              aria-controls={panelId(v)}
              iconPosition="start"
              icon={<Icon fontSize="small" />}
              label={
                <Box sx={{ textAlign: 'left', minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={selected ? 700 : 500} noWrap>
                    {meta.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{ display: { xs: 'none', md: 'block' }, textTransform: 'none' }}
                  >
                    {meta.hint}
                  </Typography>
                </Box>
              }
              sx={{
                minHeight: 56,
                alignItems: 'center',
                justifyContent: 'flex-start',
                textAlign: 'left',
                borderRadius: { md: 2 },
                px: { md: 1.5 },
                // The indicator is hidden on desktop (above) because a filled row
                // reads better against a card-shaped rail than a hairline does.
                '&.Mui-selected': {
                  bgcolor: { md: alpha(theme.palette.secondary.main, 0.12) },
                  color: 'text.primary',
                },
                '&:hover': { bgcolor: { md: alpha(theme.palette.secondary.main, 0.06) } },
              }}
            />
          );
        })}
      </Tabs>
    </Box>
  );
}
