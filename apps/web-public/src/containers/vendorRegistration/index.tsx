import { Box, Container } from '@sinnapi/ui/atoms';
import type { ReferenceOption } from '@/lib/queries';
import RegistrationHero from './organisms/registrationHero';
import RegistrationForm from './organisms/registrationForm';

type Props = { categories: ReferenceOption[] };

/**
 * Vendor registration page. A compact orienting hero over the one-step
 * application form. Service categories are fetched in the route (Server
 * Component) and threaded through so the form island stays lean.
 */
export default function VendorRegistrationContainer({ categories }: Props) {
  return (
    <>
      <RegistrationHero />
      <Box sx={{ pb: { xs: 6, md: 10 } }}>
        <Container maxWidth="md">
          <RegistrationForm categories={categories} />
        </Container>
      </Box>
    </>
  );
}
