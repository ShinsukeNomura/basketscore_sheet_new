/** 回答者用 Google フォーム（環境変数未設定時のデフォルト） */
const DEFAULT_CONTACT_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfgYRrq5zx9dsrqPXuRftWqoCtCYEK-EsQGHVoBsaY9hK_UxA/viewform';

/** お問い合わせ Google フォーム URL（NEXT_PUBLIC_CONTACT_FORM_URL で上書き可） */
export function getContactFormUrl(): string | null {
  const url = (process.env.NEXT_PUBLIC_CONTACT_FORM_URL ?? DEFAULT_CONTACT_FORM_URL).trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname;
    if (host === 'forms.gle' || host.endsWith('.google.com')) return url;
    return null;
  } catch {
    return null;
  }
}
