import Breadcrumbs from '@/components/common/BreadcrumbItem';
import CorporationList from '@/components/Voter/CorporationList';

const page = async () => {
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Corporation List', href: '/corporationlist' },
  ];

  return (
    <div className="grid grid-cols-6 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <Breadcrumbs title="Corporation List" breadcrumbs={breadcrumbItems} />
        <CorporationList />
      </div>
    </div>
  );
};

export default page;

