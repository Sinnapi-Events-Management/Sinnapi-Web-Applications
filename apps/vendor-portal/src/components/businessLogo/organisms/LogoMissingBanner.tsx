import { Alert, AlertTitle, Button } from '@sinnapi/ui';
import { useLogoGate } from '../hooks/useLogoGate';
import { LOGO_COPY } from '../schema/copy';

/**
 * The heads-up on the pages where documents are made — Quotations and
 * Invoices & Receipts — so the logo request is never a surprise on Send.
 * Renders nothing once a logo is in.
 */
export default function LogoMissingBanner() {
  const { hasLogo, openDialog } = useLogoGate();
  if (hasLogo) return null;

  return (
    <Alert
      severity="warning"
      variant="outlined"
      sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, '& .MuiAlert-action': { pt: 0 } }}
      action={
        <Button color="inherit" size="small" variant="outlined" onClick={openDialog}>
          {LOGO_COPY.banner.action}
        </Button>
      }
    >
      <AlertTitle sx={{ mb: 0.25 }}>{LOGO_COPY.banner.title}</AlertTitle>
      {LOGO_COPY.banner.body}
    </Alert>
  );
}
