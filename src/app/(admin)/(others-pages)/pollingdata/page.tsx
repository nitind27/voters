import Breadcrumbs from '@/components/common/BreadcrumbItem';
import PollingData from '@/components/Voter/PollingData';

const page = async () => {
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Polling Data', href: '/pollingdata' },
  ];

  return (
    <div className="grid grid-cols-6 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <Breadcrumbs title="Polling Data" breadcrumbs={breadcrumbItems} />
        <PollingData />
      </div>
    </div>
  );
};

export default page;

