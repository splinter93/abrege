import path from 'path';
import withPWA from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack désactivé pour conserver la config webpack existante
  turbopack: false,
  trailingSlash: false,
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

export default pwaConfig(nextConfig);
