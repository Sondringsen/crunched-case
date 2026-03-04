/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy /api calls to the FastAPI backend during development.
  // In production, configure your reverse proxy (nginx, etc.) instead.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
