'use client';
import { Typography } from '@mui/material';
import { AppLink } from '../atoms/AppLink';
import type { AuthSwitchPromptProps } from '../types';

/**
 * The "New here? Create an account" line shared by every auth form — one
 * muted sentence plus the brand-coloured route link, so the two portals can
 * never drift apart on wording weight or link styling.
 */
export function AuthSwitchPrompt({ question, actionLabel, to }: AuthSwitchPromptProps) {
  return (
    <Typography variant="body1" color="text.secondary">
      {question} <AppLink to={to}>{actionLabel}</AppLink>
    </Typography>
  );
}
