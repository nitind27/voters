"use client";
import { useEffect, useMemo, useState } from 'react';
import Label from "../form/Label";
import { ReusableTable } from "../tables/BasicTableOne";
import { Column } from "../tables/tabletype";
import { toast } from 'react-toastify';
import { useToggleContext } from '@/context/ToggleContext';

import { colonyentrydatatype, Voterdatatye, voterdayatype } from './Votertype';

type Props = {
  colony: Voterdatatye[];
  colonyentry: colonyentrydatatype[];
  voterentry: voterdayatype[];
};

type FormErrors = {
  colony?: string;
};

// New interface for voter checkbox data
interface VoterCheckboxData {
  id: number;
  colony_id: number;
  member_id: number;
  checkbox_data: string;
  created_at: string;
  updated_at: string;
}

// Row used in the table and handlers
interface VoterRow extends VoterCheckboxData {
  sr_no: number;
  full_name: string;
  c1: boolean;
  c2: boolean;
  c3: boolean;
  c4: boolean;
}

const Voterdata = ({ colony, colonyentry, voterentry }: Props) => {
  // const [data, setData] = useState<Voterdatatye[]>(colony || []);
  const [selectedColonyId, setSelectedColonyId] = useState('');
  // const [editId, setEditId] = useState<number | null>(null);
  const { isActive, setIsActive, isEditMode, setIsEditmode, setIsmodelopen, isvalidation, setisvalidation } = useToggleContext();
  const [loading, setLoading] = useState(false);
  const [error, setErrors] = useState<FormErrors>({});
  const [voterCheckboxData, setVoterCheckboxData] = useState<VoterCheckboxData[]>([]);
  const [editMemberId, setEditMemberId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<VoterRow | null>(null);

  // Members filtering and checkbox state
  type MemberChecks = { c1: boolean; c2: boolean; c3: boolean; c4: boolean };

  const filteredColonyEntries = useMemo(() => {
    if (!selectedColonyId) return [];
    return colonyentry.filter((c) => String(c.colony_id) === String(selectedColonyId));
  }, [selectedColonyId, colonyentry]);

  const filteredMembers = useMemo(() => {
    if (!filteredColonyEntries.length) return [];
    const ids = new Set(filteredColonyEntries.map((c) => String(c.colony_entry_id)));
    return voterentry.filter((v) => ids.has(String(v.colony_entry_id)));
  }, [filteredColonyEntries, voterentry]);

  const [checks, setChecks] = useState<Record<number, MemberChecks>>({});

  const membersToRender = useMemo(() => {
    if (editMemberId) return voterentry.filter(v => v.voter_id === editMemberId);
    return filteredMembers;
  }, [editMemberId, voterentry, filteredMembers]);

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

  const tableRows = useMemo(() => {
    const toBool = (v: string) => v === 'true' || v === '1';
    return voterCheckboxData.map((r, idx) => {
      const voter = voterentry.find(v => String(v.voter_id) === String(r.member_id));
      const name = voter
        ? voter.full_name ||
          [ voter.first_name, voter.middle_name, voter.last_name ]
            .filter(Boolean)
            .join(' ')
        : '';

      const arr = String(r.checkbox_data || '').split('|');

      return {
        ...r,
        sr_no: idx + 1,
        full_name: name,
        c1: toBool(arr[0] || 'false'),
        c2: toBool(arr[1] || 'false'),
        c3: toBool(arr[2] || 'false'),
        c4: toBool(arr[3] || 'false'),
      };
    });
  }, [voterCheckboxData, voterentry]);
  // Fetch existing checkbox data when colony changes
  const fetchCheckboxData = async (colonyId?: string) => {
    try {
      const url = colonyId ? `/api/voterinsertdata?colony_id=${colonyId}` : '/api/voterinsertdata';
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        setVoterCheckboxData(result.data || []);

        if (colonyId) {
          // Update checks state with existing data (only when colony selected)
          const existingChecks: Record<number, MemberChecks> = {};
          result.data.forEach((item: VoterCheckboxData) => {
            const checkboxArray = item.checkbox_data.split('|');
            existingChecks[item.member_id] = {
              c1: checkboxArray[0] === 'true',
              c2: checkboxArray[1] === 'true',
              c3: checkboxArray[2] === 'true',
              c4: checkboxArray[3] === 'true'
            };
          });
          setChecks(existingChecks);
        }
      }
    } catch (error) {
      console.error('Error fetching checkbox data:', error);
    }
  };

  useEffect(() => {
    // Load all inserted records by default on first mount
    fetchCheckboxData();
  }, []);

  useEffect(() => {
    if (selectedColonyId) {
      fetchCheckboxData(selectedColonyId);
    }
  }, [selectedColonyId]);

  useEffect(() => {
    if (!isvalidation) {
      setErrors({});
    }
  }, [isvalidation]);

  const reset = () => {
    // setEditId(0);
    setChecks({});
    setErrors({});
    setSelectedColonyId('');
    setEditMemberId(null);
  };

  useEffect(() => {
    if (!isEditMode) {
      reset();
    }
  }, [isEditMode]);

  const validateInputs = () => {
    const newErrors: FormErrors = {};
    setisvalidation(true);

    if (!editMemberId && !selectedColonyId) {
      newErrors.colony = "Colony is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateInputs()) return;
    setLoading(true);

    try {
      // If editing a single member, send a single PUT request
      if (editMemberId) {
        const memberChecks = checks[editMemberId] || { c1: false, c2: false, c3: false, c4: false };
        const checkboxData = [
          memberChecks.c1.toString(),
          memberChecks.c2.toString(),
          memberChecks.c3.toString(),
          memberChecks.c4.toString()
        ];

        // Determine colony for this member
        let colonyForMember = selectedColonyId;
        if (!colonyForMember) {
          const voter = voterentry.find(v => v.voter_id === editMemberId);
          const ce = voter ? colonyentry.find(c => String(c.colony_entry_id) === String(voter.colony_entry_id)) : undefined;
          colonyForMember = ce ? String(ce.colony_id) : '';
        }

        const resp = await fetch('/api/voterinsertdata', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            colony_id: colonyForMember,
            member_id: editMemberId,
            checkbox_data: checkboxData
          })
        });
        if (!resp.ok) throw new Error('Failed to update');

        toast.success('Record updated');
        setEditMemberId(null);
        if (selectedColonyId) {
          fetchCheckboxData(selectedColonyId);
        } else {
          fetchCheckboxData();
        }
        return;
      }

      // Only save data for members who have at least one checkbox selected
      const membersToSave = filteredMembers.filter((member) => {
        const memberChecks = checks[member.voter_id] || { c1: false, c2: false, c3: false, c4: false };
        return memberChecks.c1 || memberChecks.c2 || memberChecks.c3 || memberChecks.c4;
      });

      if (membersToSave.length === 0) {
        toast.warning('Please select at least one checkbox for any member before saving.');
        setLoading(false);
        return;
      }

      // Save checkbox data for each member with selected checkboxes
      const savePromises = membersToSave.map(async (member) => {
        const memberChecks = checks[member.voter_id] || { c1: false, c2: false, c3: false, c4: false };
        const checkboxData = [
          memberChecks.c1.toString(),
          memberChecks.c2.toString(),
          memberChecks.c3.toString(),
          memberChecks.c4.toString()
        ];

        const response = await fetch('/api/voterinsertdata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            colony_id: selectedColonyId,
            member_id: member.voter_id,
            checkbox_data: checkboxData
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      });

      await Promise.all(savePromises);

      toast.success(`Voter data saved successfully for ${membersToSave.length} member(s)!`);
      fetchCheckboxData(selectedColonyId);
    } catch (error) {
      console.error('Error saving voter data:', error);
      toast.error('Failed to save voter data. Please try again.');
    } finally {
      setLoading(false);
      reset();
      setIsmodelopen(false);
    }
  };

  const handleRowEdit = (row: VoterRow) => {
    setIsActive(!isActive)
    setIsmodelopen(true);
    setIsEditmode(true);
    if (row.colony_id) setSelectedColonyId(String(row.colony_id));

    // Load saved checks from checkbox_data if present
    let parsed = { c1: false, c2: false, c3: false, c4: false };
    if (row.checkbox_data) {
      const arr = String(row.checkbox_data).split('|');
      parsed = {
        c1: arr[0] === 'true',
        c2: arr[1] === 'true',
        c3: arr[2] === 'true',
        c4: arr[3] === 'true'
      };
    } else {
      parsed = {
        c1: Boolean(row.c1),
        c2: Boolean(row.c2),
        c3: Boolean(row.c3),
        c4: Boolean(row.c4)
      };
    }

    setChecks(prev => ({
      ...prev,
      [row.member_id]: parsed
    }));

    setEditMemberId(row.member_id);
  };

  const handleRowDelete = async (row: VoterRow) => {
    try {
      const resp = await fetch('/api/voterinsertdata', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colony_id: row.colony_id, member_id: row.member_id })
      });
      if (!resp.ok) throw new Error('Failed to delete');
      toast.success('Record deleted');
      if (selectedColonyId) {
        fetchCheckboxData(selectedColonyId);
      } else {
        fetchCheckboxData();
      }
    } catch (e) {
      console.error(e);
      toast.error('Delete failed');
    }
  };

  const openDeleteModal = (row: VoterRow) => {
    setRowToDelete(row);
    setIsDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteOpen(false);
    setRowToDelete(null);
  };

  const confirmDelete = async () => {
    if (!rowToDelete) return;
    await handleRowDelete(rowToDelete);
    closeDeleteModal();
  };

  const columns: Column<VoterRow>[] = [
   
    {
      key: 'full_name',
      label: 'Member Name',
      accessor: 'full_name',
      render: (row) => <span className="font-medium">{row.full_name}</span>
    },
    {
      key: 'c1',
      label: 'Match with corporation List',
      accessor: 'c1',
      render: (row) => <span className="font-mono">{row.c1 ? '✓' : '✗'}</span>
    },
    {
      key: 'c2',
      label: 'Name in corporation list but not found in physical data',
      accessor: 'c2',
      render: (row) => <span className="font-mono">{row.c2 ? '✓' : '✗'}</span>
    },
    {
      key: 'c3',
      label: 'Name in physical but not in corporation list',
      accessor: 'c3',
      render: (row) => <span className="font-mono">{row.c3 ? '✓' : '✗'}</span>
    },
    {
      key: 'c4',
      label: 'Address Mismatch',
      accessor: 'c4',
      render: (row) => <span className="font-mono">{row.c4 ? '✓' : '✗'}</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button
            type="button"
            className="px-2 py-1 text-xs rounded bg-blue-600 text-white"
            onClick={() => handleRowEdit(row)}
          >
            Edit
          </button>
          <button
            type="button"
            className="px-2 py-1 text-xs rounded bg-red-600 text-white"
            onClick={() => openDeleteModal(row)}
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="mt-5">
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-md shadow max-w-[600px] w-full p-5 lg:p-10">
            <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">
              Confirmation
            </h4>
            <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
              Are you sure you want to delete ?
            </p>
            <div className="flex items-center justify-end w-full gap-3 mt-8">
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                onClick={closeDeleteModal}
              >
                Close
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded bg-red-600 text-white"
                onClick={confirmDelete}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      <ReusableTable
        data={tableRows}
        classname={"h-auto overflow-y-auto scrollbar-hide"}
        inputfiled={
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-1">
            <div>
              <Label>Colony</Label>
              <select
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                  ${error.colony ? 'border-red-500' : 'border-gray-300'} bg-white text-gray-800`}
                value={selectedColonyId}
                onChange={(e) => setSelectedColonyId(e.target.value)}
              >
                <option value="">Select Colony</option>
                {colony.map((category) => (
                  <option key={category.colony_id} value={category.colony_id}>
                    {category.colony_name} ({colonyMemberCounts[String(category.colony_id)] || 0})
                  </option>
                ))}
              </select>
              {error.colony && <span className="text-red-500 text-xs">{error.colony}</span>}
            </div>

            {selectedColonyId && (
              <div>
                <Label>Members ({membersToRender.length})</Label>
                {membersToRender.length === 0 ? (
                  <div className="text-sm text-gray-500">No members found for this colony.</div>
                ) : (
                  <div className="border rounded-md overflow-x-auto">
                    <table className="min-w-full border border-gray-300 ">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                            Sr. No.
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                            Colony
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                            Member Name
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                            Match with corporation List
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                            Name in corporation list but not found in physical data
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                            Name in physical but not in corporation list
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                            Address Mismatch
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {membersToRender.map((m, index) => (
                          <tr key={m.voter_id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm font-medium text-gray-900 border border-gray-300">
                              {index + 1}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 border border-gray-300">
                              {(() => {
                                const ce = colonyentry.find(ce => String(ce.colony_entry_id) === String(m.colony_entry_id));
                                const name = colony.find(c => String(c.colony_id) === String(ce?.colony_id))?.colony_name;
                                return name || String(ce?.colony_id || '');
                              })()}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 border border-gray-300">
                              {m.full_name || [m.first_name, m.middle_name, m.last_name].filter(Boolean).join(' ')}
                            </td>
                            <td className="px-3 py-2 text-center border border-gray-300">
                              <input
                                type="checkbox"
                                className="accent-blue-600 w-4 h-4"
                                checked={Boolean(checks[m.voter_id]?.c1)}
                                onChange={() => setChecks(prev => { const prevRow = prev[m.voter_id] || { c1: false, c2: false, c3: false, c4: false }; return { ...prev, [m.voter_id]: { ...prevRow, c1: !prevRow.c1 } }; })}
                              />
                            </td>
                            <td className="px-3 py-2 text-center border border-gray-300">
                              <input
                                type="checkbox"
                                className="accent-blue-600 w-4 h-4"
                                checked={Boolean(checks[m.voter_id]?.c2)}
                                onChange={() => setChecks(prev => { const prevRow = prev[m.voter_id] || { c1: false, c2: false, c3: false, c4: false }; return { ...prev, [m.voter_id]: { ...prevRow, c2: !prevRow.c2 } }; })}
                              />
                            </td>
                            <td className="px-3 py-2 text-center border border-gray-300">
                              <input
                                type="checkbox"
                                className="accent-blue-600 w-4 h-4"
                                checked={Boolean(checks[m.voter_id]?.c3)}
                                onChange={() => setChecks(prev => { const prevRow = prev[m.voter_id] || { c1: false, c2: false, c3: false, c4: false }; return { ...prev, [m.voter_id]: { ...prevRow, c3: !prevRow.c3 } }; })}
                              />
                            </td>
                            <td className="px-3 py-2 text-center border border-gray-300">
                              <input
                                type="checkbox"
                                className="accent-blue-600 w-4 h-4"
                                checked={Boolean(checks[m.voter_id]?.c4)}
                                onChange={() => setChecks(prev => { const prevRow = prev[m.voter_id] || { c1: false, c2: false, c3: false, c4: false }; return { ...prev, [m.voter_id]: { ...prevRow, c4: !prevRow.c4 } }; })}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                )}
              </div>
            )}
          </div>
        }
        columns={columns}
        title="Voter Data Management"
        filterOptions={[]}
        submitbutton={
          <button
            type='button'
            onClick={handleSave}
            className='bg-blue-700 text-white py-2 px-4 rounded hover:bg-blue-800 transition-colors'
            disabled={loading || (!selectedColonyId && !editMemberId)}
          >
            {loading ? 'Saving...' : (editMemberId ? 'Update Record' : 'Save Changes')}
          </button>
        }
        searchKey="full_name"
      />
    </div>
  );
};

export default Voterdata;