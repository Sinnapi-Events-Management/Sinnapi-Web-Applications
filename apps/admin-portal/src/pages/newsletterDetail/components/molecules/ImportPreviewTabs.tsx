import { Tab, Tabs } from '@sinnapi/ui';
import type { ImportPreviewTab } from '../../hooks/useImportPreview';

type Props = {
  value: ImportPreviewTab;
  acceptedCount: number;
  skippedCount: number;
  onChange: (next: ImportPreviewTab) => void;
};

/**
 * The two halves of a parsed file.
 *
 * The skipped tab is rendered even when it is empty, and says so with a zero.
 * A tab that appears only when something went wrong makes its absence
 * invisible — the operator cannot tell "no rows were skipped" from "this
 * importer does not tell me about skipped rows", and only one of those is worth
 * trusting a 400-person send to.
 */
export default function ImportPreviewTabs({ value, acceptedCount, skippedCount, onChange }: Props) {
  return (
    <Tabs
      value={value}
      onChange={(_, next: ImportPreviewTab) => onChange(next)}
      variant="scrollable"
      scrollButtons="auto"
      aria-label="Rows read from this file"
      sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none' } }}
    >
      <Tab value="accepted" label={`Ready to send (${acceptedCount.toLocaleString()})`} />
      <Tab value="skipped" label={`Skipped (${skippedCount.toLocaleString()})`} />
    </Tabs>
  );
}
