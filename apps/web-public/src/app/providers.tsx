'use client';
import { useState } from 'react';
import { ColorModeProvider } from '@sinnapi/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { theme } from '@/lib/theme';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <AppRouterCacheProvider options={{ key: 'mui' }}>
      <ColorModeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ColorModeProvider>
    </AppRouterCacheProvider>
  );
}
