"use client"
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
// import { useToggleContext } from '@/context/ToggleContext';
// import Label from "../form/Label";
import Loader from '@/common/Loader';
import { Column } from "../tables/tabletype";
import { colonyentrydatatype, Voterdatatye, voterdayatype } from './Votertype';
import { Withoutbtn } from '../tables/Withoutbtn';

interface ColonyData {
  colony_id: number;
  colony_name: string;
  status: string;
}

// type FormErrors = { usercategory?: string; };

type Props = {
  colony: Voterdatatye[];
  colonyentry: colonyentrydatatype[];
  voterentry: voterdayatype[];
};

const Findatasorting: React.FC<Props> = ({ voterentry }) => {
  const [data, setData] = useState<voterdayatype[]>(voterentry || []);
  const [filteredData, setFilteredData] = useState<voterdayatype[]>(voterentry || []);
  const [colonyFilter, setColonyFilter] = useState('');
  const [colonyList, setColonyList] = useState<ColonyData[]>([]);
  const [loadingColonies, setLoadingColonies] = useState(false);
//   const { isEditMode, setIsmodelopen, isvalidation, } = useToggleContext();
  const [loading, setLoading] = useState(false);
  const [radioSelections, setRadioSelections] = useState<{ [key: number]: number }>({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch colony data for filter dropdown
  const fetchColonies = async () => {
    setLoadingColonies(true);
    try {
      const response = await fetch('/api/colony');
      if (!response.ok) throw new Error('Failed to fetch colonies');
      setColonyList(await response.json());
    } catch {
      toast.error('Failed to load colony list');
    } finally {
      setLoadingColonies(false);
    }
  };

  // Filter logic for colonies
  useEffect(() => {
    if (colonyFilter) {
      setFilteredData(
        data.filter(item => item.colony_name?.toLowerCase().includes(colonyFilter.toLowerCase()))
      );
    } else {
      setFilteredData(data);
    }
  }, [colonyFilter, data]);

  // Load colonies on mount
  useEffect(() => { fetchColonies(); }, []);

  // Fetch voter data from the API (with Findatasorting)
  const fetchVoterData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/voter?includeFindatasorting=true');
      if (!response.ok) throw new Error('Failed to fetch voter data');
      const result = await response.json();
      setData(result);
      setFilteredData(result);
    } catch {
      toast.error('Failed to load voter data');
    } finally {
      setLoading(false);
    }
  };

  // Initial load fetch for Findatasorting (on mount)
  useEffect(() => { fetchVoterData(); }, []);

  // Sync radio selections with DB data
  useEffect(() => {
    const initialSelections: { [key: number]: number } = {};
    data.forEach(item => {
      // Use Findatasorting value (0 or 1)
      initialSelections[item.voter_id] = item.Findatasorting !== undefined ? item.Findatasorting : 0;
    });
    setRadioSelections(initialSelections);
  }, [data]);

  // Handle radio changing
  const handleRadioChange = (voterId: number, value: number) => {
    setRadioSelections(prev => ({ ...prev, [voterId]: value }));
  };

  const handleSubmitSelections = async () => {
    if (Object.keys(radioSelections).length === 0) {
      toast.warning('Please select at least one option before submitting');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/voter', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: Object.entries(radioSelections).map(([voterId, value]) => ({
            voter_id: Number(voterId),
            findatasorting: value   // changed from Findatasorting to findatasorting
          })),
        }),
      });
      if (!response.ok) throw new Error('Failed to update data');
      toast.success('Updated Successfully!');
      await fetchVoterData();
    } catch {
      toast.error('Failed to update data. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Columns definition
  const columns: Column<voterdayatype>[] = [
      { key: 'colony_name', label: 'Colony Name', accessor: 'colony_name' },
    // { key: 'voter_id', label: 'Voter ID', accessor: 'voter_id' },
    { key: 'full_name', label: 'Full Name', accessor: 'full_name' },
    { key: 'voter_number', label: 'Voter Number', accessor: 'voter_number' },
    { key: 'booth_number', label: 'Booth Number', accessor: 'booth_number' },
    {
      key: 'findatasorting',
      label: 'Action',
      accessor: 'Findatasorting',
      render: (row) => {
        const voterId = row.voter_id;
        const value = radioSelections[voterId] !== undefined ? radioSelections[voterId] : row.Findatasorting || 0;
        return (
          <div className="flex space-x-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`findatasorting_${voterId}`}
                checked={value === 1}
                onChange={() => handleRadioChange(voterId, 1)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`findatasorting_${voterId}`}
                checked={value === 0}
                onChange={() => handleRadioChange(voterId, 0)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        );
      }
    }
  ];

  return (
    <div>
      {loading && <Loader />}
      <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border flex flex-col sm:flex-row items-center gap-2">
        <select
          value={colonyFilter}
          onChange={e => setColonyFilter(e.target.value)}
          disabled={loadingColonies}
          className="h-11 w-full mr-4 rounded-lg border px-4 py-2 text-sm"
        >
          <option value="">{loadingColonies ? 'Loading colonies...' : 'All Colonies'}</option>
          {colonyList.map((colony, i) => (
            <option key={colony.colony_id} value={colony.colony_name}>
              {i + 1}) {colony.colony_name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="px-4 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-nowrap"
          onClick={() => setColonyFilter('')}
          disabled={loadingColonies}
        >
          Clear Filter
        </button>
        <button
          type="button"
          onClick={handleSubmitSelections}
          disabled={submitting || Object.keys(radioSelections).length === 0}
          className="px-4 py-2 text-sm text-nowrap font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
      <Withoutbtn
        data={filteredData}
        columns={columns}
        title="Voter Findatasorting Management"
        filterOptions={[]}
        searchKey="full_name"
      />
    </div>
  );
};

export default Findatasorting;
