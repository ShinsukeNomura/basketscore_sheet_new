import type { MetadataRoute } from 'next';
import { SITE_URL, LOCALES } from '@/lib/seo';

// 公開ページのみ（認証不要）
const PUBLIC_PATHS: { path: string; priority: number; changeFreq: MetadataRoute.Sitemap[0]['changeFrequency'] }[] = [
  { path: '/login',   priority: 0.9, changeFreq: 'monthly'  },
  { path: '/guide',   priority: 1.0, changeFreq: 'monthly'  },
  { path: '/privacy', priority: 0.3, changeFreq: 'yearly'   },
  { path: '/terms',   priority: 0.3, changeFreq: 'yearly'   },
  { path: '/legal',   priority: 0.3, changeFreq: 'yearly'   },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const { path, priority, changeFreq } of PUBLIC_PATHS) {
      entries.push({
        url:             `${SITE_URL}/${locale}${path}`,
        lastModified:    now,
        changeFrequency: changeFreq,
        priority,
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => [l, `${SITE_URL}/${l}${path}`])
          ),
        },
      });
    }
  }

  return entries;
}
