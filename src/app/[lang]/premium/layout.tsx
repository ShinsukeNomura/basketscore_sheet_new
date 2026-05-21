import type { Metadata } from 'next';
import { ROBOTS_NOINDEX } from '@/lib/seo';

export const metadata: Metadata = { robots: ROBOTS_NOINDEX };

export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
