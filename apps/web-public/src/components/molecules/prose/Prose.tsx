import { Container, Typography, Box } from '@sinnapi/ui';
import { PageHeader } from '@/components/molecules/sectionHeading';

// Lightweight prose layout for static marketing / legal pages.
export default function Prose({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <Container sx={{ py: { xs: 4, md: 6 }, maxWidth: 820 }}>
        <Box
          sx={{
            '& p': { color: 'text.secondary', lineHeight: 1.7, mb: 2 },
            '& h2': { mt: 4, mb: 1.5 },
          }}
        >
          {children}
        </Box>
      </Container>
    </>
  );
}
