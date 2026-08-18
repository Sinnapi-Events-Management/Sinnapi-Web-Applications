import { Button, Checkbox, FormControlLabel, SectionCard, Stack, Typography } from '@sinnapi/ui';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { NewsletterContact } from '@/lib/types';
import type { ImportedRecipientsApi } from '../../hooks/useImportedRecipients';
import ContactImportPanel from '../molecules/ContactImportPanel';
import ContactImportPreview from './ContactImportPreview';

type Props = {
  api: ImportedRecipientsApi;
  disabled?: boolean;
  onSaveToBook: (contacts: NewsletterContact[]) => void;
};

/**
 * Uploading a spreadsheet of contacts.
 *
 * ── Parsing, reading, applying and saving are four separate acts ──────────
 * Parsing produces rows. Reading them is the preview, where the operator sees
 * the two columns that survived and unticks anybody who should not be on this
 * particular send. Applying those contacts to THIS campaign is a deliberate
 * tick, taken after that reading. Saving them to an address book is a fourth,
 * independent decision — a one-off apology mail does not deserve a permanent
 * book, and a book worth keeping is often built before the campaign that will
 * use it. Collapsing any two of them would make the other happen by accident.
 *
 * All four are driven from `useImportedRecipients`; this section is the shape
 * they are shown in, and deliberately holds no state of its own — a switch to
 * another recipient source unmounts it, and an upload has to survive that.
 *
 * ── What "save to address book" saves ─────────────────────────────────────
 * The ticked rows, not the whole file. Unticking somebody is the operator
 * saying this row is not a contact they want; writing it into a permanent book
 * anyway would make the exclusion last exactly as long as this page does.
 */
export default function ImportContactsSection({ api, disabled, onSaveToBook }: Props) {
  return (
    <SectionCard
      title="Import a spreadsheet"
      icon={<UploadFileIcon />}
      subtitle="A list you already hold consent for."
      action={
        api.selectedCount > 0 ? (
          <Button
            size="small"
            variant="text"
            startIcon={<BookmarkAddIcon />}
            disabled={disabled}
            onClick={() => onSaveToBook(api.selectedContacts)}
          >
            Save to address book
          </Button>
        ) : undefined
      }
    >
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Each row needs a name and an email address; every other column is dropped, and rows
          missing either are reported back rather than half-imported.
        </Typography>

        <ContactImportPanel
          parsing={api.parsing}
          error={api.error}
          result={api.result}
          disabled={disabled}
          onFile={api.chooseFile}
          onClear={api.clearFile}
        />

        <ContactImportPreview api={api} disabled={disabled} />

        {api.acceptedCount > 0 && (
          <FormControlLabel
            control={
              <Checkbox
                checked={api.applied}
                disabled={disabled || api.selectedCount === 0}
                onChange={(e) => api.apply(e.target.checked)}
              />
            }
            label={
              api.selectedCount > 0
                ? `Include these ${api.selectedCount.toLocaleString()} contacts in this campaign`
                : 'Tick at least one row above to include this file'
            }
          />
        )}
      </Stack>
    </SectionCard>
  );
}
