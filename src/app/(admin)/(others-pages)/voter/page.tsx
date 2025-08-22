import Breadcrumbs from '@/components/common/BreadcrumbItem';
import Voterdata from '@/components/Voter/Voterdata';
import React from 'react'


const page = async () => {
    const [colony, colonyentry, voterentry] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/colony`, { cache: 'no-store' }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/colonyentry`, { cache: 'no-store' }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/voterentry`, { cache: 'no-store' }),
        // fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/district`, { cache: 'no-store' }),

    ]);

    const [colonydata, colonyentrydata, voterentrydata] = await Promise.all([
        colony.json(),
        colonyentry.json(),
        voterentry.json(),
        // distdata.json(),

    ])
    const breadcrumbItems = [
        { label: 'Home', href: '/' },
        { label: 'Voter', href: '/voter' },
    ];

    return (
        <div className="grid grid-cols-6 gap-4 md:gap-6">
            <div className="col-span-12 space-y-6 xl:col-span-7">

                <Breadcrumbs title="Voter Data Management" breadcrumbs={breadcrumbItems} />
                <Voterdata colony={colonydata} colonyentry={colonyentrydata} voterentry={voterentrydata} />
            </div>
        </div>
    )
}

export default page
