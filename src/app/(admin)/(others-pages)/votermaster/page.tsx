import Breadcrumbs from '@/components/common/BreadcrumbItem';
import VoterMaster from '@/components/Voter/VoterMaster';

const page = async () => {
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Voter Master', href: '/votermaster' },
  ];

  return (
    <div className="grid grid-cols-6 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <Breadcrumbs title="Voter Master" breadcrumbs={breadcrumbItems} />
        <VoterMaster />
      </div>
    </div>
  );
};

export default page;


