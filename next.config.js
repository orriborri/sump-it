/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['pg', 'kysely'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
  // Enable standalone output for Docker
  output: 'standalone',
};
