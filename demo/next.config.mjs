/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app is self-contained; pin tracing to its own dir so Next doesn't
  // pick the parent monorepo lockfile as the workspace root.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
