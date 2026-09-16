'use client';
import { Box, Paper, Stack, Tab, Tabs, useMediaQuery } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { SectionStateDot } from '../atoms/SectionStateDot';
import { PROFILE_MOBILE_STICKY_TOP, PROFILE_STICKY_TOP } from '../schema/layout';
import type { ProfileSectionItem } from '../types';

export type ProfileSectionNavProps<T extends string> = {
  items: readonly ProfileSectionItem<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
  /** Prefix for the tab/panel ids, so two navs on one page never collide. */
  idPrefix: string;
};

/** The ids a section's tab and its panel reference each other by. */
export function profileSectionIds(idPrefix: string, value: string) {
  return { tab: `${idPrefix}-tab-${value}`, panel: `${idPrefix}-panel-${value}` };
}

/**
 * The section menu for a profile workspace: one panel shows at a time, so the
 * page is as long as its current section rather than all of them.
 *
 * A vertical list from `md` up, where there is a column to spare, and a
 * horizontally scrolling strip below it, pinned under the app bar so switching
 * section never means scrolling back to the top. Both are the same MUI `Tabs`,
 * which keeps arrow-key navigation and the tab/tabpanel semantics identical
 * whichever way it is drawn.
 */
export function ProfileSectionNav<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  idPrefix,
}: ProfileSectionNavProps<T>) {
  const theme = useTheme();
  // `noSsr` reads the query on the first render, so a desktop doesn't flash the
  // horizontal strip first. The profile kit only runs in the SPA portals.
  const vertical = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });

  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'sticky',
        top: { ...PROFILE_MOBILE_STICKY_TOP, md: PROFILE_STICKY_TOP },
        zIndex: { xs: 2, md: 'auto' },
        borderRadius: { xs: 2, md: 3 },
        p: { xs: 0.5, md: 1 },
        bgcolor: (t) => alpha(t.palette.background.paper, 0.94),
        backdropFilter: 'blur(10px)',
      }}
    >
      <Tabs
        value={value}
        onChange={(_, next: T) => onChange(next)}
        orientation={vertical ? 'vertical' : 'horizontal'}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label={ariaLabel}
        TabIndicatorProps={{ sx: { display: 'none' } }}
        sx={{ minHeight: 40 }}
      >
        {items.map((item) => {
          const ids = profileSectionIds(idPrefix, item.value);
          return (
            <Tab
              key={item.value}
              value={item.value}
              id={ids.tab}
              aria-controls={ids.panel}
              icon={item.icon}
              iconPosition="start"
              label={
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                  <Box component="span">{item.label}</Box>
                  {item.state && <SectionStateDot state={item.state} />}
                </Stack>
              }
              sx={{
                minHeight: 40,
                px: 1.5,
                py: 1,
                mx: { xs: 0.25, md: 0 },
                my: { md: 0.25 },
                borderRadius: 2,
                justifyContent: { md: 'flex-start' },
                textAlign: 'left',
                textTransform: 'none',
                color: 'text.secondary',
                '& .MuiTab-iconWrapper': { fontSize: 20, mr: 1.25 },
                '&:hover': { bgcolor: 'action.hover' },
                '&.Mui-selected': {
                  color: 'primary.main',
                  fontWeight: 600,
                  bgcolor: (t) =>
                    alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.2 : 0.1),
                },
              }}
            />
          );
        })}
      </Tabs>
    </Paper>
  );
}
