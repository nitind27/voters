"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
// import { useToggleContext } from '@/context/ToggleContext';

import { Column } from "../tables/tabletype";


// import Loader from '@/common/Loader';

import { colonyentrydatatype, Voterdatatye, voterdayatype } from './Votertype';
import { Withoutbtn } from '../tables/Withoutbtn';
import { formatDate } from '@/lib/utils';

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

const Allvoters: React.FC<Props> = ({ voterentry, colonyentry }: Props) => {
  const [data] = useState<voterdayatype[]>(voterentry || []);
  const [filteredData, setFilteredData] = useState<voterdayatype[]>(voterentry || []);
  // const [inputValue, setInputValue] = useState('');
  const [colonyFilter, setColonyFilter] = useState('');
  const [colonyList, setColonyList] = useState<ColonyData[]>([]);
  const [loadingColonies, setLoadingColonies] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberModalTitle, setMemberModalTitle] = useState('');
  const [memberModalRows, setMemberModalRows] = useState<voterdayatype[]>([]);
  // const { isEditMode } = useToggleContext();
  // const [editId, setEditId] = useState<number | null>(null);
  // const [loading, setLoading] = useState(false);

  const [previewImg, setPreviewImg] = useState<string | null>(null);

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

  // Group non-primary members by colony_entry_id
  const membersByColonyEntryId = useMemo(() => {
    const map = new Map<string, voterdayatype[]>();
    (voterentry || []).forEach(v => {
      if ((v.relation || '').toLowerCase() === 'primary person') return;
      const key = String(v.colony_entry_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    });
    return map;
  }, [voterentry]);



  const openMembersModal = (row: voterdayatype) => {
    const key = String(row.colony_entry_id);
    const members = membersByColonyEntryId.get(key) || [];
    setMemberModalRows(members);
    setMemberModalTitle(`Family Members (${members.length}) - ${row.colony_name}`);
    setMemberModalOpen(true);
  };

  const closeMembersModal = () => {
    setMemberModalOpen(false);
    setMemberModalRows([]);
    setMemberModalTitle('');
  };



  const columns: Column<voterdayatype>[] = [
    {
      key: 'colony_entry_id',
      label: 'Name of Colony',
      accessor: 'colony_name',
      render: (data) => <span className="text-sm">{data.colony_name}</span>,
    },
    {
      key: 'full_name',
      label: 'Primary Person',
      accessor: 'full_name',
      render: (data) => (
        <div className="flex flex-col">
          <span className="font-medium">{data.full_name} ({data.full_name_mr})</span>

        </div>
      ),
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
              src={`https://vishalnawle.in/vishalnavle/flutter_api_voters/voter_photos/${data.photo}`}
              alt="Voter Photo"
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer"
              title="Click to preview"
              onClick={() =>
                setPreviewImg(`https://vishalnawle.in/vishalnavle/flutter_api_voters/voter_photos/${data.photo}`)
              }
              onError={(e) => {
                e.currentTarget.src = '/images/user/npimg.jpg';
              }}
            />
          )

            : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 text-xs">No Photo</span>
              </div>
            )}
        </div>
      ),
    },


    {
      key: 'member',
      label: 'Number of Family Member',
      accessor: 'relation',
      render: (data) => {
        const count = membersByColonyEntryId.get(String(data.colony_entry_id))?.length || 0;
        return (
          <button
            type="button"
            className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-sm"
            onClick={() => openMembersModal(data)}
            disabled={count === 0}
            title={count === 0 ? 'No family members' : 'View members'}
          >
            {count}
          </button>
        );
      },
    },

  ];

  return (
    <div className="">

      {/* Members Modal */}
      {memberModalOpen && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={closeMembersModal}
        >
          <div
            className="relative w-[95vw] max-w-4xl max-h-[80vh] overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold">{memberModalTitle}</h3>
              <button
                type="button"
                className="px-2 py-1 rounded hover:bg-gray-100"
                onClick={closeMembersModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-auto">
              {memberModalRows.length === 0 ? (
                <div className="text-sm text-gray-500">No members found.</div>
              ) : (
                <table className="w-full text-sm border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr className="text-left">
                      <th className="p-2 border">Sr No.</th>
                      <th className="p-2 border">Name</th>
                      <th className="p-2 border">Relation</th>
                      <th className="p-2 border">Mobile</th>
                      <th className="p-2 border">Gender</th>
                      <th className="p-2 border">DOB</th>
                      <th className="p-2 border">Voter No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberModalRows.map((m, index) => (
                      <tr key={m.voter_id}>
                        <td className="p-2 border">{index + 1}</td>
                        <td className="p-2 border">{m.full_name} ({m.full_name_mr})</td>
                        <td className="p-2 border">{m.relation}</td>
                        <td className="p-2 border">{m.mobile || 'N/A'}</td>
                        <td className="p-2 border">{m.gender || '-'}</td>
                        <td className="p-2 border">{formatDate(m.dob || '-')}</td>
                        <td className="p-2 border">{m.voter_number || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
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
      {/* Image Preview Modal */}
      {/* Image Preview Modal */}
      {previewImg && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewImg(null)}
        >
          <div
            className="relative w-[90vw] max-w-[900px] h-[80vh] px-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute -top-12 right-0 text-white bg-white/20 hover:bg-white/30 rounded-full p-2"
              aria-label="Close"
              onClick={() => setPreviewImg(null)}
            >
              ✕
            </button>
            <img
              src={previewImg}
              alt="Voter Photo Preview"
              className="w-full h-full object-contain rounded-lg shadow-2xl bg-black/10"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/images/user/npimg.jpg';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};


export default Allvoters;
