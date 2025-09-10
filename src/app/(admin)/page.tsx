
import Dashboardbread from '@/components/common/Dashboardbread';
import VoterTabs from '@/components/Voter/VoterTabs';
// import Voterdata from '@/components/Voter/Voterdata';
import React from 'react'


const page = async () => {
    const [colony, colonyentry, voterentry] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/colony`, { cache: 'no-store' }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/colonyentry`, { cache: 'no-store' }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/voterentry`, { cache: 'no-store' }),
    ]);

    const [colonydata, colonyentrydata, voterentrydata] = await Promise.all([
        colony.json(),
        colonyentry.json(),
        voterentry.json(),
        // distdata.json(),

    ])

    return (
        <div className="grid grid-cols-6 gap-4 md:gap-6">
            <div className="col-span-12 space-y-6 xl:col-span-7">

                <Dashboardbread title="Total Voters" breadcrumbs={voterentrydata.length} />
               
                <VoterTabs colony={colonydata} colonyentry={colonyentrydata} voterentry={voterentrydata} />
            </div>
        </div>
    )
}

export default page