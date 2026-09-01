import NextLink from 'next/link';
import { Box, Button, Stack, Typography } from '@sinnapi/ui/atoms';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { offersHref, type OffersQuery } from '../../utils/searchParams';

type Props = {
  query: OffersQuery;
  pageCount: number;
};

/**
 * Previous / next, as links.
 *
 * A NUMBERED PAGINATION COMPONENT WOULD NEED JAVASCRIPT; THIS DOES NOT
 * MUI's `Pagination` is a control, and a control on a server-rendered page is
 * an island that ships a bundle to move between two URLs an anchor already
 * describes. Two anchors also give a crawler something to follow, which is the
 * only way pages beyond the first are ever indexed at all.
 *
 * Prev and next only, rather than a full run of numbers. This directory is
 * short by construction — only offers that are live today, with a published
 * package behind them — so a numbered strip would mostly render two numbers
 * with room for twelve.
 *
 * The disabled end is rendered as a disabled button rather than omitted, so the
 * pair keeps its position and the reader's eye does not have to re-find the
 * control that is still there.
 */
export default function OffersPager({ query, pageCount }: Props) {
  if (pageCount <= 1) return null;

  const atStart = query.page <= 0;
  const atEnd = query.page >= pageCount - 1;

  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      justifyContent="center"
      sx={{ mt: { xs: 4, md: 6 } }}
      component="nav"
      aria-label="Offer pages"
    >
      <Button
        component={atStart ? 'button' : NextLink}
        href={atStart ? undefined : offersHref({ ...query, page: query.page - 1 })}
        disabled={atStart}
        startIcon={<ChevronLeftIcon />}
        rel="prev"
      >
        Previous
      </Button>

      <Box sx={{ minWidth: 90, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Page {query.page + 1} of {pageCount}
        </Typography>
      </Box>

      <Button
        component={atEnd ? 'button' : NextLink}
        href={atEnd ? undefined : offersHref({ ...query, page: query.page + 1 })}
        disabled={atEnd}
        endIcon={<ChevronRightIcon />}
        rel="next"
      >
        Next
      </Button>
    </Stack>
  );
}
