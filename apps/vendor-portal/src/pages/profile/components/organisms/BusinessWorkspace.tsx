import { Box } from '@sinnapi/ui';
import { StickySaveBar } from '@sinnapi/ui/forms';
import { ProfileWorkspace, type ProfileSectionItem } from '@sinnapi/ui/profile';
import type { VendorProfileEditModel } from '@/lib/types';
import { useBusinessWorkspace } from '../../hooks/useBusinessWorkspace';
import { BUSINESS_SECTIONS, type BusinessSectionKey } from '../../schema';
import { BUSINESS_SECTION_META } from '../../schema/sectionMeta';
import BusinessSectionPanel from './BusinessSectionPanel';
import ListingSummaryHeader from './ListingSummaryHeader';

type Props = {
  vendorId: string;
  vendor: VendorProfileEditModel;
  onDone: (message: string) => void;
};

/**
 * The Business tab: listing header, section menu, one panel, and the save bar.
 *
 * The panel is a `<form>` so Enter in a field saves, as it did before.
 */
export default function BusinessWorkspace({ vendorId, vendor, onDone }: Props) {
  const ws = useBusinessWorkspace(vendorId, vendor, onDone);

  const items: ProfileSectionItem<BusinessSectionKey>[] = BUSINESS_SECTIONS.map((key) => ({
    value: key,
    label: BUSINESS_SECTION_META[key].label,
    icon: BUSINESS_SECTION_META[key].icon,
    state: ws.stateOf(key),
  }));

  return (
    <>
      <ListingSummaryHeader
        vendor={vendor}
        savedRegionCount={ws.coverage.savedCount}
        onGoTo={ws.setSection}
      />

      <Box
        component="form"
        noValidate
        onSubmit={(event: React.FormEvent) => {
          event.preventDefault();
          void ws.saveBar.onSave();
        }}
      >
        <ProfileWorkspace
          items={items}
          value={ws.section}
          onChange={ws.setSection}
          ariaLabel="Business profile sections"
          idPrefix="business"
          footer={<StickySaveBar {...ws.saveBar} />}
        >
          <BusinessSectionPanel
            section={ws.section}
            vendorId={vendorId}
            vendor={vendor}
            control={ws.control}
            coverage={ws.coverage}
            disabled={ws.fieldsBusy}
            onDone={onDone}
          />
        </ProfileWorkspace>
      </Box>
    </>
  );
}
