'use client';
import { useState } from 'react';
import { ColorModeProvider } from '@sinnapi/ui/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { theme } from '@/lib/theme';
import { COLOR_MODE_STORAGE_KEY } from '@/lib/config/site';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <AppRouterCacheProvider options={{ key: 'mui' }}>
      <ColorModeProvider theme={theme} modeStorageKey={COLOR_MODE_STORAGE_KEY}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ColorModeProvider>
    </AppRouterCacheProvider>
  );
}
