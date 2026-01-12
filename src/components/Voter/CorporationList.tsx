"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Column } from "../tables/tabletype";
import { Withoutbtn } from "../tables/Withoutbtn";
import { toast } from "react-toastify";
import Loader from "@/common/Loader";
import { getVoterIdColorClass } from "@/lib/utils";

// Base interface with all fields from tbl_voters_search
interface BaseVoterData {
  id: number;
  Voter_Id: string;
  full_name: string;
  ENG_Full_name: string;
  Age: string;
  Gender: string;
  House_Number: string;
  Updated_colony: string;
  updated_mobile_no: string;
  Updated_photo: string;
  user_id: number;
  updated_house_number: string;
  family_member: string;
  status: string;
  created_at: string;
  updated_at: string;
  volunteer_name: string;
  volunteer_mobile: string;
  volunteer_status: string;
  assigned_colony_name: string;
  assigned_colony_id: string;
  assigned_volunteer_id: number;
  inst_1_paid: string;
  inst_2_paid: string;
  inst_3_paid: string;
  voting_paid: string;
  voting_in_transit: string;
  voting_status: string;
  colony_name: string;
  Booth_Number: string;
  Booth_Address: string;
  Sr_No: string;
}

type CorporationListData = BaseVoterData;

const CorporationList: React.FC = () => {
  const [corporationListData, setCorporationListData] = useState<CorporationListData[]>([]);
  const [corporationListLoading, setCorporationListLoading] = useState(false);

  // Fetch Corporation List data (all voters from tbl_voters_search - no WHERE conditions, no limits)
  const fetchCorporationList = useCallback(async () => {
    setCorporationListLoading(true);
    try {
      const response = await fetch('/api/voterstatus/corporation');
      if (!response.ok) throw new Error('Failed to fetch corporation list');
      const result = await response.json();
      setCorporationListData(result.data || []);
    } catch (error) {
      console.error('Error fetching corporation list:', error);
      toast.error('Failed to load corporation list');
      setCorporationListData([]);
    } finally {
      setCorporationListLoading(false);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    fetchCorporationList();
  }, [fetchCorporationList]);

  // Columns for Corporation List
  const corporationListColumns: Column<CorporationListData>[] = useMemo(() => [
    {
      key: 'Voter_Id',
      label: 'Voter ID',
      accessor: 'Voter_Id',
      render: (data) => (
        <span className={`font-mono text-sm font-medium ${getVoterIdColorClass(data.inst_1_paid, data.inst_2_paid, data.inst_3_paid)}`}>{data.Voter_Id || 'N/A'}</span>
      ),
    },
    {
      key: 'full_name',
      label: 'Full Name',
      accessor: 'full_name',
      render: (data) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{data.full_name || 'N/A'}</span>
          {data.ENG_Full_name && <span className="text-xs text-gray-500">({data.ENG_Full_name})</span>}
        </div>
      ),
    },
    // {
    //   key: 'family_member',
    //   label: 'Family Member',
    //   accessor: 'family_member',
    //   render: (data) => (
    //     <span className="text-sm">{data.family_member || data.Voter_Id || 'N/A'}</span>
    //   ),
    // },
    {
      key: 'colony_name',
      label: 'Colony',
      accessor: 'colony_name',
      render: (data) => (
        <span className="text-sm">{data.colony_name || 'N/A'}</span>
      ),
    },
    {
      key: 'colony_housenumber',
      label: 'House Number',
      accessor: 'House_Number',
      render: (data) => (
        <span className="text-sm">{data.House_Number ||'N/A'}</span>
      ),
    },
    {
      key: 'assigned_colony_name',
      label: 'Updated Colony',
      accessor: 'assigned_colony_name',
      render: (data) => (
        <span className="text-sm">{data.assigned_colony_name || 'N/A'}</span>
      ),
    },
    
    {
      key: 'colony_housenumber',
      label: 'Updated House Number',
      accessor: 'updated_house_number',
      render: (data) => (
        <span className="text-sm">{data.updated_house_number ||'N/A'}</span>
      ),
    },
    
    {
      key: 'updated_mobile_no',
      label: 'Mobile No',
      accessor: 'updated_mobile_no',
      render: (data) => (
        <span className="font-mono text-sm">{data.updated_mobile_no || 'N/A'}</span>
      ),
    },
    {
      key: 'Sr_No',
      label: 'Sr No',
      accessor: 'Sr_No',
      render: (data) => (
        <span className="font-mono text-sm">{data.Sr_No || 'N/A'}</span>
      ),
    },
    {
      key: 'Booth_Address',
      label: 'Booth Address',
      accessor: 'Booth_Address',
      render: (data) => (
        <span className="font-mono text-sm">{data.Booth_Address || 'N/A'}</span>
      ),
    },
    {
      key: 'Booth_Number',
      label: 'Booth Number',
      accessor: 'Booth_Number',
      render: (data) => (
        <span className="font-mono text-sm">{data.Booth_Number || 'N/A'}</span>
      ),
    },
    // {
    //   key: 'installment_status',
    //   label: 'Installment Status',
    //   accessor: 'inst_1_paid',
    //   render: (data) => {
    //     const installments = [];
    //     if (data.inst_1_paid === 'Yes' || data.inst_1_paid === '1' || data.inst_1_paid === 'true') {
    //       installments.push({ label: 'Inst 1', paid: true });
    //     } else {
    //       installments.push({ label: 'Inst 1', paid: false });
    //     }
    //     if (data.inst_2_paid === 'Yes' || data.inst_2_paid === '1' || data.inst_2_paid === 'true') {
    //       installments.push({ label: 'Inst 2', paid: true });
    //     } else {
    //       installments.push({ label: 'Inst 2', paid: false });
    //     }
    //     if (data.inst_3_paid === 'Yes' || data.inst_3_paid === '1' || data.inst_3_paid === 'true') {
    //       installments.push({ label: 'Inst 3', paid: true });
    //     } else {
    //       installments.push({ label: 'Inst 3', paid: false });
    //     }
    //     if (data.voting_paid === 'Yes' || data.voting_paid === '1' || data.voting_paid === 'true') {
    //       installments.push({ label: 'Voting', paid: true });
    //     } else {
    //       installments.push({ label: 'Voting', paid: false });
    //     }
        
    //     return (
    //       <div className="flex gap-1 flex-wrap">
    //         {installments.map((inst, idx) => (
    //           <span
    //             key={idx}
    //             className={`text-xs px-2 py-1 rounded font-medium ${
    //               inst.paid
    //                 ? 'bg-green-100 text-green-700'
    //                 : 'bg-gray-100 text-gray-500'
    //             }`}
    //           >
    //             {inst.label} {inst.paid ? '✓' : '✗'}
    //           </span>
    //         ))}
    //       </div>
    //     );
    //   },
    // },
    // {
    //   key: 'voting_status',
    //   label: 'Voting Status',
    //   accessor: 'voting_status',
    //   render: (data) => {
    //     const status = data.voting_status || 'Pending';
    //     const isDone = status === 'Done' || status === 'done' || status === 'Completed';
    //     const isInTransit = data.voting_in_transit === 'Yes' || data.voting_in_transit === '1' || data.voting_in_transit === 'true';
        
    //     return (
    //       <div className="flex flex-col gap-1">
    //         <span
    //           className={`text-xs px-2 py-1 rounded-full font-medium inline-block w-fit ${
    //             isDone
    //               ? 'bg-green-100 text-green-700'
    //               : isInTransit
    //               ? 'bg-yellow-100 text-yellow-700'
    //               : 'bg-gray-100 text-gray-700'
    //           }`}
    //         >
    //           {status}
    //         </span>
    //         {isInTransit && (
    //           <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full inline-block w-fit">
    //             In Transit
    //           </span>
    //         )}
    //       </div>
    //     );
    //   },
    // },
    // {
    //   key: 'volunteer_name',
    //   label: 'Volunteer',
    //   accessor: 'volunteer_name',
    //   render: (data) => (
    //     <div className="flex flex-col">
    //       <span className="text-sm font-medium">{data.volunteer_name || 'N/A'}</span>
    //       {data.volunteer_mobile && <span className="text-xs text-gray-500">{data.volunteer_mobile}</span>}
    //     </div>
    //   ),
    // },
  ], []);

  return (
    <div className="space-y-4">
      {corporationListLoading && <Loader />}
      <Withoutbtn
        data={corporationListData}
        columns={corporationListColumns}
        title="Corporation List - All Voters"
        filterOptions={[]}
        searchKey="full_name"
        inputfiled={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchCorporationList}
              disabled={corporationListLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 border border-cyan-600 rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {corporationListLoading ? 'Loading...' : 'Refresh'}
            </button>
            <span className="text-sm text-gray-600">
              Total: <span className="font-semibold text-cyan-600">{corporationListData.length}</span>
            </span>
          </div>
        }
      />
    </div>
  );
};

export default CorporationList;

