import type { Control } from 'react-hook-form';
import type { VendorProfileEditModel } from '@/lib/types';
import type { useServiceCoverage } from '@/hooks/useServiceCoverage';
import type { BusinessSectionKey, VendorProfileFormValues } from '../../schema';
import { BUSINESS_SECTION_META } from '../../schema/sectionMeta';
import SectionPanel from '../molecules/SectionPanel';
import BusinessIdentityFields from '../molecules/BusinessIdentityFields';
import BusinessOperationsFields from '../molecules/BusinessOperationsFields';
import BusinessPricingFields from '../molecules/BusinessPricingFields';
import OnlinePresenceFields from '../molecules/OnlinePresenceFields';
import CoverageFields from '../molecules/CoverageFields';
import BusinessLogoPanel from './BusinessLogoPanel';
import VerificationFacts from './VerificationFacts';

type Props = {
  section: BusinessSectionKey;
  vendorId: string;
  vendor: VendorProfileEditModel;
  control: Control<VendorProfileFormValues>;
  coverage: ReturnType<typeof useServiceCoverage>;
  disabled: boolean;
  onDone: (message: string) => void;
};

/** The open Business section, inside its titled card. */
export default function BusinessSectionPanel({
  section,
  vendorId,
  vendor,
  control,
  coverage,
  disabled,
  onDone,
}: Props) {
  return (
    <SectionPanel meta={BUSINESS_SECTION_META[section]}>
      {section === 'basics' && <BusinessIdentityFields control={control} disabled={disabled} />}
      {section === 'operations' && (
        <BusinessOperationsFields control={control} disabled={disabled} />
      )}
      {section === 'pricing' && <BusinessPricingFields control={control} disabled={disabled} />}
      {section === 'presence' && <OnlinePresenceFields control={control} disabled={disabled} />}
      {section === 'coverage' && (
        <CoverageFields
          regions={coverage.regions}
          selected={coverage.selected}
          onToggle={coverage.toggle}
          isLoading={coverage.isLoading}
          error={coverage.error}
          isUncovered={coverage.isUncovered}
          disabled={disabled || coverage.busy}
        />
      )}
      {section === 'logo' && (
        <BusinessLogoPanel
          vendorId={vendorId}
          businessName={vendor.business_name}
          logoUrl={vendor.primary_image_url}
          onDone={onDone}
        />
      )}
      {section === 'verification' && <VerificationFacts vendorId={vendorId} vendor={vendor} />}
    </SectionPanel>
  );
}
