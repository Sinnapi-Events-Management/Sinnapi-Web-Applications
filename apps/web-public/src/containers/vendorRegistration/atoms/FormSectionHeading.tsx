import { Box, Typography } from '@sinnapi/ui/atoms';

type Props = { title: string; caption?: string };

/** Title and optional one-line caption opening each group of fields. */
export default function FormSectionHeading({ title, caption }: Props) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {caption && (
        <Typography variant="body2" color="text.secondary">
          {caption}
        </Typography>
      )}
    </Box>
  );
}
