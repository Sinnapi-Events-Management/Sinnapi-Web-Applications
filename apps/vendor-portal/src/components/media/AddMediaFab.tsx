import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Fab, Fade } from '@sinnapi/ui';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import { ADD_MEDIA_LABEL, ADD_MEDIA_PATH } from '@/lib/config';

/**
 * Roughly the height of the toolbar plus the page title — past this, the bar's
 * own "Add photos or videos" button has left the screen.
 */
const REVEAL_AFTER_PX = 220;

/** Whether the window has scrolled past `threshold`. */
function useScrolledPast(threshold: number): boolean {
  const [past, setPast] = useState(false);

  useEffect(() => {
    // The portal shell scrolls the document itself — `PortalContent` sets no
    // overflow container — so the window is the right thing to listen to.
    const onScroll = () => setPast(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return past;
}

/**
 * The upload action, in reach of a thumb, on a phone.
 *
 * Our vendors are mostly on phones, held in one hand, and the dashboard is a
 * long page: a control at the top of it is a control they have to scroll back
 * for, and most won't. The bottom-right corner is the one part of a phone
 * screen a thumb reaches without regripping, and it is where the camera button
 * sits in WhatsApp and the "+" in Instagram — so this is a shape they already
 * know rather than one they have to learn.
 *
 * Three deliberate choices:
 *
 * - **Phone only.** From `sm` up the bar is sticky and its button never leaves,
 *   so a floating duplicate would be clutter.
 * - **It waits.** Nothing floats until the page has scrolled past the bar's own
 *   button. Two identical buttons on one screen is the pattern's usual failure,
 *   and a control that covers content before anything has been read is the
 *   other.
 * - **It is labelled.** An extended FAB, not a bare "+" disc. An icon alone
 *   tests whether someone can guess the metaphor; the words don't.
 *
 * Rendered by the page, outside the toolbar's `Paper` — that `Paper` carries a
 * `backdrop-filter`, which makes it the containing block for any fixed
 * descendant, so a FAB nested inside it would pin itself to the bar instead of
 * the viewport.
 */
export default function AddMediaFab() {
  const show = useScrolledPast(REVEAL_AFTER_PX);

  return (
    <Fade in={show}>
      <Fab
        component={RouterLink}
        to={ADD_MEDIA_PATH}
        color="primary"
        variant="extended"
        sx={{
          display: { xs: 'inline-flex', sm: 'none' },
          position: 'fixed',
          right: 16,
          // Clear of the home-indicator strip on a notched phone, where a
          // control flush to the bottom edge is a control that swipes the app
          // away instead of opening the uploader.
          bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          zIndex: (t) => t.zIndex.fab,
          textTransform: 'none',
          fontWeight: 600,
          // `Fade` hides the node once it has fully exited, but it is still
          // on screen — and still tappable — while it fades. Scrolling back to
          // the top should not leave a half-faded control taking taps.
          pointerEvents: show ? 'auto' : 'none',
        }}
      >
        <AddPhotoAlternateOutlinedIcon sx={{ mr: 1 }} />
        {ADD_MEDIA_LABEL}
      </Fab>
    </Fade>
  );
}
