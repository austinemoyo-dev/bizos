const isAndroidBuild = process.env.BUILD_TARGET === 'android';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: isAndroidBuild ? 'export' : 'standalone',
  trailingSlash: isAndroidBuild,
  images: {
    unoptimized: isAndroidBuild,
  },
};

module.exports = nextConfig;
