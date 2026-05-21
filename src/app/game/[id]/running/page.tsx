import { redirect } from 'next/navigation';
export default function Page({ params }: { params: { id: string } }) { redirect(`/ja/game/${params.id}/running`); }
