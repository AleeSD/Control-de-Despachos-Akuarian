/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // exceljs y xlsx operan solo en el servidor (API routes).
  // Sin esto Next.js intenta bundlearlos para el cliente y falla (usan Node built-ins).
  experimental: {
    serverComponentsExternalPackages: ["exceljs", "xlsx"],
  },
};

export default nextConfig;
