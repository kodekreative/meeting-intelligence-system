/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  // Transpile shared packages from monorepo
  transpilePackages: ['shared'],
}

module.exports = nextConfig
