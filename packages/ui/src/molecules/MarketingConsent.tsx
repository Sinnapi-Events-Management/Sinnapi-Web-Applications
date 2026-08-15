'use client';
import { Box, Checkbox, FormControlLabel, Typography } from '../atoms';

export type MarketingConsentProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  /**
   * The exact sentence beside the checkbox. Send this string to the server with
   * the opt-in: `marketing_subscriptions.consent_text` stores it verbatim as
   * the GDPR Art.7(1) record of what was agreed to, and this page's copy will
   * be rewritten long before those records expire.
   */
  label: string;
  /** What the subscriber actually receives, and how often. */
  description?: string;
  disabled?: boolean;
};

/**
 * The newsletter opt-in checkbox, shared by every surface that captures one.
 *
 * ── Why this is a component and not four copies of a Checkbox ─────────────
 * Everything about how a marketing opt-in is PRESENTED is legally load-bearing,
 * and all of it is easy to get wrong one form at a time:
 *
 *   * It must never be pre-ticked. `checked` is controlled by the caller, but
 *     every caller's initial value is `false` and this component has no default
 *     that could drift (Art.4(11); Planet49 settled pre-checked boxes).
 *   * It must be "clearly distinguishable from the other matters" it sits
 *     beside (Art.7(2)) — hence the tinted, bordered surface that visually
 *     separates it from the required terms above it, rather than a fifth
 *     identical row in the same list.
 *   * It must be genuinely optional (Art.7(4)). Nothing here can be marked
 *     required, and no caller's schema treats it as such.
 *   * The person should know what they are agreeing to receive, which is what
 *     `description` is for and why the copy names the content, not the list.
 *
 * Centralising it means a new sign-up surface inherits all four properties
 * instead of re-deriving them.
 */
export function MarketingConsent({
  checked,
  onChange,
  label,
  description,
  disabled,
}: MarketingConsentProps) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'action.hover',
      }}
    >
      <FormControlLabel
        sx={{ alignItems: 'flex-start', m: 0 }}
        control={
          <Checkbox
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            sx={{ pt: 0.25 }}
          />
        }
        label={
          <Box>
            <Typography variant="body2">{label}</Typography>
            {description && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.5 }}
              >
                {description}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Optional. You can unsubscribe from any email we send, in one click.
            </Typography>
          </Box>
        }
      />
    </Box>
  );
}
