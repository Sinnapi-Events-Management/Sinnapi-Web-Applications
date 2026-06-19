import { Box, Container, Typography } from '@sinnapi/ui';

export default function SectionHeading({
  overline,
  title,
  subtitle,
  align = 'left',
}: {
  overline?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
}) {
  return (
    <Box
      sx={{
        textAlign: align,
        maxWidth: align === 'center' ? 720 : undefined,
        mx: align === 'center' ? 'auto' : undefined,
        mb: 4,
      }}
    >
      {overline && (
        <Typography variant="overline" color="primary">
          {overline}
        </Typography>
      )}
      <Typography variant="h2" sx={{ mt: 0.5 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box sx={{ bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider', py: { xs: 5, md: 7 } }}>
      <Container>
        <Typography variant="h1">{title}</Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2, maxWidth: 720 }}>
            {subtitle}
          </Typography>
        )}
      </Container>
    </Box>
  );
}
