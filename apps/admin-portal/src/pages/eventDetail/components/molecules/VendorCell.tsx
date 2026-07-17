import { Avatar, Box, Stack, Typography } from '@sinnapi/ui';

function initials(name: string | null): string {
  if (!name) return 'V';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

type Props = {
  name: string | null;
  imageUrl?: string | null;
  /** Optional second line (e.g. base city or reference). */
  secondary?: string | null;
};

/** Avatar + business name cell, shared by the interest and quotation tables. */
export default function VendorCell({ name, imageUrl, secondary }: Props) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
      <Avatar src={imageUrl ?? undefined} sx={{ width: 32, height: 32, fontSize: 13 }}>
        {initials(name)}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {name ?? '—'}
        </Typography>
        {secondary && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {secondary}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
