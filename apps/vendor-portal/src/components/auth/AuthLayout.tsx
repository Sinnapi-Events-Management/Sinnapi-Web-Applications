import { Grid } from '@sinnapi/ui';
import AuthShowcase from './AuthShowcase';
import AuthFormPanel from './AuthFormPanel';

/**
 * Split-screen auth shell: brand showcase (left, md+) and the form column
 * (right). Shared by every auth page so sign-in, forgot-, reset- and
 * change-password stay consistent — and matching the admin and client portals,
 * which run the same two-column split at the same breakpoints.
 */
export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Grid container sx={{ minHeight: '100dvh', bgcolor: 'background.paper' }}>
      <Grid item md={6} lg={7} sx={{ display: { xs: 'none', md: 'block' } }}>
        <AuthShowcase />
      </Grid>

      <Grid item xs={12} md={6} lg={5}>
        <AuthFormPanel title={title} subtitle={subtitle}>
          {children}
        </AuthFormPanel>
      </Grid>
    </Grid>
  );
}
