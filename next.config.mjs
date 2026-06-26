/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-parse usa APIs Node e não pode ir para o bundle/edge.
  // Next 14: experimental.serverComponentsExternalPackages
  // (equivale a serverExternalPackages estável no Next 15).
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },
}

export default nextConfig
