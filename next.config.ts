import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel cache bust: 2024-07-10 21:58
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Remove standalone output to avoid ENOENT errors
  // output: 'standalone',
  // Optimize for Vercel deployment
  trailingSlash: false,
  // External packages for server components
  serverExternalPackages: ['@supabase/supabase-js'],
  webpack: (config: any, options: any) => {
    // Resolve '@' to the 'src' directory
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    // Optimize for production builds
    if (options.isServer) {
      config.externals = config.externals || [];
      config.externals.push('@supabase/supabase-js');
    }
    
    return config;
  },
};

export default nextConfig;
