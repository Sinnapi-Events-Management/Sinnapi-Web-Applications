'use client';
/**
 * The shortcut rail beside a range calendar.
 *
 * Vertical beside the months on desktop, a horizontal scroller above them on a
 * phone — the same list, laid out where there is room for it.
 */
import { Button, Stack } from '@mui/material';
import type { RangePreset } from './presets';

export type RangePresetListProps = {
  presets: RangePreset[];
  onApply: (preset: RangePreset) => void;
  /** Which preset the current selection already matches, if any. */
  activeId?: string;
  horizontal?: boolean;
};

export function RangePresetList({ presets, onApply, activeId, horizontal }: RangePresetListProps) {
  if (presets.length === 0) return null;

  return (
    <Stack
      direction={horizontal ? 'row' : 'column'}
      spacing={0.5}
      sx={
        horizontal
          ? { px: 1.5, py: 1, overflowX: 'auto', flexShrink: 0 }
          : { p: 1.5, borderRight: 1, borderColor: 'divider', flexShrink: 0 }
      }
    >
      {presets.map((preset) => (
        <Button
          key={preset.id}
          size="small"
          color={preset.id === activeId ? 'primary' : 'inherit'}
          variant={preset.id === activeId ? 'contained' : 'text'}
          onClick={() => onApply(preset)}
          sx={{
            justifyContent: horizontal ? 'center' : 'flex-start',
            whiteSpace: 'nowrap',
            fontWeight: 500,
          }}
        >
          {preset.label}
        </Button>
      ))}
    </Stack>
  );
}
