'use client';
import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import ShieldIcon from '@mui/icons-material/ShieldOutlined';
import { InfoRow } from '../../molecules/InfoRow';
import { SectionCard } from '../../organisms/SectionCard';
import type { AccentColor } from '../../molecules/IconBadge';
import type { AccountFact } from '../types';

export type AccountFactsCardProps = {
  facts: AccountFact[];
  title?: string;
  icon?: ReactNode;
  accent?: AccentColor;
  /** Closing note, e.g. why none of these are editable here. */
  note?: string;
  /**
   * Header-right slot — the one place this card can offer a control.
   *
   * Used to point at whatever *does* own these values: the facts themselves are
   * read-only, but "you can't change it here" is only half an answer, and the
   * other half should be a link rather than a sentence telling the user to go
   * looking.
   */
  action?: ReactNode;
};

/**
 * Read-only account facts.
 *
 * Everything shown here is set by the platform rather than the account holder —
 * the email is the account identity, the timestamps are the system's — so it is
 * deliberately presented as information rather than as fields that merely happen
 * to be disabled. A disabled input invites the user to look for the thing that
 * would enable it; a stated fact does not.
 */
export function AccountFactsCard({
  facts,
  title = 'Account',
  icon,
  accent = 'primary',
  note,
  action,
}: AccountFactsCardProps) {
  return (
    <SectionCard title={title} icon={icon ?? <ShieldIcon />} accent={accent} action={action}>
      <Box>
        {facts.map((fact) => (
          <InfoRow
            key={fact.key}
            label={fact.label}
            icon={fact.icon}
            value={fact.value}
            copyValue={fact.copyValue}
            mono={fact.mono}
          />
        ))}
      </Box>
      {note && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {note}
        </Typography>
      )}
    </SectionCard>
  );
}
