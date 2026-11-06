import type { ReactNode } from 'react';
import { Card, CardContent, Stack, Typography } from '@sinnapi/ui';

type Props = { title: string; subtitle?: string; action?: ReactNode; children: ReactNode };

/** One titled section of the invoice editor. */
export default function SectionCard({ title, subtitle, action, children }: Props) {
  return (
    <Card variant="outlined" component="section">
      <CardContent sx={{ p: { xs: 2, sm: 2.75 }, '&:last-child': { pb: { xs: 2, sm: 2.75 } } }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Stack spacing={0.25}>
              <Typography variant="h6" component="h2" fontWeight={700}>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Stack>
            {action}
          </Stack>
          {children}
        </Stack>
      </CardContent>
    </Card>
  );
}
