import { escrowPolicy } from '@sinnapi/content';
import { LegalContent } from '@sinnapi/ui/organisms';
import LegalHero from '@/components/organisms/legalHero';
import { escrowPolicyHero } from './data/hero';

// Escrow policy page: editorial hero owns the title + metadata, then the shared
// LegalContent renders the document body (header suppressed to avoid duplication).
export default function EscrowPolicyContainer() {
  return (
    <>
      <LegalHero document={escrowPolicy} {...escrowPolicyHero} />
      <LegalContent document={escrowPolicy} hideHeader />
    </>
  );
}
