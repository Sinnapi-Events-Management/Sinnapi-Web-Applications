import type { ReactNode } from 'react';
import {
  Box,
  IconBadge,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@sinnapi/ui';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import type { RecipientSourceTab } from '../../hooks/useRecipientSources';
import type { RecipientSource } from '../../schema';

const ICONS: Record<RecipientSource, ReactNode> = {
  accounts: <GroupsOutlinedIcon />,
  manual: <PersonAddAlt1Icon />,
  import: <UploadFileIcon />,
  saved: <ContactMailIcon />,
};

type Props = {
  tabs: RecipientSourceTab[];
  value: RecipientSource;
  onChange: (next: RecipientSource) => void;
};

/**
 * The four ways into a recipient list, as one row of cards.
 *
 * ── Why cards rather than the plain tab strip above them ──────────────────
 * These sit directly under the composer's own tabs, and two identical strips
 * one above the other read as one confused navigation. More importantly a tab
 * label has nowhere to put a number, and the number is what makes choosing one
 * source safe: the operator can see that the address book is still contributing
 * forty people while they are looking at the spreadsheet.
 *
 * ── Why they are never disabled ───────────────────────────────────────────
 * A sent campaign is read-only, but reading is exactly what somebody does to a
 * sent campaign — "who actually got this" is answered by opening each source in
 * turn. The controls inside the panels carry the lock; moving between them is
 * not an edit.
 */
export default function RecipientSourceTabs({ tabs, value, onChange }: Props) {
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      // MUI hands back `null` when the active button is clicked again; there is
      // no "no source" state to fall into, so that click is simply a no-op.
      onChange={(_, next: RecipientSource | null) => next && onChange(next)}
      aria-label="Where recipients come from"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
        gap: 1,
        width: '100%',
        // A grid cannot carry MUI's joined-segment treatment, and these are
        // cards rather than segments anyway: each gets its own border and
        // radius back.
        '& .MuiToggleButtonGroup-grouped': {
          m: 0,
          px: 1.5,
          py: 1.25,
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          textTransform: 'none',
          justifyContent: 'flex-start',
          bgcolor: 'background.paper',
          '&.Mui-selected': {
            bgcolor: 'background.paper',
            // Inset rather than a thicker border: a border that changes width on
            // selection moves every card next to it by a pixel.
            boxShadow: (theme) => `inset 0 0 0 2px ${theme.palette.secondary.main}`,
            '&:hover': { bgcolor: 'background.paper' },
          },
        },
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <ToggleButton key={tab.key} value={tab.key} aria-label={tab.label}>
            <Tooltip title={tab.hint}>
              <Stack
                direction="row"
                spacing={1.25}
                alignItems="center"
                sx={{ width: '100%', minWidth: 0 }}
              >
                <IconBadge accent={selected ? 'secondary' : 'primary'} size={34} iconSize={18}>
                  {ICONS[tab.key]}
                </IconBadge>

                <Box sx={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="text.primary"
                    noWrap
                    display="block"
                  >
                    {tab.label}
                  </Typography>
                  {/* The count in words, not a bare badge: "40" next to an
                      address book reads as the size of the book, and the number
                      that matters is how many of it are being mailed. */}
                  <Typography
                    variant="caption"
                    color={tab.count > 0 ? 'secondary.main' : 'text.secondary'}
                    fontWeight={tab.count > 0 ? 600 : 400}
                    noWrap
                    display="block"
                  >
                    {tab.count > 0 ? `${tab.count.toLocaleString()} selected` : 'nobody yet'}
                  </Typography>
                </Box>
              </Stack>
            </Tooltip>
          </ToggleButton>
        );
      })}
    </ToggleButtonGroup>
  );
}
