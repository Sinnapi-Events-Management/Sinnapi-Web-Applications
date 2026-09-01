import { Stack, Tooltip, Typography } from '@sinnapi/ui';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';

type NotYourCategoryNoteProps = {
  /** The category the line is filed under, named so the note is actionable. */
  categoryName: string;
};

/**
 * Why there is no button on this line.
 *
 * A withheld control explains nothing on its own, and a DISABLED one explains
 * less than nothing — a vendor presses it, gets no response, and concludes the
 * page is broken. So the button is replaced by the reason, and the reason names
 * the category, because "add Makeup Artist to your services" is something the
 * vendor can go and do while "you cannot quote for this" is not.
 *
 * Deliberately quiet: text.secondary, no colour, no alert. A plan line outside
 * a vendor's trade is an ordinary fact about a marketplace, not a problem with
 * their account, and a row of amber warnings down a twelve-line wedding would
 * say otherwise.
 */
export default function NotYourCategoryNote({ categoryName }: NotYourCategoryNoteProps) {
  return (
    <Tooltip title={`Add a ${categoryName} service to your profile to quote for lines like this`}>
      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        sx={{ color: 'text.secondary', flexShrink: 0 }}
      >
        <BlockOutlinedIcon sx={{ fontSize: 16 }} />
        <Typography variant="caption">Not one of your services</Typography>
      </Stack>
    </Tooltip>
  );
}
