import { Alert, FileUpload, Stack } from '@sinnapi/ui';
import { DOC_ACCEPT, DOC_MAX_MB, type DocField } from '../../hooks/useVerificationDocs';
import type { UploadedFile } from '@sinnapi/ui';

type Props = {
  items: Record<DocField, UploadedFile[]>;
  busy: boolean;
  error: string | null;
  onSelect: (field: DocField, files: File[]) => void;
  onRemove: (field: DocField) => void;
};

/** The ID we require and the proof of work we do not. */
export default function VerificationDocsFields({ items, busy, error, onSelect, onRemove }: Props) {
  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}

      <FileUpload
        label="National ID *"
        hint="PNG, JPG or PDF up to 20MB · only our review team can open it"
        accept={DOC_ACCEPT}
        maxSizeMb={DOC_MAX_MB}
        disabled={busy}
        value={items.national_id_path}
        onSelect={(files) => onSelect('national_id_path', files)}
        onRemove={() => onRemove('national_id_path')}
      />

      <FileUpload
        label="Proof of work (optional)"
        hint="A PDF portfolio or reference letter · up to 20MB"
        accept="application/pdf"
        maxSizeMb={DOC_MAX_MB}
        disabled={busy}
        value={items.proof_of_work_path}
        onSelect={(files) => onSelect('proof_of_work_path', files)}
        onRemove={() => onRemove('proof_of_work_path')}
      />
    </Stack>
  );
}
