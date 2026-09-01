import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@sinnapi/ui';
import { canArchiveService } from '../../schema';
import type { ServiceRow } from '../../hooks/useServices';

type Props = {
  /** The service the vendor asked to archive, or null when nothing is pending. */
  service: ServiceRow | null;
  pricingLoading: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * The archive step — and, more often, the reason it is refused.
 *
 * ARCHIVING IS BLOCKED WHILE PUBLISHED PACKAGES HANG OFF THE SERVICE
 * A published package is a priced offer a client can see right now. Archiving
 * the service it is filed under leaves that offer live on the profile under a
 * catalogue line the vendor has retired — an inconsistency neither party can
 * see from where they are standing, and one the vendor would discover through
 * a client asking about a service they thought they had withdrawn.
 *
 * So the dialog refuses and points at the screen that can fix it, rather than
 * greying out a menu item and leaving the vendor to work out why. Drafts do
 * not block anything: nothing about them is on a client's screen, and because
 * `trg_soft_delete` means the row is never physically removed, the
 * `on delete set null` on `quote_templates.vendor_service_id` never fires — a
 * draft keeps its link and comes back intact when the service is restored.
 *
 * The third state is the honest one: until the packages read lands, this
 * cannot know whether there is anything to block on, so it says it is checking
 * and refuses to act. Defaulting to "allowed" for a second would let a fast
 * vendor archive past the rule.
 */
export default function ServiceArchiveDialog({
  service,
  pricingLoading,
  busy,
  onConfirm,
  onCancel,
}: Props) {
  const navigate = useNavigate();
  const verdict = service
    ? canArchiveService(service.pricing, pricingLoading)
    : { canArchive: true as const };

  if (service && !verdict.canArchive && verdict.reason === 'published-packages') {
    const n = verdict.publishedCount;
    return (
      <ConfirmDialog
        open
        title={`“${service.title}” still has ${n} published ${n === 1 ? 'package' : 'packages'}`}
        description={`Clients can buy ${n === 1 ? 'it' : 'them'} right now, so this service cannot leave your catalogue yet. Unpublish ${n === 1 ? 'that package' : 'those packages'} — or move ${n === 1 ? 'it' : 'them'} to another service — and archive this again.`}
        confirmLabel="Go to packages"
        cancelLabel="Not now"
        onConfirm={() => navigate('/packages')}
        onCancel={onCancel}
      />
    );
  }

  return (
    <ConfirmDialog
      open={service !== null}
      title={`Archive ${service ? `“${service.title}”` : 'this service'}?`}
      description={
        pricingLoading
          ? 'Checking what is attached to this service…'
          : 'It leaves your catalogue and your public profile. Its draft packages, its past bookings and everything quoted from it are untouched, and you can restore it from the Archived tab whenever you like.'
      }
      confirmLabel="Archive service"
      destructive
      loading={busy || pricingLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
