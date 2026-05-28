const path = require('path');

const isAndroidBuild = process.env.BUILD_TARGET === 'android';

// Native-only Capacitor plugins that must not be bundled for web/Vercel builds.
// All usage is guarded by Capacitor.isNativePlatform(), so the stub is never invoked at runtime.
const NATIVE_PLUGIN_STUB = path.resolve(__dirname, 'src/lib/capacitor/stubs/native-plugin.js');
const NATIVE_ONLY_PACKAGES = [
  '@aparajita/capacitor-biometric-auth',
  '@capacitor/app',
  '@capacitor/local-notifications',
  '@capacitor/push-notifications',
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: isAndroidBuild ? 'export' : 'standalone',
  trailingSlash: isAndroidBuild,
  images: {
    unoptimized: isAndroidBuild,
  },
  webpack(config) {
    if (!isAndroidBuild) {
      const aliases = Object.fromEntries(
        NATIVE_ONLY_PACKAGES.map((pkg) => [pkg, NATIVE_PLUGIN_STUB])
      );
      config.resolve.alias = { ...config.resolve.alias, ...aliases };
    }
    return config;
  },
};

module.exports = nextConfig;
