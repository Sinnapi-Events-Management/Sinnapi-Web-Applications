import {
  Chip,
  Stack,
  Typography,
  formatAmount,
  packageLineAmount,
  type PackageLineLike,
} from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';

type Props = {
  addOns: PackageLineLike[];
  currency: string;
  onAdd: (line: PackageLineLike) => void;
};

/**
 * The applied package's extras, one click each.
 *
 * This is the vendor's half of "optional add-ons": the package advertises them
 * to clients as available, and here the vendor decides which of them this
 * particular client is getting. The client receives one settled figure rather
 * than a configurator — a price they can read and accept, not one that moves
 * while they look at it.
 *
 * Adding one appends an ordinary line, editable like any other. Nothing about
 * it stays marked as optional on the quote, because by the time it is on the
 * quote it is not.
 */
export default function QuotationAddOnRow({ addOns, currency, onAdd }: Props) {
  if (addOns.length === 0) return null;

  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        Add-ons from this package — tap to price one in
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {addOns.map((line, index) => (
          <Chip
            key={line.id ?? `add-on-${index}`}
            icon={<AddIcon />}
            label={`${line.description} · ${formatAmount(packageLineAmount(line), currency)}`}
            onClick={() => onAdd(line)}
            variant="outlined"
            sx={{ maxWidth: '100%' }}
          />
        ))}
      </Stack>
    </Stack>
  );
}
