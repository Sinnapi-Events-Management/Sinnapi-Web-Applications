import { Box, Typography } from '@sinnapi/ui';

type Props = {
  title: string;
  /** The one-line explanation of what this group of fields is for. */
  hint?: string;
};

/**
 * The title above a group of fields in the package editor.
 *
 * An atom rather than two `Typography` calls repeated six times: the editor is
 * a long form and its only navigational structure is the rhythm of these
 * headings, so they have to be identical. When they were written out per
 * section they had already drifted in weight and spacing.
 */
export default function PackageSectionHeading({ title, hint }: Props) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700}>
        {title}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary" display="block">
          {hint}
        </Typography>
      )}
    </Box>
  );
}
