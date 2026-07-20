import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://relaxegoza.com.br';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/',
        '/client-dashboard/',
        '/api/',
        '/dashboard-interno-moderacao-aura/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
