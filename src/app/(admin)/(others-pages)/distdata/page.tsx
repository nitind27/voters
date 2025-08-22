import Breadcrumbs from '@/components/common/BreadcrumbItem';
import Distdata from '@/components/District/Distdata'
import { Taluka } from '@/components/Taluka/Taluka';
import React from 'react'


const getTalukas = async (): Promise<Taluka[]> => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/district`, { cache: 'no-store' });
    return res.json();
};



const page = async () => {
    const [taluka] = await Promise.all([

        getTalukas(),

        // getgrampanchayat()
    ]);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'District', href: '/distdata' },
  ];

    return (
        <div>
             <Breadcrumbs title="District" breadcrumbs={breadcrumbItems} />
            <Distdata district={taluka} />
        </div>
    )
}

export default page
