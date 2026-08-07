/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // @stellar/stellar-sdk depends on sodium-native which is a native module.
    // Ignore it on the client side; the SDK handles it gracefully.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        sodium: false,
        'sodium-native': false,
        'require-addon': false,
        'fs': false,
        'path': false,
        'crypto': false,
      };
    }
    // Suppress webpack warnings from Stellar SDK native addon detection
    config.module = config.module || {};
    config.module.exprContextCritical = false;
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /require-addon/ },
      { module: /sodium-native/ },
    ];
    return config;
  },
};

module.exports = nextConfig;
// Next.js configuration with Stellar SDK externals for browser compatibility

