/** @type {import('next').NextConfig} */
const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config) => config;

const cdnHost = process.env.NEXT_PUBLIC_CDN_URL || '';

const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  compress: true,
  swcMinify: true,
  poweredByHeader: false,
  generateEtags: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400,
    domains: ['localhost', ...(cdnHost ? [new URL(cdnHost).hostname] : [])],
    remotePatterns: cdnHost ? [
      {
        protocol: 'https',
        hostname: new URL(cdnHost).hostname,
        pathname: '/**',
      },
    ] : [],
  },
  experimental: {
    optimizeCss: false,
    scrollRestoration: true,
    optimizePackageImports: [
      'lucide-react',
      'zustand',
      'date-fns',
      '@sentry/nextjs',
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
      ],
    },
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
    {
      source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
      locale: false,
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/:all*(woff|woff2|ttf|eot)',
      locale: false,
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/manifest.json',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=86400' },
      ],
    },
    {
      source: '/_next/static/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ],
};

module.exports = withBundleAnalyzer(nextConfig);
