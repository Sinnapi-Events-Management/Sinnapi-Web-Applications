import { Box, Typography } from '@sinnapi/ui';
import { PAPER, VendorBrandBlock } from '@sinnapi/ui/documents';

type Props = {
  businessName: string;
  logoUrl: string | null;
  label: string;
};

/**
 * The top of a document as a client will see it, drawn with the same block
 * the real invoice, receipt and quotation previews use. White paper in both
 * themes — that is what is printed and emailed.
 */
export default function DocumentHeaderPreview({ businessName, logoUrl, label }: Props) {
  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
        {label}
      </Typography>
      <Box
        sx={{
          bgcolor: PAPER.paper,
          borderRadius: 2,
          boxShadow: (t) => `0 0 0 1px ${t.palette.divider}`,
          borderTop: `3px solid ${PAPER.accent}`,
          p: { xs: 2, sm: 2.5 },
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <VendorBrandBlock vendor={{ business_name: businessName, logo_url: logoUrl }} />
        <Box sx={{ color: PAPER.ink, fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>
          QUOTATION
        </Box>
      </Box>
    </Box>
  );
}
