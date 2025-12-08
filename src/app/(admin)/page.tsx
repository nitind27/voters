
import DynamicCfrCount from '@/components/common/DynamicCfrCount';
import Newdashboard from '@/components/Newdashboard/Newdashboard';
import React from 'react'


const page = () => {
    return (
        <div className="grid grid-cols-6 gap-4 md:gap-6">
            <div className="col-span-12 space-y-6 xl:col-span-7">

                <DynamicCfrCount title="Total Voters" refreshInterval={30000} />
               
                <Newdashboard />
            </div>
        </div>
    )
}

export default page