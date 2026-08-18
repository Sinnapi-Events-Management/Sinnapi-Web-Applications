import { useRef } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@sinnapi/ui';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { ContactImportResult } from '../../hooks/useContactImport';
import ContactImportSummary from './ContactImportSummary';

type Props = {
  parsing: boolean;
  error: string | null;
  result: ContactImportResult | null;
  disabled?: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
};

/**
 * Spreadsheet upload, with the column requirement stated before the click.
 *
 * The line about needing a name column and an email column is above the button
 * rather than in the error that follows a bad file, because the operator is
 * standing in front of the spreadsheet right now and adding a header takes them
 * ten seconds. Told afterwards, the same sentence costs them a round trip.
 */
export default function ContactImportPanel({
  parsing,
  error,
  result,
  disabled,
  onFile,
  onClear,
}: Props) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <Stack spacing={1.5}>
      <Box>
        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          disabled={disabled || parsing}
          onClick={() => input.current?.click()}
        >
          {parsing ? 'Reading…' : 'Upload a spreadsheet'}
        </Button>
        <input
          ref={input}
          type="file"
          hidden
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            // Reset so re-selecting the same file fires `change` again.
            e.target.value = '';
          }}
        />
      </Box>

      <Typography variant="caption" color="text.secondary">
        .xlsx, .xls or .csv. The file needs a <strong>name</strong> column and an{' '}
        <strong>email</strong> column — “Name” and “Email”, or “First name” and “Last name”
        alongside “Email”. Headers can sit below a title row.
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      {result && <ContactImportSummary result={result} onClear={onClear} />}
    </Stack>
  );
}
