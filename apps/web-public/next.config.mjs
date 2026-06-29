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
