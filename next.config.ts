import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable source maps for debugging
  productionBrowserSourceMaps: false, // Set to true if you want source maps in production
  webpack(config, { dev, isServer }) {
    // Enable source maps in development
    if (dev && !isServer) {
      config.devtool = "eval-source-map";
    }
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },

    turbopack: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },

};

export default nextConfig;
