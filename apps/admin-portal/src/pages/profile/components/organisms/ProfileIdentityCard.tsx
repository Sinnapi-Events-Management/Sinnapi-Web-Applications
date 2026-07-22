import { Alert, Box, Card, CardContent, Chip, Stack, Typography, alpha } from '@sinnapi/ui';
import StatusChip from '@/components/ui/StatusChip';
import { titleize } from '@/lib/config';
import { useAvatarUpload } from '../../hooks/useAvatarUpload';
import AvatarPicker from '../molecules/AvatarPicker';

type Props = {
  name: string;
  email: string | null;
  avatarUrl: string | null;
  roles: string[];
  /** `profile_status` — rendered beside the roles so both read as one badge row. */
  status: string | null;
  /** Bubbles the success toast up to the page. */
  onDone: (message: string) => void;
};

/**
 * The "who you are" card: photo, display name, email and roles.
 *
 * It owns the avatar upload because that write is self-contained — it neither
 * reads from nor blocks the details form beside it, so pairing the two would
 * only couple one busy state to the other.
 */
export default function ProfileIdentityCard({
  name,
  email,
  avatarUrl,
  roles,
  status,
  onDone,
}: Props) {
  const { busy, err, preview, upload, remove, maxSizeMb } = useAvatarUpload(avatarUrl, onDone);

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      {/* Tinted band behind the avatar — gives the card a header without
          costing a second surface or an image asset. */}
      <Box
        sx={{
          height: 88,
          background: (t) =>
            `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.18)}, ${alpha(
              t.palette.secondary.main,
              0.22,
            )})`,
        }}
      />
      <CardContent sx={{ pt: 0, pb: { xs: 2.5, sm: 3 }, px: { xs: 2.5, sm: 3 } }}>
        <Box sx={{ mt: -7 }}>
          <AvatarPicker
            src={preview ?? avatarUrl}
            name={name}
            busy={busy}
            maxSizeMb={maxSizeMb}
            onSelect={upload}
            onRemove={remove}
          />
        </Box>

        {err && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {err}
          </Alert>
        )}

        <Stack spacing={0.5} alignItems="center" sx={{ mt: 2.5 }}>
          <Typography variant="h6" textAlign="center" sx={{ wordBreak: 'break-word' }}>
            {name}
          </Typography>
          {email && (
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              sx={{ wordBreak: 'break-all' }}
            >
              {email}
            </Typography>
          )}
        </Stack>

        {(status || roles.length > 0) && (
          <Stack
            direction="row"
            spacing={0.75}
            justifyContent="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 2 }}
          >
            {status && <StatusChip status={status} />}
            {roles.map((role) => (
              <Chip key={role} size="small" color="secondary" label={titleize(role)} />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
