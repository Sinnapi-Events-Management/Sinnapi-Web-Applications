import { alpha, Avatar, Box, Chip, Stack, Tooltip, Typography } from '@sinnapi/ui';
import SettingsSuggestOutlinedIcon from '@mui/icons-material/SettingsSuggestOutlined';
import WebhookOutlinedIcon from '@mui/icons-material/WebhookOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import type { ActorKind, AuditLogModel } from '@/lib/types';
import { actorInfo, initials } from '../../schema/presenter';

/**
 * Who — or what — performed the action.
 *
 * A person renders as an avatar with their name and role chips. Everything
 * else renders as the KIND of automation it actually was: a provider webhook,
 * the reconciliation sweep, a scheduled job, or genuinely unattributed.
 *
 * That distinction is the point of the change. This cell used to test
 * `actor_id is null` and render one grey "System · Automated action" badge for
 * all of them, so a payment that flipped to succeeded looked identical whether
 * a Pesapal IPN applied the provider's answer, the hourly sweep resolved a
 * lost webhook, or a Finance admin moved it by hand. Those are three different
 * incidents and the audit page could not tell them apart.
 *
 * `system` is now the one that should look wrong. Since 20260904000001 it means
 * nothing recorded an actor at all, which after this work is a gap rather than
 * a normal state — so it wears the error accent and says so, instead of
 * reading as the reassuring default it used to be.
 */
const KIND_ICONS: Record<Exclude<ActorKind, 'user'>, SvgIconComponent> = {
  psp_webhook: WebhookOutlinedIcon,
  reconciliation: RuleOutlinedIcon,
  cron: ScheduleOutlinedIcon,
  system: SettingsSuggestOutlinedIcon,
};

export default function ActorCell({ log }: { log: AuditLogModel }) {
  const { isSystem, kind, kindLabel, kindDescription, kindAccent, name, email, roles } =
    actorInfo(log);

  if (isSystem) {
    const Icon = KIND_ICONS[kind as Exclude<ActorKind, 'user'>] ?? SettingsSuggestOutlinedIcon;
    const unattributed = kind === 'system';

    return (
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Tooltip
          title={
            unattributed
              ? 'No actor was recorded for this action. If it came from a payment flow, the code path is missing its audit context.'
              : kindDescription
          }
        >
          <Avatar
            sx={{
              width: 34,
              height: 34,
              // The accent carries the meaning: routine automation reads calm,
              // an unattributed row reads as something to look into.
              bgcolor: (t) =>
                unattributed ? alpha(t.palette.error.main, 0.12) : t.palette.action.hover,
              color: unattributed ? 'error.main' : `${kindAccent}.main`,
            }}
          >
            <Icon sx={{ fontSize: 18 }} />
          </Avatar>
        </Tooltip>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {kindLabel}
          </Typography>
          <Typography
            variant="caption"
            color={unattributed ? 'error.main' : 'text.secondary'}
            noWrap
          >
            {/* `actor_label` names WHICH webhook or WHICH sweep, which is the
                difference between "a provider told us" and "Pesapal's IPN told
                us". `source` names the function, and is the next question. */}
            {kindDescription}
            {log.source ? ` · ${log.source}` : ''}
          </Typography>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 600 }}>
        {initials(name)}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {name}
        </Typography>
        {roles.length > 0 ? (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
            {roles.map((role) => (
              <Chip
                key={role.id}
                size="small"
                label={role.name}
                variant="outlined"
                color={role.is_admin ? 'primary' : 'default'}
                sx={{ height: 18, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
              />
            ))}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary" noWrap>
            {email ?? 'No role assigned'}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
