import StatusTabs from '@/components/ui/StatusTabs';
import { REPORT_CATEGORIES, type ReportCategory } from '../../schema';

type Props = {
  value: ReportCategory;
  onChange: (next: ReportCategory) => void;
};

/**
 * Top-level report category navigation. Reuses the shared `StatusTabs` (without
 * count badges) so the reporting nav matches every other admin queue's tabs.
 */
export default function ReportTabs({ value, onChange }: Props) {
  return (
    <StatusTabs
      options={REPORT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
      value={value}
      onChange={onChange}
      ariaLabel="Switch report category"
    />
  );
}
