import { Stack, Typography } from '@sinnapi/ui';
import TipsIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
import CheckIcon from '@mui/icons-material/CheckCircleOutline';
import SectionCard from '@/components/ui/SectionCard';

/**
 * Standing guidance for an account that can approve payouts and read every
 * customer record. Static copy — it explains what the portal expects of the
 * person holding the account, which no query can tell them.
 */
const TIPS = [
  'Use a password you have never used on another site — reuse is how most admin accounts are lost.',
  'Store it in a password manager rather than a note, a browser profile or a spreadsheet.',
  'Change it immediately if you suspect anyone has watched you type it or shared a device with you.',
  'Never approve a payout or a refund from a device you do not control.',
];

export default function SecurityTipsCard() {
  return (
    <SectionCard title="Keeping your account secure" icon={<TipsIcon />} accent="secondary">
      <Stack component="ul" spacing={1.75} sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {TIPS.map((tip) => (
          <Stack key={tip} component="li" direction="row" spacing={1.25} alignItems="flex-start">
            <CheckIcon sx={{ fontSize: 18, color: 'secondary.main', mt: '2px', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary">
              {tip}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </SectionCard>
  );
}
