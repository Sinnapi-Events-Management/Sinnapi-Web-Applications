'use client';
// Root-level fallback that replaces the whole document on a render crash.
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
          <h1 style={{ color: '#07504D' }}>Something went wrong</h1>
          <p style={{ color: '#5C5468' }}>A critical error occurred. Please reload the page.</p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 16,
              padding: '10px 20px',
              background: '#07504D',
              color: '#fff',
              border: 0,
              borderRadius: 8,
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
