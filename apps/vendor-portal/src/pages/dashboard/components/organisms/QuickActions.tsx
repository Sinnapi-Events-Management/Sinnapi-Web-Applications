import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, ButtonBase, Snackbar, Typography, alpha } from '@sinnapi/ui';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import ShareIcon from '@mui/icons-material/ShareOutlined';
import { ADD_MEDIA_PATH } from '@/lib/config';

type Props = { publicUrl: string; businessName: string };

function Tile({
  icon,
  label,
  to,
  onClick,
  primary,
}: {
  icon: ReactNode;
  label: string;
  to?: string;
  onClick?: () => void;
  primary?: boolean;
}) {
  return (
    <ButtonBase
      {...(to ? { component: RouterLink, to } : { onClick })}
      sx={{
        flexDirection: 'column',
        gap: 0.75,
        py: 1.5,
        px: 0.5,
        borderRadius: 3,
        border: 1,
        borderColor: (t) => (primary ? t.palette.secondary.main : t.palette.divider),
        bgcolor: (t) =>
          primary ? alpha(t.palette.secondary.main, 0.12) : t.palette.background.paper,
        minHeight: 88,
        '& svg': { fontSize: 28, color: 'secondary.dark' },
      }}
    >
      {icon}
      <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2, textAlign: 'center' }}>
        {label}
      </Typography>
    </ButtonBase>
  );
}

/**
 * The four things a vendor does most, one tap each (chosen 2026-11-17).
 * "Add photos & videos" is always first and always shown — the user asked for
 * it to stay visible whatever the listing already has.
 */
export default function QuickActions({ publicUrl, businessName }: Props) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const data = { title: businessName, text: `See ${businessName} on Sinnapi`, url: publicUrl };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
    } catch {
      /* the person closed the share sheet — nothing to do */
    }
  };

  return (
    <>
      <Box
        component="nav"
        aria-label="Quick actions"
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 1,
          mb: 3,
          maxWidth: 640,
        }}
      >
        <Tile
          primary
          icon={<AddPhotoAlternateIcon />}
          label="Add photos & videos"
          to={ADD_MEDIA_PATH}
        />
        <Tile icon={<ReceiptLongIcon />} label="New invoice" to="/invoices/new" />
        <Tile icon={<PaymentsIcon />} label="New receipt" to="/receipts/new" />
        <Tile icon={<ShareIcon />} label="Share my page" onClick={() => void share()} />
      </Box>
      <Snackbar
        open={copied}
        autoHideDuration={2500}
        onClose={() => setCopied(false)}
        message="Link to your page copied — paste it in WhatsApp"
      />
    </>
  );
}
