import { Link as RouterLink } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  Skeleton,
  Stack,
  Typography,
} from '@sinnapi/ui';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import type { WaitingItem } from '../../hooks/useWaitingForYou';

type Props = { items: WaitingItem[]; total: number; isLoading: boolean };

const SHOW = 5;

/**
 * "Waiting for you" — the people who need an answer, one row each, like a
 * WhatsApp chat list: who, what they want, and the verb to act. Replaces six
 * count tiles whose titles cut off on a phone ("Booking …", "Quote re…").
 */
export default function WaitingForYou({ items, total, isLoading }: Props) {
  return (
    <Box component="section" aria-labelledby="waiting-title" sx={{ mb: 3 }}>
      <Typography id="waiting-title" variant="h6" component="h2" fontWeight={700} sx={{ mb: 1 }}>
        Waiting for you{total > 0 ? ` (${total})` : ''}
      </Typography>

      {isLoading ? (
        <Stack spacing={1}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      ) : items.length === 0 ? (
        <Card variant="outlined" sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <CheckCircleIcon color="success" />
          <Typography>All done — nobody is waiting for an answer.</Typography>
        </Card>
      ) : (
        <Card variant="outlined">
          {items.slice(0, SHOW).map((item, i) => (
            <CardActionArea
              key={item.id}
              component={RouterLink}
              to={item.to}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.25,
                borderTop: i === 0 ? 0 : 1,
                borderColor: 'divider',
              }}
            >
              <Avatar
                sx={{ width: 40, height: 40, bgcolor: 'secondary.light', color: 'secondary.dark' }}
              >
                {item.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={700} noWrap>
                  {item.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {item.line}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                fontWeight={700}
                color="secondary.dark"
                sx={{ flexShrink: 0 }}
              >
                {item.action} →
              </Typography>
            </CardActionArea>
          ))}
        </Card>
      )}

      {total > SHOW && (
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mt: 1 }}>
          <Button component={RouterLink} to="/bookings?status=requested" size="small">
            All bookings to answer
          </Button>
          <Button component={RouterLink} to="/quotations?status=requested" size="small">
            All quotes to price
          </Button>
          <Button component={RouterLink} to="/reviews" size="small">
            Reviews to answer
          </Button>
        </Stack>
      )}
    </Box>
  );
}
