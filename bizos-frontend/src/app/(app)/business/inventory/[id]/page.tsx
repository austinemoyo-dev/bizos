import dynamic from 'next/dynamic';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

const InventoryDetailPage = dynamic(() => import('./InventoryDetailPage'), { ssr: false });

export default function Page() {
  return <InventoryDetailPage />;
}
