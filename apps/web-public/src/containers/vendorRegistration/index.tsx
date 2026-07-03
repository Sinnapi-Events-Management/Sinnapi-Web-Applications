import { Box, Container } from '@sinnapi/ui';
import type { ReferenceOption } from '@/lib/queries';
import RegistrationHero from './organisms/registrationHero';
import RegistrationForm from './organisms/registrationForm';

type Props = { categories: ReferenceOption[]; regions: ReferenceOption[] };

/**
 * Vendor registration page. A compact orienting hero over the multi-step
 * application form. Reference data is fetched in the route (Server Component)
 * and threaded through so the form island stays lean.
 */
export default function VendorRegistrationContainer({ categories, regions }: Props) {
  return (
    <>
      <RegistrationHero />
      <Box sx={{ pb: { xs: 6, md: 10 } }}>
        <Container maxWidth="md">
          <RegistrationForm categories={categories} regions={regions} />
        </Container>
      </Box>
    </>
  );
}
