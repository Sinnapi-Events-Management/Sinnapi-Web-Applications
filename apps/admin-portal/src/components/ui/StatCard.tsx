import { Link as RouterLink } from 'react-router-dom';
import { Card, CardActionArea, CardContent, Typography, Box } from '@sinnapi/ui';

export default function StatCard({
  label,
  value,
  to,
  icon,
}: {
  label: string;
  value: number | string;
  to?: string;
  icon?: React.ReactNode;
}) {
  const inner = (
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Box sx={{ color: 'secondary.main' }}>{icon}</Box>
      </Box>
      <Typography variant="h2" sx={{ fontSize: '2.25rem' }}>
        {value}
      </Typography>
    </CardContent>
  );
  return (
    <Card variant="outlined">
      {to ? (
        <CardActionArea component={RouterLink} to={to}>
          {inner}
        </CardActionArea>
      ) : (
        inner
      )}
    </Card>
  );
}
