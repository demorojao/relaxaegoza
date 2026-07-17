import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    instantNavigationDevToolsToggle: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Link',
            value: '</.well-known/api-catalog>; rel="api-catalog", </docs/api>; rel="service-doc", </openapi.json>; rel="service-desc", </auth.md>; rel="describedby", </.well-known/agent-skills/index.json>; rel="describedby"',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
