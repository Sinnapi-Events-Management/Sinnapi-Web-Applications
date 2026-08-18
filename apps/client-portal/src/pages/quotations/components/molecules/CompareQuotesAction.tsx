import { Link as RouterLink } from 'react-router-dom';
import { Button } from '@sinnapi/ui';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

/** Header action that sends the client to the side-by-side comparison view. */
export default function CompareQuotesAction() {
  return (
    <Button
      component={RouterLink}
      to="/quotations/compare"
      variant="outlined"
      startIcon={<CompareArrowsIcon />}
    >
      Compare
    </Button>
  );
}
