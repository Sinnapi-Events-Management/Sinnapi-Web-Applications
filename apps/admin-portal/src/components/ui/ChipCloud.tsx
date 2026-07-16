import { Box, Stack, Typography, Chip } from '@sinnapi/ui';

export type ChipItem = {
  key: string;
  label: string;
  /** Emphasise a chip (e.g. the primary service category). */
  highlight?: boolean;
  variant?: 'filled' | 'outlined';
};

type Props = {
  title?: string;
  items: ChipItem[];
  icon?: React.ReactNode;
};

/** A labelled group of chips — services, regions, tags, etc. */
export default function ChipCloud({ title, items, icon }: Props) {
  if (items.length === 0) return null;
  return (
    <Box>
      {title && (
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
          {icon && (
            <Box sx={{ color: 'text.disabled', display: 'flex', '& svg': { fontSize: 18 } }}>
              {icon}
            </Box>
          )}
          <Typography variant="overline" color="text.secondary">
            {title}
          </Typography>
        </Stack>
      )}
      <Stack direction="row" flexWrap="wrap" gap={0.75}>
        {items.map((it) => (
          <Chip
            key={it.key}
            size="small"
            label={it.label}
            color={it.highlight ? 'primary' : 'default'}
            variant={it.variant ?? (it.highlight ? 'filled' : 'outlined')}
            sx={{ fontWeight: it.highlight ? 600 : 400 }}
          />
        ))}
      </Stack>
    </Box>
  );
}
