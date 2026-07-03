/** @type {import('next').NextConfig} */
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname;
  } catch {
    return undefined;
  }
})();

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sinnapi/content', '@sinnapi/ui', '@sinnapi/utils'],
  modularizeImports: {
    '@mui/icons-material': { transform: '@mui/icons-material/{{member}}' },
  },
  experimental: {
    // Barrel-file optimization: rewrites `import { Box } from '@sinnapi/ui'`
    // into direct deep imports at compile time, so a single named import no
    // longer drags the entire design system (+ its MUI deps) into the module
    // graph. This is the primary lever against the ~24k-module dev compiles.
    // @mui/material is already optimized by Next's default list; the local
    // first-party barrels are added explicitly here.
    optimizePackageImports: [
      '@sinnapi/ui',
      '@sinnapi/ui/atoms',
      '@sinnapi/ui/molecules',
      '@sinnapi/ui/organisms',
      '@mui/material',
      '@mui/icons-material',
    ],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Decorative category-tile photography is still sourced from Unsplash; run it
      // through next/image so those tiles also get AVIF/WebP + responsive sizing.
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      ...(supabaseHost
        ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
        : []),
    ],
  },
  async redirects() {
    // Mission, Vision and Our Story were consolidated into sections on /about.
    // Permanently redirect the legacy standalone routes to the matching anchors
    // so existing links and search-engine results keep resolving.
    return [
      { source: '/mission', destination: '/about#mission', permanent: true },
      { source: '/vision', destination: '/about#vision', permanent: true },
      { source: '/story', destination: '/about#story', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
