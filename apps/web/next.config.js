/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@repo/db', '@repo/auth', '@repo/shared', '@repo/queue', '@repo/integrations'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, 'ioredis'];
    }
    return config;
  },
}

module.exports = nextConfig
