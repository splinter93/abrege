/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel cache bust: 2024-07-10 21:58
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
