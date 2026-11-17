import { Badge, Chip, Stack } from '@sinnapi/ui';

type Props<T extends string> = {
  tabs: ReadonlyArray<{ value: T; label: string }>;
  active: T | null;
  onSelect: (tab: T) => void;
  /** Badge counts for the views that need the vendor (e.g. new requests). */
  counts?: Partial<Record<T, number>>;
  ariaLabel: string;
};

/**
 * One-tap views above a list (Bookings, Quotations). Chips that wrap rather
 * than a scrolling tab row: on a 360px phone every option stays visible, and
 * each is a 40px-tall thumb target. A badge marks the views holding work that
 * is waiting on the vendor.
 */
export default function QuickViewTabs<T extends string>({
  tabs,
  active,
  onSelect,
  counts,
  ariaLabel,
}: Props<T>) {
  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      useFlexGap
      spacing={0.75}
      role="tablist"
      aria-label={ariaLabel}
      sx={{ mb: 2 }}
    >
      {tabs.map((t) => {
        const selected = active === t.value;
        const count = counts?.[t.value] ?? 0;
        const chip = (
          <Chip
            key={t.value}
            role="tab"
            aria-selected={selected}
            label={t.label}
            clickable
            onClick={() => onSelect(t.value)}
            color={selected ? 'primary' : 'default'}
            variant={selected ? 'filled' : 'outlined'}
            sx={{ height: 40, fontSize: '0.875rem', fontWeight: selected ? 700 : 500 }}
          />
        );
        return count > 0 ? (
          <Badge key={t.value} badgeContent={count} color="secondary" overlap="rectangular">
            {chip}
          </Badge>
        ) : (
          chip
        );
      })}
    </Stack>
  );
}
