import { Button, Checkbox, FormControlLabel, SectionCard, Stack, Typography } from '@sinnapi/ui';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { NewsletterContact } from '@/lib/types';
import type { ImportedRecipientsApi } from '../../hooks/useImportedRecipients';
import ContactImportPanel from '../molecules/ContactImportPanel';

type Props = {
  api: ImportedRecipientsApi;
  disabled?: boolean;
  onSaveToBook: (contacts: NewsletterContact[]) => void;
};

/**
 * Uploading a spreadsheet of contacts.
 *
 * ── Parsing, applying and saving are three separate acts ──────────────────
 * Parsing produces counts. Applying those contacts to THIS campaign is a
 * deliberate tick, taken after the operator has read the counts and decided the
 * file is the list they meant. Saving them to an address book is a third,
 * independent decision — a one-off apology mail does not deserve a permanent
 * book, and a book worth keeping is often built before the campaign that will
 * use it. Collapsing any two of them would make the other happen by accident.
 *
 * All three are driven from `useImportedRecipients`; this section is the shape
 * they are shown in.
 */
export default function ImportContactsSection({ api, disabled, onSaveToBook }: Props) {
  return (
    <SectionCard
      title="Import a spreadsheet"
      icon={<UploadFileIcon />}
      subtitle="A list you already hold consent for."
      action={
        api.parsed.length > 0 ? (
          <Button
            size="small"
            variant="text"
            startIcon={<BookmarkAddIcon />}
            disabled={disabled}
            onClick={() => onSaveToBook(api.parsed)}
          >
            Save to address book
          </Button>
        ) : undefined
      }
    >
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Each row needs a name and an email address; rows missing either are reported back rather
          than half-imported.
        </Typography>

        <ContactImportPanel
          parsing={api.parsing}
          error={api.error}
          result={api.result}
          disabled={disabled}
          onFile={api.chooseFile}
          onClear={api.clearFile}
        />

        {api.parsed.length > 0 && (
          <FormControlLabel
            control={
              <Checkbox
                checked={api.applied}
                disabled={disabled}
                onChange={(e) => api.apply(e.target.checked)}
              />
            }
            label={`Include these ${api.parsed.length.toLocaleString()} contacts in this campaign`}
          />
        )}
      </Stack>
    </SectionCard>
  );
}
