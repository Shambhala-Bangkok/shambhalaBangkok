/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['cb15-2001-fb1-3c-5077-74ea-5474-ca3c-8ee3.ngrok-free.app'],
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'hhbissyjmgwqdkkkecpk.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://plausible.io https://translate.google.com https://translate.googleapis.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://plausible.io https://translate.googleapis.com",
              "frame-src 'self' https://www.google.com https://maps.google.com",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Legacy URL redirects from old site
      { source: '/programs-and-events', destination: '/events', permanent: true },
      { source: '/what-we-offer', destination: '/learn', permanent: true },
      { source: '/shambhala-vision', destination: '/about/vision', permanent: true },
      { source: '/lineage', destination: '/about/lineage', permanent: true },
      { source: '/in-the-world', destination: '/about/shambhala', permanent: true },
      { source: '/bangkok-shambhala-meditation-centre', destination: '/location', permanent: true },
    ];
  },
};

module.exports = nextConfig;
