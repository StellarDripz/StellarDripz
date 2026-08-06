/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // @stellar/stellar-sdk depends on sodium-native which is a native module.
    // Ignore it on the client side; the SDK handles it gracefully.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        sodium: false,
        'sodium-native': false,
      };
    }
    // Suppress require-addon warnings from stellar-sdk
    config.module = config.module || {};
    config.module.exprContextCritical = false;
    return config;
  },
};

module.exports = nextConfig;
// Next.js configuration with Stellar SDK externals for browser compatibility

