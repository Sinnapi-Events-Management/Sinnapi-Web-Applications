import { useRef } from 'react';
import { Alert, Box, Button, Chip, Stack, Typography } from '@sinnapi/ui';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { ImportResult } from '../../hooks/useEmailImport';

type Props = {
  parsing: boolean;
  error: string | null;
  result: ImportResult | null;
  disabled?: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
};

/**
 * Spreadsheet upload with a validation summary.
 *
 * The summary is the reason this is a panel and not just a button. Uploading a
 * list is the one action here whose result an operator cannot verify by looking
 * — nobody eyeballs 400 rows — so the counts that come back (accepted, rejected,
 * duplicate) are the only evidence the file was read the way they expected, and
 * a silent "imported!" would hide exactly the case that matters.
 */
export default function EmailImportPanel({
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
          {parsing ? 'Reading…' : 'Upload a list'}
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
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5 }}>
          .xlsx, .xls or .csv — every column is scanned for addresses.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <Alert
          severity={result.emails.length ? 'success' : 'warning'}
          action={
            <Button size="small" color="inherit" onClick={onClear}>
              Remove
            </Button>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {result.fileName}
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
            <Chip size="small" color="success" label={`${result.emails.length} addresses`} />
            {result.duplicates > 0 && (
              <Chip size="small" label={`${result.duplicates} duplicates merged`} />
            )}
            {result.rejected.length > 0 && (
              <Chip size="small" color="warning" label={`${result.rejected.length} skipped`} />
            )}
          </Stack>
          {result.rejected.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Skipped:{' '}
              {result.rejected
                .map((r) => r.value)
                .slice(0, 8)
                .join(', ')}
              {result.rejected.length > 8 ? ' …' : ''}
            </Typography>
          )}
        </Alert>
      )}
    </Stack>
  );
}
