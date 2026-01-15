import Breadcrumbs from '@/components/common/BreadcrumbItem';
import BoothAddressWiseStats from '@/components/Voter/BoothAddressWiseStats';

const page = async () => {
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Booth Address Wise Statistics', href: '/boothaddresswise' },
  ];

  return (
    <div className="grid grid-cols-6 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <Breadcrumbs title="Booth Address Wise Statistics" breadcrumbs={breadcrumbItems} />
        <BoothAddressWiseStats />
      </div>
    </div>
  );
};

export default page;

