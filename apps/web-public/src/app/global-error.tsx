'use client';
import { palette, radius } from '@sinnapi/ui/tokens';

// Root-level fallback that replaces the whole document on a render crash.
// Renders outside the ThemeProvider, so it reads the raw token values directly.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          margin: 0,
        }}
      >
        <main style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ color: palette.light.primary.main }}>Something went wrong</h1>
          <p style={{ color: palette.light.text.secondary }}>
            A critical error occurred. Please reload the page.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 16,
              padding: '10px 20px',
              background: palette.light.primary.main,
              color: palette.light.primary.contrastText,
              border: 0,
              borderRadius: radius.sm,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
