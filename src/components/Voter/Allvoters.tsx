"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
// import { useToggleContext } from '@/context/ToggleContext';

import { Column } from "../tables/tabletype";


// import Loader from '@/common/Loader';

import { colonyentrydatatype, Voterdatatye, voterdayatype } from './Votertype';
import { Withoutbtn } from '../tables/Withoutbtn';

// Colony type for API response
interface ColonyData {
  colony_id: number;
  colony_name: string;
  status: string;
}

type Props = {
  colony: Voterdatatye[];
  colonyentry: colonyentrydatatype[];
  voterentry: voterdayatype[];
};

const Allvoters: React.FC<Props> = ({ voterentry,colonyentry }: Props) => {
  const [data] = useState<voterdayatype[]>(voterentry || []);
  const [filteredData, setFilteredData] = useState<voterdayatype[]>(voterentry || []);
  // const [inputValue, setInputValue] = useState('');
  const [colonyFilter, setColonyFilter] = useState('');
  const [colonyList, setColonyList] = useState<ColonyData[]>([]);
  const [loadingColonies, setLoadingColonies] = useState(false);
  // const { isEditMode } = useToggleContext();
  // const [editId, setEditId] = useState<number | null>(null);
  // const [loading, setLoading] = useState(false);

  // const colonyCounts = useMemo(() => {
  //   const map: Record<string, number> = {};
  //   (data || []).forEach(v => {
  //     const name = (v.colony_name || '').trim();
  //     if (!name) return;
  //     map[name] = (map[name] || 0) + 1;
  //   });
  //   return map;
  // }, [data]);
  const colonyEntryToColony = useMemo(() => {
    const m = new Map<string, string>();
    colonyentry.forEach((ce) => {
      m.set(String(ce.colony_entry_id), String(ce.colony_id));
    });
    return m;
  }, [colonyentry]);

  const colonyMemberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    voterentry.forEach((v) => {
      const cid = colonyEntryToColony.get(String(v.colony_entry_id));
      if (cid) counts[cid] = (counts[cid] || 0) + 1;
    });
    return counts;
  }, [voterentry, colonyEntryToColony]);

  // Fetch colony data from API
  const fetchColonies = async () => {
    setLoadingColonies(true);
    try {
      const response = await fetch('/api/colony');
      if (!response.ok) {
        throw new Error('Failed to fetch colonies');
      }
      const colonies = await response.json();
      setColonyList(colonies);
    } catch (error) {
      console.error('Error fetching colonies:', error);
      toast.error('Failed to load colony list');
    } finally {
      setLoadingColonies(false);
    }
  };

  // Filter data based on colony name
  useEffect(() => {
    if (colonyFilter) {
      const filtered = data.filter(item =>
        item.colony_name && item.colony_name.toLowerCase().includes(colonyFilter.toLowerCase())
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(data);
    }
  }, [colonyFilter, data]);

  // Load colonies on component mount
  useEffect(() => {
    fetchColonies();
  }, []);



 

  const columns: Column<voterdayatype>[] = [
    {
      key: 'colony_entry_id',
      label: 'Colony Entry ID',
      accessor: 'colony_name',
      render: (data) => <span className="text-sm">{data.colony_name}</span>,
    },
    {
      key: 'full_name',
      label: 'Full Name',
      accessor: 'full_name',
      render: (data) => (
        <div className="flex flex-col">
          <span className="font-medium">{data.full_name}</span>

        </div>
      ),
    },
    {
      key: 'voter_number',
      label: 'Voter Number',
      accessor: 'voter_number',
      render: (data) => <span className="font-mono">{data.voter_number}</span>,
    },
   
    {
      key: 'booth_number',
      label: 'Booth Number',
      accessor: 'booth_number',
      render: (data) => <span className="font-medium">{data.booth_number}</span>,
    },
    {
      key: 'mobile',
      label: 'Mobile',
      accessor: 'mobile',
      render: (data) => (
        <span className="font-mono">
          {data.mobile || 'N/A'}
        </span>
      ),
    },

    {
      key: 'photo',
      label: 'Photo',
      accessor: 'photo',
      render: (data) => (
        <div className="flex items-center">
          {data.photo ? (
            <img
              src={data.photo}
              alt="Voter Photo"
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
              onError={(e) => {
                e.currentTarget.src = '/images/user/npimg.jpg';
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 text-xs">No Photo</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      accessor: 'status',
      render: (data) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${data.status === 'Active' ? 'bg-green-100 text-green-800' :
            data.status === 'Inactive' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
          }`}>
          {data.status}
        </span>
      ),
    },

  ];

  return (
    <div className="">
    
     
      <Withoutbtn
        data={filteredData}
        inputfiled={
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-1">
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1 min-w-0">

            <select
              value={colonyFilter}
              onChange={(e) => setColonyFilter(e.target.value)}
              disabled={loadingColonies}
              className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
                         <option value="">
                {loadingColonies ? 'Loading colonies...' : 'All Colonies'}
              </option>
              {colonyList.map((colony, index) => (
                <option key={colony.colony_id} value={colony.colony_name}>
                  {index + 1}) {colony.colony_name} ({colonyMemberCounts[String(colony.colony_id)] || 0})
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setColonyFilter('')}
              disabled={loadingColonies}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Filter
            </button>

          </div>
        </div>
          </div>
        }
        columns={columns}
        title="User Category"
        filterOptions={[]}
       
        searchKey="category_name"

      />
    </div>
  );
};

export default Allvoters;
