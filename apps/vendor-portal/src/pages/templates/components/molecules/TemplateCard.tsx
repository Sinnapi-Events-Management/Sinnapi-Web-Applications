import { Card, CardContent, Typography, Stack, Chip } from '@sinnapi/ui';
import type { TemplateModel } from '@/lib/types';

/** One reusable quote template. */
export default function TemplateCard({ template }: { template: TemplateModel }) {
  const itemCount = (template.quote_template_items ?? []).length;

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{template.name}</Typography>
          <Chip size="small" label={`${itemCount} items`} />
        </Stack>
        {template.notes && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {template.notes}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
