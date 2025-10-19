/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@rainbow-me/rainbowkit'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.example.com',
      },
      {
        protocol: 'https',
        hostname: '**.ipfs.dweb.link',
      },
    ],
  },
  transpilePackages: ['wagmi', '@rainbow-me/rainbowkit'],
};

module.exports = nextConfig;
