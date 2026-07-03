import { escrowPolicy } from '@sinnapi/content';
import { LegalContent } from '@sinnapi/ui/organisms';

// Escrow policy page: renders the escrow policy legal document.
export default function EscrowPolicyContainer() {
  return <LegalContent document={escrowPolicy} />;
}
