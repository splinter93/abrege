import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  trailingSlash: false,
  serverExternalPackages: ['@supabase/supabase-js', 'puppeteer', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth'],
  webpack: (config: any, options: any) => {
    // Resolve '@' to the 'src' directory
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    // Optimize for production builds
    if (options.isServer) {
      config.externals = config.externals || [];
      config.externals.push('@supabase/supabase-js', 'puppeteer', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth');
    }
    
    return config;
  },
};

export default nextConfig;
