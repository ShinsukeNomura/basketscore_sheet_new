import { redirect } from 'next/navigation';

// Middleware handles locale detection, but if middleware is bypassed this is the fallback.
export default function RootPage() {
  redirect('/ja');
}
