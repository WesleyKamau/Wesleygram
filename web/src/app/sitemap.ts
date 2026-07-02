import type { MetadataRoute } from 'next';
import { getDatasetLastUpdated, getHomeProfiles } from '@/lib/profiles';

// robots.txt has advertised /sitemap.xml since launch — this makes it real.
// Lists the homepage, the search page, and every visible profile.
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wesleygram.com';
  // Anchored to the dataset's own timestamp (not the build clock) so the
  // sitemap only changes when the content actually does.
  const lastModified = getDatasetLastUpdated();

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/search`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    ...getHomeProfiles().map((profile) => ({
      url: `${siteUrl}/${profile.instagram_id}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
