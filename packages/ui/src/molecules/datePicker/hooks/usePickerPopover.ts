'use client';
/**
 * Open/close plumbing shared by every picker field.
 *
 * Also decides *how* the calendar appears: anchored to the field on a desktop,
 * but a centred dialog on a phone, where a popover pinned to a field near the
 * bottom of the viewport would open off-screen or under the keyboard.
 *
 * `onBlur` fires on close rather than on the trigger's own blur event: focus
 * moves into the popover the instant the field is clicked, so a real blur
 * handler would mark a field touched — and show "Required" — before the user
 * has had a chance to pick anything.
 */
import { useCallback, useRef, useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';

export type PickerPopover = {
  open: boolean;
  anchorEl: HTMLDivElement | null;
  anchorRef: React.RefObject<HTMLDivElement>;
  /** True when the calendar should render as a dialog instead of a popover. */
  fullScreen: boolean;
  openPicker: () => void;
  closePicker: () => void;
};

export function usePickerPopover(opts?: {
  disabled?: boolean;
  onClose?: () => void;
}): PickerPopover {
  const { disabled, onClose } = opts ?? {};
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const openPicker = useCallback(() => {
    if (!disabled) setOpen(true);
  }, [disabled]);

  const closePicker = useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [onClose]);

  return {
    open,
    anchorEl: anchorRef.current,
    anchorRef,
    fullScreen,
    openPicker,
    closePicker,
  };
}
