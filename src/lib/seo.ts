import type { Metadata } from 'next';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bscore.medirealize.jp'
).replace(/\/$/, '');

export const SITE_NAME = 'Basketball Score';
export const OG_IMAGE  = `${SITE_URL}/icon-512.png`;

export const LOCALES = ['ja', 'en', 'zh', 'zh-TW'] as const;
export type SeoLocale = typeof LOCALES[number];

export const OG_LOCALE: Record<SeoLocale, string> = {
  'ja':    'ja_JP',
  'en':    'en_US',
  'zh':    'zh_CN',
  'zh-TW': 'zh_TW',
};

/** hreflang alternates を生成（x-default = ja） */
export function localeAlternates(path: string): NonNullable<Metadata['alternates']> {
  const base = path.startsWith('/') ? path : `/${path}`;
  return {
    canonical: `${SITE_URL}/ja${base}`,
    languages: {
      ja:          `${SITE_URL}/ja${base}`,
      en:          `${SITE_URL}/en${base}`,
      zh:          `${SITE_URL}/zh${base}`,
      'zh-TW':     `${SITE_URL}/zh-TW${base}`,
      'x-default': `${SITE_URL}/ja${base}`,
    },
  };
}

/** Open Graph 共通ベース */
export function baseOG(
  locale: SeoLocale,
  title: string,
  description: string,
  path: string,
): NonNullable<Metadata['openGraph']> {
  return {
    title,
    description,
    url:      `${SITE_URL}/${locale}${path}`,
    siteName: SITE_NAME,
    locale:   OG_LOCALE[locale],
    type:     'website',
    images:   [{ url: OG_IMAGE, width: 512, height: 512, alt: SITE_NAME }],
  };
}

/** Twitter Card 共通ベース */
export function baseTwitter(
  title: string,
  description: string,
): NonNullable<Metadata['twitter']> {
  return {
    card:        'summary',
    title,
    description,
    images:      [OG_IMAGE],
  };
}

/** noindex が必要なプライベートページ用 */
export const ROBOTS_NOINDEX: Metadata['robots'] = {
  index:  false,
  follow: false,
};

// ================================================================
// ページ別メタデータ定義（多言語）
// ================================================================

type LocaleMetaMap = Record<SeoLocale, { title: string; description: string }>;

export const PAGE_META: Record<string, LocaleMetaMap> = {
  login: {
    ja:    { title: `ログイン | ${SITE_NAME}`, description: 'Basketball Scoreにログイン。バスケットボールの試合スコアとスタッツをリアルタイムで記録・分析できるPWAアプリ。無料プラン有。' },
    en:    { title: `Sign In | ${SITE_NAME}`, description: 'Sign in to Basketball Score — the real-time PWA for recording basketball game scores, stats, and AI-powered analysis. Free plan available.' },
    zh:    { title: `登录 | ${SITE_NAME}`, description: '登录Basketball Score。一款实时记录篮球比赛得分和数据的PWA应用，支持AI分析。提供免费版。' },
    'zh-TW': { title: `登入 | ${SITE_NAME}`, description: '登入Basketball Score。即時記錄籃球比賽得分和數據的PWA應用，支援AI分析。提供免費版。' },
  },
  guide: {
    ja:    { title: `使い方ガイド | ${SITE_NAME}`, description: 'Basketball Scoreの使い方を徹底解説。試合作成・選手登録・2PT/3PT/FTスタッツ記録・クォーター管理・AI分析・ランニングスコアシート・PDF出力まで。' },
    en:    { title: `User Guide | ${SITE_NAME}`, description: 'Complete guide for Basketball Score. Create games, register players, track 2PT/3PT/FT stats by quarter, AI analysis, running score sheet, and PDF export.' },
    zh:    { title: `使用指南 | ${SITE_NAME}`, description: 'Basketball Score完整使用指南。创建比赛、登记球员、记录2分/3分/罚球数据、AI分析、实时得分表和PDF导出。' },
    'zh-TW': { title: `使用說明 | ${SITE_NAME}`, description: 'Basketball Score完整使用說明。建立比賽、登錄球員、記錄2分/3分/罰球數據、AI分析、即時得分表和PDF匯出。' },
  },
  privacy: {
    ja:    { title: `プライバシーポリシー | ${SITE_NAME}`, description: 'Basketball Scoreのプライバシーポリシー。収集する情報、利用目的、第三者サービス（Supabase・Stripe・Gemini）について説明します。' },
    en:    { title: `Privacy Policy | ${SITE_NAME}`, description: "Basketball Score's privacy policy. Explains information collected, usage, and third-party services (Supabase, Stripe, Gemini)." },
    zh:    { title: `隐私政策 | ${SITE_NAME}`, description: 'Basketball Score的隐私政策。说明收集的信息、使用目的及第三方服务（Supabase、Stripe、Gemini）。' },
    'zh-TW': { title: `隱私權政策 | ${SITE_NAME}`, description: 'Basketball Score的隱私權政策。說明收集的資訊、使用目的及第三方服務（Supabase、Stripe、Gemini）。' },
  },
  terms: {
    ja:    { title: `利用規約 | ${SITE_NAME}`, description: 'Basketball Scoreの利用規約。プレミアムプランのサブスクリプション、禁止事項、免責事項について定めます。' },
    en:    { title: `Terms of Service | ${SITE_NAME}`, description: "Basketball Score's terms of service. Premium subscription, prohibited activities, and disclaimer." },
    zh:    { title: `服务条款 | ${SITE_NAME}`, description: 'Basketball Score的服务条款。高级版订阅、禁止事项和免责声明。' },
    'zh-TW': { title: `服務條款 | ${SITE_NAME}`, description: 'Basketball Score的服務條款。進階版訂閱、禁止事項和免責聲明。' },
  },
  legal: {
    ja:    { title: `特定商取引法に基づく表記 | ${SITE_NAME}`, description: 'Basketball Scoreの特定商取引法に基づく表記。販売業者（メディリアライズ）、販売価格、支払い方法、返品・キャンセルについて。' },
    en:    { title: `Specified Commercial Transactions | ${SITE_NAME}`, description: 'Specified Commercial Transactions disclosure for Basketball Score. Seller (Medirealize), pricing, payment, and cancellation policy.' },
    zh:    { title: `特定商业交易说明 | ${SITE_NAME}`, description: 'Basketball Score的特定商业交易说明。销售方（Medirealize）、价格、付款方式和退款政策。' },
    'zh-TW': { title: `特定商業交易說明 | ${SITE_NAME}`, description: 'Basketball Score的特定商業交易說明。銷售方（Medirealize）、價格、付款方式和退款政策。' },
  },
};
