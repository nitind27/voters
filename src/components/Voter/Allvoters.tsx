"use client";

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useToggleContext } from '@/context/ToggleContext';
import Label from "../form/Label";

import { Column } from "../tables/tabletype";


import Loader from '@/common/Loader';

import { colonyentrydatatype, Voterdatatye, voterdayatype } from './Votertype';
import { Withoutbtn } from '../tables/Withoutbtn';

// Colony type for API response
interface ColonyData {
  colony_id: number;
  colony_name: string;
  status: string;
}

type FormErrors = {

  usercategory?: string;
};

type Props = {
  colony: Voterdatatye[];
  colonyentry: colonyentrydatatype[];
  voterentry: voterdayatype[];
};

const Allvoters: React.FC<Props> = ({ voterentry }: Props) => {
  const [data, setData] = useState<voterdayatype[]>(voterentry || []);
  const [filteredData, setFilteredData] = useState<voterdayatype[]>(voterentry || []);
  const [inputValue, setInputValue] = useState('');
  const [colonyFilter, setColonyFilter] = useState('');
  const [colonyList, setColonyList] = useState<ColonyData[]>([]);
  const [loadingColonies, setLoadingColonies] = useState(false);
  const { isEditMode, setIsmodelopen, isvalidation, setisvalidation } = useToggleContext();
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setErrors] = useState<FormErrors>({});

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/usercategorycrud');
      const result = await response.json();
      setData(result);
      setFilteredData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {

    if (!isvalidation) {

      setErrors({})
    }
  }, [isvalidation])

  const validateInputs = () => {
    const newErrors: FormErrors = {};
    setisvalidation(true)

    if (!inputValue.trim()) {
      newErrors.usercategory = ("Category name is required");

    }
    if (inputValue.length < 3) {
      newErrors.usercategory = ("Category name must be at least 3 characters");

    }
    if (inputValue.length > 50) {
      newErrors.usercategory = ("Category name cannot exceed 50 characters");

    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (!isEditMode) {
      setInputValue("");
      setEditId(0);
    }
  }, [isEditMode]);

  const handleSave = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    const apiUrl = '/api/usercategorycrud';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_category_id: editId,
          category_name: inputValue
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      toast.success(editId ? 'Category updated successfully!' : 'Category created successfully!');
      setInputValue('');
      setEditId(null);
      fetchData();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(editId ? 'Failed to update category.' : 'Failed to create category.');
    } finally {
      setLoading(false);
      setIsmodelopen(false);
    }
  };



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
      key: 'gender',
      label: 'Gender',
      accessor: 'gender',
      render: (data) => (
        <span>
          {data.gender}
        </span>
      ),
    },
    {
      key: 'relation',
      label: 'Relation',
      accessor: 'relation',
      render: (data) => <span>{data.relation}</span>,
    },
    {
      key: 'dob',
      label: 'Date of Birth',
      accessor: 'dob',
      render: (data) => (
        <span className="text-sm">
          {new Date(data.dob).toLocaleDateString('en-IN')}
        </span>
      ),
    },
    {
      key: 'aadhaar_number',
      label: 'Aadhaar Number',
      accessor: 'aadhaar_number',
      render: (data) => (
        <span className="font-mono text-sm">
          {data.aadhaar_number ? `****${data.aadhaar_number.slice(-4)}` : 'N/A'}
        </span>
      ),
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
                e.currentTarget.src = '/images/user/default-avatar.png';
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
      {loading && <Loader />}

      {/* Colony Filter */}
      <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border">
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
                  {index + 1} ) {colony.colony_name}
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

      <Withoutbtn
        data={filteredData}
        inputfiled={
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-1">
            <div className="col-span-1">
              <Label>User Category</Label>
              <input
                type="text"
                placeholder="Enter category name"
                className={`h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 ${error.usercategory ? "border-red-500" : ""
                  }`}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  // Clear error when user starts typing

                }}
              />
              {error && (
                <div className="text-red-500 text-sm mt-1 pl-1">
                  {error.usercategory}
                </div>
              )}
            </div>
          </div>
        }
        columns={columns}
        title="User Category"
        filterOptions={[]}
        submitbutton={
          <button
            type="button"
            onClick={handleSave}
            className="bg-blue-700 text-white py-2 px-4 rounded"
            disabled={loading}
          >
            {loading ? 'Submitting...' : isEditMode ? 'Update' : 'Save Changes'}
          </button>
        }
        searchKey="category_name"

      />
    </div>
  );
};

export default Allvoters;
