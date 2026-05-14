const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
const apiOrigin = (() => { try { return new URL(apiUrl).origin; } catch { return apiUrl; } })();

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Google Fonts — cache forever
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-static',
        expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    // API — NetworkFirst with tighter timeout so offline fallback kicks in fast
    {
      urlPattern: new RegExp(`^${apiOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // Next.js static assets — StaleWhileRevalidate (fast + fresh)
    {
      urlPattern: /\/_next\/static\/.*/,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'next-static' },
    },
    // PWA icons & manifest
    {
      urlPattern: /\/icons\/.*\.png$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'pwa-assets',
        expiration: { maxEntries: 10, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
  ],
});

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',  value: 'on' },
  { key: 'X-Frame-Options',         value: 'DENY' },
  { key: 'X-Content-Type-Options',  value: 'nosniff' },
  { key: 'X-XSS-Protection',        value: '1; mode=block' },
  { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `connect-src 'self' ${apiOrigin} https://api.groq.com`,
      "img-src 'self' data: blob:",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

module.exports = withPWA(nextConfig);
