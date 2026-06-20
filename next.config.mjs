/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: import.meta.dirname,
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
