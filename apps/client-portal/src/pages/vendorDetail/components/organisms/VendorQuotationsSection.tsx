import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Divider, Paper, QueryState, Typography } from '@sinnapi/ui';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import VendorSectionHeading from '../atoms/VendorSectionHeading';
import VendorQuoteListItem from '../molecules/VendorQuoteListItem';
import { useVendorQuotations } from '../../hooks/useVendorQuotations';

type Props = {
  vendorId: string;
  vendorName: string;
  /** Switches the profile to the Packages tab, where a quote is requested. */
  onSeePackages: () => void;
};

/**
 * How many rows show before the list collapses. Rows are newest first, so the
 * collapsed view is the two most recent quotes.
 */
const COLLAPSED_ROWS = 2;

/**
 * Every quote this client has with this vendor, as a section of the profile.
 *
 * WHY A TAB
 * A client who has asked this vendor for a price came back to the profile to
 * check on it. The quote belongs to this vendor, so the vendor's page is where
 * it is checked, and a tab keeps it out of the way of the profile for everyone
 * who has not asked for a quote.
 *
 * Every status is shown, including requested, draft, declined and expired, so
 * the section is the complete history with this vendor, newest first. The list
 * collapses so a long history does not push the rest of the tab down.
 *
 * The empty state is a next step rather than an absence. It points to the
 * Packages tab, where a quote is requested.
 *
 * Layout only: `useVendorQuotations` owns the read and the next action per row.
 */
export default function VendorQuotationsSection({ vendorId, vendorName, onSeePackages }: Props) {
  const navigate = useNavigate();
  const { rows, hasQuotations, actionableCount, isLoading, error } = useVendorQuotations(vendorId);
  const [expanded, setExpanded] = useState(false);

  const isCollapsible = rows.length > COLLAPSED_ROWS;
  const visibleRows = expanded || !isCollapsible ? rows : rows.slice(0, COLLAPSED_ROWS);

  const subtitle =
    actionableCount > 0
      ? `${actionableCount === 1 ? '1 quote needs' : `${actionableCount} quotes need`} your attention.`
      : `Every quote you have with ${vendorName}, newest first.`;

  return (
    <section>
      <VendorSectionHeading
        eyebrow="Quotations"
        title={`Your quotes with ${vendorName}`}
        subtitle={hasQuotations ? subtitle : undefined}
      />

      <QueryState isLoading={isLoading} error={error}>
        {hasQuotations ? (
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            {visibleRows.map((row, index) => (
              <Box key={row.quote.id}>
                {index > 0 && <Divider />}
                <VendorQuoteListItem row={row} onOpen={(to) => navigate(to)} />
              </Box>
            ))}

            {isCollapsible && (
              <>
                <Divider />
                <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1 }}>
                  <Button
                    size="small"
                    color="primary"
                    fullWidth
                    onClick={() => setExpanded((open) => !open)}
                    aria-expanded={expanded}
                  >
                    {expanded
                      ? 'Show fewer quotes'
                      : `Show all ${rows.length} quotes (${rows.length - COLLAPSED_ROWS} more)`}
                  </Button>
                </Box>
              </>
            )}
          </Paper>
        ) : (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: 3,
              borderStyle: 'dashed',
              textAlign: 'center',
              bgcolor: 'action.hover',
            }}
          >
            <ReceiptLongOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="subtitle1">No quotes with {vendorName} yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
              Once you request a quote, it appears here so you can follow it, answer it and book.
            </Typography>
            <Button variant="outlined" onClick={onSeePackages}>
              See packages
            </Button>
          </Paper>
        )}
      </QueryState>
    </section>
  );
}
