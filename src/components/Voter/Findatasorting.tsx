"use client"
import React, { useEffect, useMemo, useState } from 'react';
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

const Findatasorting: React.FC<Props> = ({ voterentry,colonyentry }) => {
  const [data, setData] = useState<voterdayatype[]>(voterentry || []);
  const [filteredData, setFilteredData] = useState<voterdayatype[]>(voterentry || []);
  const [colonyFilter, setColonyFilter] = useState('');
  const [colonyList, setColonyList] = useState<ColonyData[]>([]);
  const [loadingColonies, setLoadingColonies] = useState(false);
//   const { isEditMode, setIsmodelopen, isvalidation, } = useToggleContext();
  const [loading, setLoading] = useState(false);
  const [radioSelections, setRadioSelections] = useState<{ [key: number]: number }>({});
  const [submitting, setSubmitting] = useState(false);
  const [yesNoFilter, setYesNoFilter] = useState<string>(''); // '' | '1' | '0'
console.log("datadatadata",data);

  // New: tabs
  const [activeTab, setActiveTab] = useState<'sorting' | 'individual' | 'family' | 'colony'>('sorting');
  
  // Modal state for family members
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<voterdayatype[]>([]);
  const [selectedPrimaryPerson, setSelectedPrimaryPerson] = useState<voterdayatype | null>(null);

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


  // Filter logic for colonies
  // Filter logic for colonies + Yes/No (Findatasorting)
  useEffect(() => {
    let filtered = data;

    if (colonyFilter) {
      filtered = filtered.filter(item =>
        item.colony_name?.toLowerCase().includes(colonyFilter.toLowerCase())
      );
    }

    if (yesNoFilter !== '') {
      const target = parseInt(yesNoFilter, 10);
      filtered = filtered.filter(row => {
        const current =
          radioSelections[row.voter_id] !== undefined
            ? radioSelections[row.voter_id]
            : (row.Findatasorting ?? 0);
        return Number(current) === target;
      });
    }

    setFilteredData(filtered);
  }, [colonyFilter, yesNoFilter, data, radioSelections]);

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
  {
    key: 'full_name',
    label: 'Full Name',
    accessor: 'full_name',
    render: (row) => (
      <span>
        {row.full_name}
        {row.full_name_mr ? ` (${row.full_name_mr})` : ''}
      </span>
    )
  },
  { key: 'house_number', label: 'House Number', accessor: 'house_number' },
  { key: 'voter_number', label: 'Voter Number', accessor: 'voter_number' },
  { key: 'booth_number', label: 'Booth Number', accessor: 'booth_number' },
  {
      key: 'findatasorting',
      label: 'Finance Done',
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

  // Derived data for "Individual" tab: always Finance Done = Yes
  const individualData = useMemo(() => {
    let list = [...data];
    if (colonyFilter) {
      list = list.filter(item =>
        item.colony_name?.toLowerCase().includes(colonyFilter.toLowerCase())
      );
    }
    return list.filter(row => {
      const current =
        radioSelections[row.voter_id] !== undefined
          ? radioSelections[row.voter_id]
          : (row.Findatasorting ?? 0);
      return Number(current) === 1;
    });
  }, [data, colonyFilter, radioSelections]);

  // Family data: Primary persons (Finance Done = Yes) grouped by house_number
  const familyData = useMemo(() => {
    const primaryPersons = data.filter(row => {
      const current =
        radioSelections[row.voter_id] !== undefined
          ? radioSelections[row.voter_id]
          : (row.Findatasorting ?? 0);
      return Number(current) === 1;
    });

    // Group by house_number and colony_name to get unique primary persons
    const grouped = primaryPersons.reduce((acc, person) => {
      const key = `${person.house_number}_${person.colony_name}`;
      if (!acc[key]) {
        acc[key] = person;
      }
      return acc;
    }, {} as Record<string, voterdayatype>);

    return Object.values(grouped);
  }, [data, radioSelections]);

  // Family table columns
  const familyColumns: Column<voterdayatype>[] = [
    { key: 'full_name', label: 'Full Name', accessor: 'full_name' },
    { key: 'house_number', label: 'House Number', accessor: 'house_number' },
    { key: 'colony_name', label: 'Colony Name', accessor: 'colony_name' },
    { key: 'voter_number', label: 'Voter Number', accessor: 'voter_number' },
    { key: 'booth_number', label: 'Booth Number', accessor: 'booth_number' },
    {
      key: 'action',
      label: 'Action',
      render: (row) => (
        <button
          onClick={() => handleFamilyMemberClick(row)}
          className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
        >
          View Family
        </button>
      )
    }
  ];

  // Family members modal columns
  const familyModalColumns: Column<voterdayatype>[] = [
    { key: 'full_name', label: 'Full Name', accessor: 'full_name' },
    { key: 'voter_number', label: 'Voter Number', accessor: 'voter_number' },
    { key: 'booth_number', label: 'Booth Number', accessor: 'booth_number' },
    { key: 'gender', label: 'Gender', accessor: 'gender' },
    { key: 'relation', label: 'Relation', accessor: 'relation' },
    { key: 'mobile', label: 'Mobile', accessor: 'mobile' },
    { key: 'aadhaar_number', label: 'Aadhaar', accessor: 'aadhaar_number' },
    { key: 'dob', label: 'DOB', accessor: 'dob' },
    {
      key: 'finance_done',
      label: 'Finance Done',
      render: (row) => {
        const financeStatus = radioSelections[row.voter_id] !== undefined 
          ? radioSelections[row.voter_id] 
          : (row.Findatasorting ?? 0);
        return (
          <span className={`font-medium ${
            Number(financeStatus) === 1 ? 'text-green-600' : 'text-red-600'
          }`}>
            {Number(financeStatus) === 1 ? 'Yes' : 'No'}
          </span>
        );
      }
    }
  ];

  // Colony statistics
  const colonyStats = useMemo(() => {
    const stats: Record<string, { name: string; total: number; yes: number; no: number; percentage: number }> = {};
    
    data.forEach(row => {
      const colonyName = row.colony_name || 'Unknown';
      if (!stats[colonyName]) {
        stats[colonyName] = { name: colonyName, total: 0, yes: 0, no: 0, percentage: 0 };
      }
      
      stats[colonyName].total++;
      const current =
        radioSelections[row.voter_id] !== undefined
          ? radioSelections[row.voter_id]
          : (row.Findatasorting ?? 0);
      
      if (Number(current) === 1) {
        stats[colonyName].yes++;
      } else {
        stats[colonyName].no++;
      }
    });

    // Calculate percentage
    Object.values(stats).forEach(stat => {
      stat.percentage = stat.total > 0 ? (stat.yes / stat.total) * 100 : 0;
    });

    return Object.values(stats).sort((a, b) => b.total - a.total);
  }, [data, radioSelections]);

  // Colony table columns
  const colonyColumns: Column<{ name: string; total: number; yes: number; no: number; percentage: number }>[] = [
    { key: 'name', label: 'Colony Name', accessor: 'name' },
    { key: 'total', label: 'Total Voters', accessor: 'total' },
    { 
      key: 'yes', 
      label: 'Finance Done (Yes)', 
      accessor: 'yes',
      render: (row) => <span className="text-green-600 font-medium">{row.yes}</span>
    },
    { 
      key: 'no', 
      label: 'Finance Done (No)', 
      accessor: 'no',
      render: (row) => <span className="text-red-600 font-medium">{row.no}</span>
    },
    {
      key: 'percentage',
      label: 'Percentage (Yes)',
      accessor: 'percentage',
      render: (row) => (
        <div className="flex items-center">
          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
            <div 
              className="bg-green-500 h-2 rounded-full" 
              style={{ width: `${row.percentage.toFixed(1)}%` }}
            ></div>
          </div>
          <span>{row.percentage.toFixed(1)}%</span>
        </div>
      )
    }
  ];

  // Handle family member click
  const handleFamilyMemberClick = (primaryPerson: voterdayatype) => {
    const familyMembers = data.filter(row => 
      row.house_number === primaryPerson.house_number && 
      row.colony_name === primaryPerson.colony_name
    );
    setSelectedFamilyMembers(familyMembers);
    setSelectedPrimaryPerson(primaryPerson);
    setShowFamilyModal(true);
  };

  return (
    <div>
      {loading && <Loader />}

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-3 mb-5" role="tablist" aria-label="Finance tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'sorting'}
          aria-controls="tab-panel-sorting"
          onClick={() => setActiveTab('sorting')}
          className={`h-11 rounded-lg text-sm font-medium transition-colors
            ${activeTab === 'sorting'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
        >
          Data sorting
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'individual'}
          aria-controls="tab-panel-individual"
          onClick={() => setActiveTab('individual')}
          className={`h-11 rounded-lg text-sm font-medium transition-colors
            ${activeTab === 'individual'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
        >
          Individual
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'family'}
          aria-controls="tab-panel-family"
          onClick={() => setActiveTab('family')}
          className={`h-11 rounded-lg text-sm font-medium transition-colors
            ${activeTab === 'family'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
        >
          Family
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'colony'}
          aria-controls="tab-panel-colony"
          onClick={() => setActiveTab('colony')}
          className={`h-11 rounded-lg text-sm font-medium transition-colors
            ${activeTab === 'colony'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
        >
          Colony
        </button>
      </div>

      {/* Data sorting tab: original table and filters */}
      <div id="tab-panel-sorting" role="tabpanel" hidden={activeTab !== 'sorting'}>
        {activeTab === 'sorting' && (
          <Withoutbtn
            data={filteredData}
            columns={columns}
            title="Voter Findatasorting Management"
            filterOptions={[]}
            searchKey="full_name"
            inputfiled={
              <div className="inline-flex items-center gap-2 w-full md:w-auto">
                <select
                  value={colonyFilter}
                  onChange={e => setColonyFilter(e.target.value)}
                  disabled={loadingColonies}
                  className="h-11 w-full md:w-64 rounded-lg border px-4 py-2 text-sm"
                >
                  <option value="">
                    {loadingColonies ? 'Loading colonies...' : 'All Colonies'}
                  </option>
                  {colonyList.map((colony, index) => (
                    <option key={colony.colony_id} value={colony.colony_name}>
                      {index + 1}) {colony.colony_name}({colonyMemberCounts[String(colony.colony_id)] || 0})
                    </option>
                  ))}
                </select>

                <select
                  value={yesNoFilter}
                  onChange={e => setYesNoFilter(e.target.value)}
                  className="h-11 w-full md:w-40 rounded-lg border px-4 py-2 text-sm"
                >
                  <option value="">All</option>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>

                <button
                  type="button"
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-nowrap"
                  onClick={() => { setColonyFilter(''); setYesNoFilter(''); }}
                  disabled={loadingColonies}
                >
                  Clear Filter
                </button>
              </div>
            }
            submitbutton={
              <button
                type="button"
                onClick={handleSubmitSelections}
                disabled={submitting || Object.keys(radioSelections).length === 0}
                className="px-4 py-2 text-sm text-nowrap font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            }
          />
        )}
      </div>

      {/* Individual tab: auto-filter Finance Done = Yes; hide Yes/No dropdown */}
      <div id="tab-panel-individual" role="tabpanel" hidden={activeTab !== 'individual'}>
        {activeTab === 'individual' && (
          <Withoutbtn
            data={individualData}
            columns={columns}
            title="Individual - Finance Done (Yes)"
            filterOptions={[]}
            searchKey="full_name"
            inputfiled={
              <div className="inline-flex items-center gap-2 w-full md:w-auto">
                <select
                  value={colonyFilter}
                  onChange={e => setColonyFilter(e.target.value)}
                  disabled={loadingColonies}
                  className="h-11 w-full md:w-64 rounded-lg border px-4 py-2 text-sm"
                >
                  <option value="">
                    {loadingColonies ? 'Loading colonies...' : 'All Colonies'}
                  </option>
                  {colonyList.map((colony, index) => (
                    <option key={colony.colony_id} value={colony.colony_name}>
                      {index + 1}) {colony.colony_name}({colonyMemberCounts[String(colony.colony_id)] || 0})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-nowrap"
                  onClick={() => { setColonyFilter(''); }}
                  disabled={loadingColonies}
                >
                  Clear Filter
                </button>
              </div>
            }
            submitbutton={
              <button
                type="button"
                onClick={handleSubmitSelections}
                disabled={submitting || Object.keys(radioSelections).length === 0}
                className="px-4 py-2 text-sm text-nowrap font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            }
          />
        )}
      </div>

      {/* Family tab: Primary persons with family member modal */}
      <div id="tab-panel-family" role="tabpanel" hidden={activeTab !== 'family'}>
        {activeTab === 'family' && (
          <Withoutbtn
            data={familyData}
            columns={familyColumns}
            title="Primary Persons (Finance Done = Yes)"
            filterOptions={[]}
            searchKey="full_name"
          />
        )}
      </div>

      {/* Colony tab: Colony-wise statistics */}
      <div id="tab-panel-colony" role="tabpanel" hidden={activeTab !== 'colony'}>
        {activeTab === 'colony' && (
          <Withoutbtn
            data={colonyStats}
            columns={colonyColumns}
            title="Colony-wise Statistics"
            filterOptions={[]}
            searchKey="name"
          />
        )}
      </div>

      {/* Family Members Modal */}
      {showFamilyModal && (
        <div className="fixed inset-0  bg-black/40  flex items-center justify-center z-9999 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">
                Family Members - House Number: {selectedPrimaryPerson?.house_number}
              </h3>
              <button
                onClick={() => setShowFamilyModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <Withoutbtn
                data={selectedFamilyMembers}
                columns={familyModalColumns}
                title=""
                filterOptions={[]}
                searchKey="full_name"
              />
            </div>
            <div className="flex justify-end p-6 border-t">
              <button
                onClick={() => setShowFamilyModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Findatasorting;