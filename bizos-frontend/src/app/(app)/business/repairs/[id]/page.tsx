import dynamic from 'next/dynamic';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

const RepairDetailPage = dynamic(() => import('./RepairDetailPage'), { ssr: false });

export default function Page() {
  return <RepairDetailPage />;
}
