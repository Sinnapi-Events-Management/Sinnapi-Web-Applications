'use client';
import { Chip, Tooltip } from '@mui/material';
import PriceCheckRoundedIcon from '@mui/icons-material/PriceCheckRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import { isPricingModel, pricingModelSpec, type PricingModel } from './pricingModels';

const ICONS: Record<PricingModel, typeof PriceCheckRoundedIcon> = {
  fixed: PriceCheckRoundedIcon,
  hourly: ScheduleRoundedIcon,
  combination: TuneRoundedIcon,
  custom: RequestQuoteRoundedIcon,
};

export type PricingModelChipProps = {
  /** `quote_templates.pricing_model`, or one entry of a service's set. */
  model: string | null | undefined;
  size?: 'small' | 'medium';
  /**
   * `outlined` for a card the chip is decorating, `filled` for the one place
   * the model IS the headline. Defaults to outlined: a package card already
   * has a price and a status chip competing for the eye.
   */
  variant?: 'filled' | 'outlined';
  /** Which side's explanation the tooltip carries. */
  voice?: 'client' | 'vendor';
};

/**
 * How one package is charged, in a chip.
 *
 * Rendered by four audiences off one component: the vendor checking what they
 * published, the client comparing packages on a profile, a visitor on the
 * marketing site, and an operator moderating. The tooltip is the reason this
 * is not an inline `<Chip>` at each site — "Hourly" on its own does not tell a
 * client the total can move on the day, and that sentence has to be identical
 * everywhere or the platform is making four different promises.
 *
 * Renders nothing for a row with no model rather than a "Not set" placeholder:
 * a client is not helped by being told the vendor has not answered a question
 * they did not know was being asked. The vendor's own card says so instead,
 * where it is actionable.
 */
export function PricingModelChip({
  model,
  size = 'small',
  variant = 'outlined',
  voice = 'client',
}: PricingModelChipProps) {
  if (!isPricingModel(model)) return null;

  const spec = pricingModelSpec(model);
  const Icon = ICONS[model];

  return (
    <Tooltip title={voice === 'vendor' ? spec.vendorNote : spec.clientNote}>
      <Chip
        size={size}
        variant={variant}
        color={spec.tone}
        icon={<Icon />}
        label={spec.label}
        // `maxWidth` rather than a fixed one: "Base fee + variable" is the
        // longest label and must not push a card's status chip off the row on
        // a narrow phone. The chip wraps to its own line instead.
        sx={{ maxWidth: '100%' }}
      />
    </Tooltip>
  );
}
