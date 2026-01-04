import Breadcrumbs from '@/components/common/BreadcrumbItem';
import VoterStatusDashboard from '@/components/Newdashboard/VoterStatusDashboard';

const page = async () => {
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Corporation list voting status', href: '/voterstatus' },
  ];

  return (
    <div className="grid grid-cols-6 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <Breadcrumbs title="Corporation list voting status" breadcrumbs={breadcrumbItems} />
        <VoterStatusDashboard />
      </div>
    </div>
  );
};

export default page;

