import { Stack, Divider } from '@sinnapi/ui';
import CategoryIcon from '@mui/icons-material/Category';
import PublicIcon from '@mui/icons-material/Public';
import SectionCard from '@/components/ui/SectionCard';
import ChipCloud, { type ChipItem } from '@/components/ui/ChipCloud';
import { titleize } from '@/lib/config';
import type { IntakeDetailModel } from '@/lib/types';

/** Services offered + regions served, rendered as labelled chip clouds. */
export default function ServicesSection({ a }: { a: IntakeDetailModel }) {
  const serviceItems: ChipItem[] = [];
  if (a.primary_category_key) {
    serviceItems.push({
      key: a.primary_category_key,
      label: titleize(a.primary_category_key),
      highlight: true,
    });
  }
  (a.service_category_keys ?? [])
    .filter((k) => k !== a.primary_category_key)
    .forEach((k) => serviceItems.push({ key: k, label: titleize(k) }));

  const regionItems: ChipItem[] = (a.service_region_keys ?? []).map((k) => ({
    key: k,
    label: titleize(k),
  }));

  if (serviceItems.length === 0 && regionItems.length === 0) return null;

  return (
    <SectionCard title="Services & coverage" icon={<CategoryIcon />} accent="secondary">
      <Stack spacing={2.5} divider={<Divider flexItem />}>
        <ChipCloud title="Service categories" items={serviceItems} icon={<CategoryIcon />} />
        <ChipCloud title="Service regions" items={regionItems} icon={<PublicIcon />} />
      </Stack>
    </SectionCard>
  );
}
