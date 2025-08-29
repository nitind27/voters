// app/(admin)/(others-pages)/users/page.tsx

import Breadcrumbs from '@/components/common/BreadcrumbItem';
import Usersdatas from '@/components/usersdata/Usersdatas';
import { UserData } from '@/components/usersdata/Userdata';

import { UserCategory } from '@/components/usercategory/userCategory';
import { Suspense } from 'react';
import Loader from '@/common/Loader';
// import { Grampanchayattype } from '@/components/grampanchayat/gptype';

// Add Colony interface
interface Colony {
  colony_id: number;
  colony_name: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  full_name: string;
  booth_number: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const getUsers = async (): Promise<UserData[]> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/insert`, { cache: 'no-store' });
  return res.json();
};

const getUserCategories = async (): Promise<UserCategory[]> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/usercategorycrud`, { cache: 'no-store' });
  return res.json();
};

// Add function to fetch colonies
const getColonies = async (): Promise<Colony[]> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/colony`, { cache: 'no-store' });
  return res.json();
};

const Page = async () => {
  const [users, categories, colonies] = await Promise.all([
    getUsers(),
    getUserCategories(),
    getColonies(), // Add colonies to the Promise.all
    // getgrampanchayat()
  ]);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Users', href: '/users' },
  ];

  return (
    <div className="grid grid-cols-6 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <Suspense fallback={<Loader />}>
          <Breadcrumbs title="Users" breadcrumbs={breadcrumbItems} />
          <Usersdatas
            users={users}
            datausercategorycrud={categories}
            colonies={colonies} // Pass colonies data to Usersdatas component
          />
        </Suspense>
      </div>
    </div>
  );
};

export default Page;
