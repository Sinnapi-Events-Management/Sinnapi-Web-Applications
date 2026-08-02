import { Grid } from '@sinnapi/ui';
import AuthShowcase from './AuthShowcase';
import AuthFormPanel from './AuthFormPanel';

// Split-screen auth shell: marketing showcase (left, md+) and the form column
// (right). Shared by every auth page so sign-in, sign-up, and reset-password
// stay consistent.
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
    <Grid container sx={{ minHeight: '100dvh' }}>
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
