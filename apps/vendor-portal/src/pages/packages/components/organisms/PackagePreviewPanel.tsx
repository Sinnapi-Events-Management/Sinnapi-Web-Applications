import type { Control } from 'react-hook-form';
import { Box, Divider, PackageShowcase, Typography } from '@sinnapi/ui';
import { usePackagePreview } from '../../hooks/usePackagePreview';
import type { PackageFormValues } from '../../schema';

/**
 * What a client will see, priced from whatever is in the form right now.
 *
 * Rendered through the same `PackageShowcase` the client portal, the public
 * site and the admin console use. A preview with arithmetic or a layout of its
 * own is a preview that can flatter the thing it is previewing, which is the
 * one bug in an editor a vendor would never think to check for.
 *
 * STICKY, BUT BOUNDED
 * On a wide screen the panel follows the vendor down the form — the point is to
 * watch the price move while typing. It is capped to the viewport and scrolls
 * inside itself, because a package with three tiers and a long inclusion list
 * is taller than most laptop screens, and a sticky block taller than its
 * viewport pins its own bottom out of reach.
 *
 * On a phone it simply follows the form. A vendor arrives here to type, and a
 * preview of an empty package above the first field is a screen of nothing.
 */
export default function PackagePreviewPanel({ control }: { control: Control<PackageFormValues> }) {
  const pkg = usePackagePreview(control);

  return (
    <Box
      sx={{
        position: { md: 'sticky' },
        top: { md: 8 },
        maxHeight: { md: 'calc(100vh - 220px)' },
        overflowY: { md: 'auto' },
        // Keeps the scrollbar off the card's rounded corner.
        pr: { md: 0.5 },
      }}
    >
      <Divider sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }} />
      <Typography variant="overline" color="text.secondary">
        What clients will see
      </Typography>
      <Box sx={{ mt: 1 }}>
        <PackageShowcase pkg={pkg} />
      </Box>
    </Box>
  );
}
