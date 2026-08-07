import { useState } from 'react';
import { ColorModeProvider } from '@sinnapi/ui/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/lib/theme';
import { AuthProvider } from '@/auth/AuthProvider';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
      }),
  );
  // ColorModeProvider renders CssBaseline itself and applies the persisted
  // light/dark choice via CSS variables before paint (no flash of wrong theme).
  return (
    <ColorModeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </ColorModeProvider>
  );
}
