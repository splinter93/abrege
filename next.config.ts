import { withSentryConfig } from '@sentry/nextjs';
import path from 'path';
import withPWA from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  typescript: {
    tsconfigPath: './tsconfig.build.json'
  },
  // ✅ Activer l'instrumentation pour Sentry
  experimental: {
    instrumentationHook: true,
  },
  serverExternalPackages: [
    '@supabase/supabase-js',
    'markdown-it',
    'markdown-it-anchor',
    'markdown-it-task-lists'
  ],
  webpack: (config: any, options: any) => {
    // Resolve '@' to the 'src' directory
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    // Optimize for production builds
    if (options.isServer) {
      config.externals = config.externals || [];
      config.externals.push(
        '@supabase/supabase-js',
        'markdown-it',
        'markdown-it-anchor',
        'markdown-it-task-lists'
      );
    }
    
    return config;
  },
};

/**
 * PWA Configuration
 * - Service Worker pour static assets uniquement
 * - Cache-first pour images/fonts, Network-only pour API
 * - Désactivé en dev pour éviter cache issues
 */
const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
          }
        }
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 7 * 24 * 60 * 60 // 7 jours
          }
        }
      },
      {
        urlPattern: /\/api\/.*/i,
        handler: 'NetworkOnly'
      }
    ]
  }
});

export default withSentryConfig(pwaConfig(nextConfig), {
 // For all available options, see:
 // https://www.npmjs.com/package/@sentry/webpack-plugin#options

 org: "scrivia",

 project: "javascript-nextjs",

 // Only print logs for uploading source maps in CI
 silent: !process.env.CI,

 // For all available options, see:
 // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

 // Upload a larger set of source maps for prettier stack traces (increases build time)
 widenClientFileUpload: true,

 // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
 // This can increase your server load as well as your hosting bill.
 // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
 // side errors will fail.
 tunnelRoute: "/monitoring",

 webpack: {
   // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
   // See the following for more information:
   // https://docs.sentry.io/product/crons/
   // https://vercel.com/docs/cron-jobs
   automaticVercelMonitors: true,

   // Tree-shaking options for reducing bundle size
   treeshake: {
     // Automatically tree-shake Sentry logger statements to reduce bundle size
     removeDebugLogging: true,
   },
 }
});
