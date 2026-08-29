import { Stack, Typography, PricingModelChip, toPricingModels } from '@sinnapi/ui';

/**
 * The ways a vendor will be paid for this service.
 *
 * Says so explicitly when the set is empty rather than rendering nothing. An
 * empty set is a legacy row — every service predating 0823c has one — and the
 * vendor cannot fix what they are not told about. It is also the reason a
 * package under that service accepts any model, which is worth knowing.
 */
export default function ServicePricingModels({ models }: { models: string[] | null }) {
  const chosen = toPricingModels(models);

  if (chosen.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        No charging method set — packages under this service can use any.
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
      {chosen.map((model) => (
        <PricingModelChip key={model} model={model} voice="vendor" />
      ))}
    </Stack>
  );
}
