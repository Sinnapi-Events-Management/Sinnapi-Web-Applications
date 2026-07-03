import NextLink from 'next/link';
import { Box, Container, Grid, Stack, Typography, Link } from '@sinnapi/ui/atoms';
import AuthBrandPanel, { type AuthBrandPanelProps } from '@/components/molecules/authBrandPanel';
import RoleCard, { type RoleCardProps } from '@/components/molecules/roleCard';

export type AuthScreenProps = {
  /** Copy + imagery for the branded left panel. */
  panel: AuthBrandPanelProps;
  heading: string;
  subheading: string;
  /** The route choices (client / vendor …) shown as cards. */
  roles: RoleCardProps[];
  /** Cross-link to the opposite auth page. */
  altAction: { prompt: string; label: string; href: string };
};

/**
 * Split-screen auth shell shared by the sign-in and sign-up pages.
 *
 * Left: the branded AuthBrandPanel (hidden on mobile — a photo half-screen adds
 * weight without value on a phone, where the action should lead). Right: heading,
 * a responsive grid of RoleCards, and the cross-page link. Purely presentational
 * and server-rendered; each page supplies its own content via props/data.
 */
export default function AuthScreen({
  panel,
  heading,
  subheading,
  roles,
  altAction,
}: AuthScreenProps) {
  return (
    <Box sx={{ py: { xs: 5, md: 9 } }}>
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 4, md: 6 }} alignItems="stretch">
          {/* Branded panel — carries the visual weight on md+ screens. */}
          <Grid item xs={12} md={6} sx={{ display: { xs: 'none', md: 'block' } }}>
            <AuthBrandPanel {...panel} />
          </Grid>

          {/* Action column — vertically centred against the panel. */}
          <Grid item xs={12} md={6}>
            <Stack sx={{ height: '100%', justifyContent: 'center', maxWidth: 520, mx: 'auto' }}>
              <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.5rem' } }}>
                {heading}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1.5 }}>
                {subheading}
              </Typography>

              <Grid container spacing={2.5} sx={{ mt: 1 }}>
                {roles.map((role) => (
                  <Grid item xs={12} sm={6} key={role.title}>
                    <RoleCard {...role} />
                  </Grid>
                ))}
              </Grid>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
                {altAction.prompt}{' '}
                <Link component={NextLink} href={altAction.href} sx={{ fontWeight: 700 }}>
                  {altAction.label}
                </Link>
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
