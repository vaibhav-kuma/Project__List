import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://ytclone.example.com', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: 'https://ytclone.example.com/feed/trending', lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: 'https://ytclone.example.com/feed/subscriptions', lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
    { url: 'https://ytclone.example.com/login', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: 'https://ytclone.example.com/register', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];
}
