import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/ja/login',  '/en/login',  '/zh/login',  '/zh-TW/login',
          '/ja/guide',  '/en/guide',  '/zh/guide',  '/zh-TW/guide',
          '/ja/privacy','/en/privacy','/zh/privacy','/zh-TW/privacy',
          '/ja/terms',  '/en/terms',  '/zh/terms',  '/zh-TW/terms',
          '/ja/legal',  '/en/legal',  '/zh/legal',  '/zh-TW/legal',
        ],
        disallow: [
          // 認証必須ページはクロール禁止
          '/ja/',  '/en/',  '/zh/',  '/zh-TW/',
          '/*/game/',
          '/*/analysis',
          '/*/premium/',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host:    SITE_URL,
  };
}
