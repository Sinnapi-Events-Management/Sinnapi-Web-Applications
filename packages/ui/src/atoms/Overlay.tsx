'use client';
// Overlay primitives — the unstyled machinery behind anything that floats over
// the page without being a Dialog: focus trapping, scroll locking, the portal
// and the scrim.
//
// `Dialog` (organisms) is the styled, titled, actioned version and stays the
// right answer for a confirmation or a form. `Modal` is what you reach for when
// the floating thing is not a dialog at all — a search palette, a lightbox, a
// command menu — and wants to own its own chrome. Exported here rather than
// imported from @mui/material directly so apps keep one import surface.
export {
  Modal,
  type ModalProps,
  Backdrop,
  type BackdropProps,
  Fade,
  type FadeProps,
  Grow,
  type GrowProps,
  Slide,
  type SlideProps,
  Popper,
  type PopperProps,
  Portal,
  type PortalProps,
  ClickAwayListener,
  type ClickAwayListenerProps,
} from '@mui/material';
