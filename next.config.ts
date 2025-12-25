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

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drupal-nextjs.ddev.site',
      },
      // Allow the Drupal base URL from environment variable
      ...(process.env.NEXT_PUBLIC_DRUPAL_BASE_URL
        ? [
            {
              protocol: 'https' as const,
              hostname: new URL(process.env.NEXT_PUBLIC_DRUPAL_BASE_URL).hostname,
            },
          ]
        : []),
    ],
    // In development with ddev, use unoptimized images to avoid private IP restrictions
    // Next.js Image Optimization API blocks requests to private IPs (127.0.0.1) for security
    // This is safe for local development only
    ...(process.env.NODE_ENV === 'development' && {
      unoptimized: true,
    }),
  },

};

export default nextConfig;
