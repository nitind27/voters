import Breadcrumbs from '@/components/common/BreadcrumbItem';
import Colony from '@/components/Voter/Colony';
import { Suspense } from 'react';
import Loader from '@/common/Loader';

// Define proper types
interface ColonyType {
  colony_id: number;
  colony_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Server-side function to fetch colonies
const getColonies = async (): Promise<ColonyType[]> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/colony`, { 
    cache: 'no-store' 
  });
  
  if (!res.ok) {
    console.error('Failed to fetch colonies:', res.status, res.statusText);
    return [];
  }
  
  return res.json();
};

const Page = async () => {
  const colonies = await getColonies();

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Colony', href: '/colony' },
  ];

  return (
    <div className="grid grid-cols-6 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <Suspense fallback={<Loader />}>
          <Breadcrumbs title="Colony Management" breadcrumbs={breadcrumbItems} />
          <Colony colonies={colonies} />
        </Suspense>
      </div>
    </div>
  );
};

export default Page;
