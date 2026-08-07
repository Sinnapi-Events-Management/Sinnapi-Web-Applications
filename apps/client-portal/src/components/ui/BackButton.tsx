import { Button, type SxProps } from '@sinnapi/ui';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useGoBack } from '@/hooks/useGoBack';

type Props = {
  /** Where to land when there is no in-app history to return to. */
  fallback: string;
  label?: string;
  sx?: SxProps;
};

/**
 * Return-to-previous-screen control for detail views. Deliberately quiet — it
 * is an escape hatch, not one of the page's actions — and it keeps the label
 * generic because the destination depends on how the visitor arrived.
 */
export default function BackButton({ fallback, label = 'Back', sx }: Props) {
  const goBack = useGoBack(fallback);

  return (
    <Button
      onClick={goBack}
      startIcon={<ArrowBackIcon />}
      size="small"
      color="inherit"
      variant="text"
      sx={{ px: 1.5, color: 'text.secondary', ...sx }}
    >
      {label}
    </Button>
  );
}
