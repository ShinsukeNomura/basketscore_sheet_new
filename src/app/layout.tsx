import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { headers } from 'next/headers';
import { SITE_URL, SITE_NAME, OG_IMAGE } from '@/lib/seo';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:  `${SITE_NAME} — バスケットボール スコア記録アプリ`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'リアルタイムでバスケットボールの試合スコアとスタッツを記録するPWAアプリ。2PT/3PT/FT・リバウンド・アシスト・スティールをワンタップ記録。AI分析・PDF出力対応。',
  keywords: [
    'バスケットボール', 'スコア記録', 'スタッツ', 'バスケスコア',
    'basketball score', 'basketball stats', 'basketball app',
    'コーチ', 'ランニングスコア', 'AI分析',
  ],
  authors: [{ name: 'Medirealize', url: SITE_URL }],
  creator: 'Medirealize',
  publisher: 'Medirealize',
  manifest: '/manifest.json',
  robots: { index: false, follow: false }, // デフォルトnoindex（各公開ページで上書き）
  openGraph: {
    siteName: SITE_NAME,
    type:     'website',
    images:   [{ url: OG_IMAGE, width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: {
    card:   'summary',
    images: [OG_IMAGE],
  },
  appleWebApp: {
    capable:         true,
    statusBarStyle:  'black-translucent',
    title:           'BScore',
  },
  icons: {
    icon:  [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width:          'device-width',
  initialScale:   1,
  maximumScale:   1,
  userScalable:   false,
  viewportFit:    'cover',
  themeColor:     '#0a0a0a',
};

// JSON-LD: SoftwareApplication スキーマ
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type':               'SoftwareApplication',
      '@id':                 `${SITE_URL}/#app`,
      name:                  SITE_NAME,
      alternateName:         'BScore',
      url:                   SITE_URL,
      description:           'リアルタイムでバスケットボールの試合スコアとスタッツを記録するPWAアプリ。2PT/3PT/FT・リバウンド・アシスト・スティールをワンタップ記録。AI分析・PDF出力対応。',
      applicationCategory:   'SportsApplication',
      operatingSystem:       'iOS, Android, Web',
      inLanguage:            ['ja', 'en', 'zh', 'zh-TW'],
      offers: [
        { '@type': 'Offer', name: '無料プラン',       price: '0',   priceCurrency: 'JPY' },
        { '@type': 'Offer', name: 'プレミアムプラン', price: '680', priceCurrency: 'JPY', billingIncrement: 'monthly' },
      ],
      author: {
        '@type': 'Organization',
        '@id':   `${SITE_URL}/#org`,
        name:    'メディリアライズ / Medirealize',
        email:   'info@medirealize.jp',
        url:     SITE_URL,
      },
    },
    {
      '@type': 'Organization',
      '@id':   `${SITE_URL}/#org`,
      name:    'Medirealize',
      url:     SITE_URL,
      email:   'info@medirealize.jp',
    },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const h = await headers();
  const lang = h.get('x-locale') ?? 'ja';

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-neutral-950">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
