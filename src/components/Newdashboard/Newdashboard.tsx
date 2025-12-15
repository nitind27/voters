"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
// import { formatDate } from "@/lib/utils";
import { Column } from "../tables/tabletype";
import { Withoutbtn } from "../tables/Withoutbtn";
import { toast } from "react-toastify";
import Loader from "@/common/Loader";

// Voter details data type - All fields from database
interface VoterDetailsData {
  id: number;
  Voter_Id: string;
  Ref_id: string;
  full_name: string;
  Father_name: string;
  Husband_name: string;
  Mother_name: string;
  other_name: string;
  Age: string;
  Gender: string;
  House_Number: string;
  Section_No_Name: string;
  Part_No: string;
  Page_NO: string;
  Publication_Date: string;
  Updated_colony: string;
  updated_mobile_no: string;
  Updated_photo: string;
  Field_1: string;
  Field_2: string;
  Field_3: string;
  Created_at: string;
  Updated_at: string;
  user_id: number;
  updated_house_number: string;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  recordsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Colony type for dropdown
interface ColonyData {
  colony_id: number;
  colony_name: string;
  status: string;
}

// Colony wise grouped data
interface ColonyWiseData {
  colony_id: string;
  colony_name: string;
  voters: VoterDetailsData[];
  totalVoters: number;
  totalHouses: number;
}

// Female voter data type (from voter_details table)
interface FemaleVoterData {
  id: number;
  Voter_Id: string;
  Ref_id: string;
  full_name: string;
  Father_name: string;
  Husband_name: string;
  Mother_name: string;
  Age: string;
  Gender: string;
  House_Number: string;
  Section_No_Name: string;
  Part_No: string;
  Updated_colony: string;
  updated_mobile_no: string;
  Updated_photo: string;
  updated_house_number: string;
  colony_name: string;
  female_survey: string; // Change from number to string
}

const Newdashboard: React.FC = () => {
  const [active, setActive] = useState<"voterwisedetails" | "allvoterdetails" | "femalevoters">("allvoterdetails");

  // State for Voterwisedetails tab
//   const [totalCount, setTotalCount] = useState<number>(0);
//   const [loadingCount, setLoadingCount] = useState(true);

  // State for All voter details tab
  const [voterData, setVoterData] = useState<VoterDetailsData[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  // Colony list for dropdown
  const [colonyList, setColonyList] = useState<ColonyData[]>([]);
  const [loadingColonies, setLoadingColonies] = useState(false);

  // State for Female Voters tab
  const [femaleVoterData, setFemaleVoterData] = useState<FemaleVoterData[]>([]);
  const [filteredFemaleData, setFilteredFemaleData] = useState<FemaleVoterData[]>([]);
  const [femaleLoading, setFemaleLoading] = useState(false);
  const [femaleColonyFilter, setFemaleColonyFilter] = useState('');
  const [femaleYesNoFilter, setFemaleYesNoFilter] = useState<string>(''); // '' | 'Yes' | 'No'

  // Edit modal state - Only 3 fields
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingVoter, setEditingVoter] = useState<VoterDetailsData | null>(null);
  const [editFormData, setEditFormData] = useState({
    Updated_colony: "",
    updated_house_number: "",
    updated_mobile_no: "",
  });
  const [saving, setSaving] = useState(false);

  // Colony wise modal state
  const [colonyModalOpen, setColonyModalOpen] = useState(false);
  const [selectedColonyData, setSelectedColonyData] = useState<ColonyWiseData | null>(null);
  const [colonySearchTerm, setColonySearchTerm] = useState("");

  // Fetch colony list
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

  // Fetch total count for Voterwisedetails tab
  const fetchTotalCount = async () => {
    // setLoadingCount(true);
    try {
      const res = await fetch("/api/voterdetailsdata/Voterdetailscounte");
      if (!res.ok) throw new Error("Failed to fetch count");
    //   const data = await res.json();
    //   setTotalCount(data.total || 0);
    } catch (error) {
      console.error("Error fetching count:", error);
    //   setTotalCount(0);
    } finally {
    //   setLoadingCount(false);
    }
  };

  // Fetch all voter details data
  const fetchVoterData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/voterdetailsdata/Voterdetailslist?limit=10000`);
      if (!res.ok) throw new Error("Failed to fetch voter data");
      const result = await res.json();
      setVoterData(result.data || []);
      setPagination(result.pagination || null);
    } catch (error) {
      console.error("Error fetching voter data:", error);
      setVoterData([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch female voter data from the API
  const fetchFemaleVoterData = useCallback(async () => {
    setFemaleLoading(true);
    try {
      const response = await fetch('/api/femalesurvey');
      if (!response.ok) throw new Error('Failed to fetch female voter data');
      const result = await response.json();
      setFemaleVoterData(result);
      setFilteredFemaleData(result);
    } catch {
      toast.error('Failed to load female voter data');
      setFemaleVoterData([]);
      setFilteredFemaleData([]);
    } finally {
      setFemaleLoading(false);
    }
  }, []);

  // Filter female voters by colony and yes/no
  useEffect(() => {
    let filtered = femaleVoterData;

    if (femaleColonyFilter) {
      filtered = filtered.filter(item =>
        item.colony_name?.toLowerCase().includes(femaleColonyFilter.toLowerCase())
      );
    }

    if (femaleYesNoFilter !== '') {
      filtered = filtered.filter(row => String(row.female_survey) === femaleYesNoFilter);
    }

    setFilteredFemaleData(filtered);
  }, [femaleColonyFilter, femaleYesNoFilter, femaleVoterData]);

  // Initial load
  useEffect(() => {
    fetchTotalCount();
    fetchColonies();
  }, []);

  // Load voter data when tab is active
  useEffect(() => {
    if ((active === "allvoterdetails" || active === "voterwisedetails") && voterData.length === 0) {
      fetchVoterData();
    }
    if (active === "femalevoters" && femaleVoterData.length === 0) {
      fetchFemaleVoterData();
    }
  }, [active, fetchVoterData, voterData.length, fetchFemaleVoterData, femaleVoterData.length]);

  // Group voters by colony
  const colonyWiseGroupedData = useMemo(() => {
    const colonyMap = new Map<string, VoterDetailsData[]>();

    voterData.forEach(voter => {
      const colonyId = voter.Updated_colony || "0";
      if (!colonyMap.has(colonyId)) {
        colonyMap.set(colonyId, []);
      }
      colonyMap.get(colonyId)!.push(voter);
    });

    const result: ColonyWiseData[] = [];

    colonyMap.forEach((voters, colonyId) => {
      const colony = colonyList.find(c => String(c.colony_id) === colonyId);
      const uniqueHouses = new Set(voters.map(v => v.updated_house_number || "No House"));

      result.push({
        colony_id: colonyId,
        colony_name: colony?.colony_name || (colonyId === "0" ? "Not Assigned" : `Colony ID: ${colonyId}`),
        voters: voters,
        totalVoters: voters.length,
        totalHouses: uniqueHouses.size,
      });
    });

    // Sort by colony name
    return result.sort((a, b) => a.colony_name.localeCompare(b.colony_name));
  }, [voterData, colonyList]);

  // Open colony modal
  const openColonyModal = (colonyData: ColonyWiseData) => {
    setSelectedColonyData(colonyData);
    setColonySearchTerm("");
    setColonyModalOpen(true);
  };

  // Close colony modal
  const closeColonyModal = () => {
    setColonyModalOpen(false);
    setSelectedColonyData(null);
    setColonySearchTerm("");
  };

  // Filtered voters in colony modal
  const filteredColonyVoters = useMemo(() => {
    if (!selectedColonyData) return [];
    if (!colonySearchTerm.trim()) return selectedColonyData.voters;

    const term = colonySearchTerm.toLowerCase();
    return selectedColonyData.voters.filter(voter => {
      return (
        (voter.full_name || "").toLowerCase().includes(term) ||
        (voter.Voter_Id || "").toLowerCase().includes(term) ||
        (voter.updated_house_number || "").toLowerCase().includes(term) ||
        (voter.updated_mobile_no || "").toLowerCase().includes(term) ||
        (voter.Father_name || "").toLowerCase().includes(term)
      );
    });
  }, [selectedColonyData, colonySearchTerm]);

  // Open edit modal
  const openEditModal = (voter: VoterDetailsData) => {
    setEditingVoter(voter);

    setEditFormData({
      Updated_colony: voter.Updated_colony || "",
      updated_house_number: voter.updated_house_number || "",
      updated_mobile_no: voter.updated_mobile_no || "",
    });
    setEditModalOpen(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingVoter(null);
    setEditFormData({
      Updated_colony: "",
      updated_house_number: "",
      updated_mobile_no: "",
    });
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save edited voter
  const handleSaveVoter = async () => {
    if (!editingVoter) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/voterdetailsdata/Voterdetailslist/${editingVoter.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Updated_colony: editFormData.Updated_colony,
          updated_house_number: editFormData.updated_house_number,
          updated_mobile_no: editFormData.updated_mobile_no,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update voter");
      }

      toast.success("Voter updated successfully!");
      closeEditModal();
      fetchVoterData(); // Refresh the data
    } catch (error) {
      console.error("Error updating voter:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update voter");
    } finally {
      setSaving(false);
    }
  };

  // Female voter member counts by colony
  const femaleColonyMemberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    femaleVoterData.forEach((v) => {
      const colonyId = v.Updated_colony || '0';
      counts[colonyId] = (counts[colonyId] || 0) + 1;
    });
    return counts;
  }, [femaleVoterData]);

  // Define columns for female voters table
  const femaleColumns: Column<FemaleVoterData>[] = useMemo(() => [
    { 
      key: 'colony_name', 
      label: 'Colony Name', 
      accessor: 'colony_name',
      render: (data) => (
        <span className="text-sm">{data.colony_name || 'Not Assigned'}</span>
      ),
    },
    { 
      key: 'House_Number', 
      label: 'House No', 
      accessor: 'House_Number',
      render: (data) => (
        <span className="text-sm">{data.updated_house_number || data.House_Number || 'N/A'}</span>
      ),
    },
    {
      key: 'full_name',
      label: 'Full Name',
      accessor: 'full_name',
      render: (data) => (
        <div className="flex flex-col">
          <span className="font-medium">{data.full_name || 'N/A'}</span>
          {data.Father_name && <span className="text-xs text-gray-500">Father: {data.Father_name}</span>}
          {data.Husband_name && <span className="text-xs text-gray-500">Husband: {data.Husband_name}</span>}
        </div>
      ),
    },
    {
      key: 'updated_mobile_no',
      label: 'Mobile',
      accessor: 'updated_mobile_no',
      render: (data) => (
        <span className="font-mono">{data.updated_mobile_no || 'N/A'}</span>
      ),
    },
    {
      key: 'Updated_photo',
      label: 'Photo',
      accessor: 'Updated_photo',
      render: (data) => (
        <div className="flex items-center">
          {data.Updated_photo ? (
            <img
              src={`https://voterbackend.weclocks.online/uploads/voter_photos/${data.Updated_photo}`}
              alt="Voter Photo"
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer"
              title="Click to preview"
              onClick={() =>
                setPreviewImg(`https://voterbackend.weclocks.online/uploads/voter_photos/${data.Updated_photo}`)
              }
              onError={(e) => {
                e.currentTarget.src = '/images/user/npimg.jpg';
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <img
                src={`/images/user/npimg.jpg`}
                alt="No Photo"
                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
              />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'Gender',
      label: 'Gender',
      accessor: 'Gender',
      render: (data) => (
        <span className="px-2 py-1 text-xs font-medium bg-pink-100 text-pink-700 rounded-full">
          {data.Gender === 'F' || data.Gender === 'Female' || data.Gender === 'female' ? 'स्त्री' : data.Gender}
        </span>
      ),
    },
    {
      key: 'Age',
      label: 'Age',
      accessor: 'Age',
      render: (data) => (
        <span className="text-sm">{data.Age || 'N/A'}</span>
      ),
    },
    { 
      key: 'Voter_Id', 
      label: 'Voter ID', 
      accessor: 'Voter_Id',
      render: (data) => (
        <span className="font-mono text-blue-600 text-sm">{data.Voter_Id || 'N/A'}</span>
      ),
    },
    { 
      key: 'Part_No', 
      label: 'Part No', 
      accessor: 'Part_No',
      render: (data) => (
        <span className="text-sm">{data.Part_No || 'N/A'}</span>
      ),
    },
    {
      key: 'female_survey',
      label: 'Survey Status',
      accessor: 'female_survey',
      render: (data) => (
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
          String(data.female_survey).toLowerCase() === 'yes'
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {String(data.female_survey).toLowerCase() === 'yes' ? 'Yes' : 'No'}
        </span>
      ),
    },
  ], []);

  // Define columns for the table
  const columns: Column<VoterDetailsData>[] = useMemo(() => [
    {
      key: 'Voter_Id',
      label: 'Voter ID',
      accessor: 'Voter_Id',
      render: (data) => (
        <span className="font-mono text-blue-600 dark:text-blue-400 text-sm">
          {data.Voter_Id || "N/A"}
        </span>
      ),
    },
    {
      key: 'full_name',
      label: 'Full Name',
      accessor: 'full_name',
      render: (data) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">{data.full_name || "N/A"}</span>
        </div>
      ),
    },
    {
      key: 'Father_name',
      label: 'Father Name',
      accessor: 'Father_name',
      render: (data) => (
        <span className="text-sm">{data.Father_name || "N/A"}</span>
      ),
    },
    {
      key: 'Age',
      label: 'Age',
      accessor: 'Age',
      render: (data) => (
        <span className="text-sm">{data.Age || "N/A"}</span>
      ),
    },
    {
      key: 'Gender',
      label: 'Gender',
      accessor: 'Gender',
      render: (data) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${data.Gender === "M" || data.Gender === "Male"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          : "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
          }`}>
          {data.Gender || "N/A"}
        </span>
      ),
    },
    {
      key: 'House_Number',
      label: 'House No',
      accessor: 'House_Number',
      render: (data) => (
        <span className="text-sm">{data.House_Number || "N/A"}</span>
      ),
    },
    {
      key: 'Updated_colony',
      label: 'Colony',
      accessor: 'Updated_colony',
      render: (data) => {
        // Find colony name by colony_id
        const colony = colonyList.find(c => String(c.colony_id) === data.Updated_colony);
        return (
          <span className="text-sm">{colony?.colony_name || data.Updated_colony || "N/A"}</span>
        );
      },
    },
    {
      key: 'updated_mobile_no',
      label: 'Mobile',
      accessor: 'updated_mobile_no',
      render: (data) => (
        <span className="font-mono text-sm">{data.updated_mobile_no || "N/A"}</span>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (data) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(data)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        </div>
      ),
    },
  ], [colonyList]);

  return (
    <div className="">
      {/* Button grid tabs */}
      <div className="grid grid-cols-3 gap-3 mb-5" role="tablist" aria-label="Voter tabs">
      <button
          type="button"
          role="tab"
          aria-selected={active === "allvoterdetails"}
          aria-controls="tab-panel-allvoterdetails"
          onClick={() => setActive("allvoterdetails")}
          className={`h-11 rounded-lg text-sm font-medium transition-colors
            ${active === "allvoterdetails"
              ? "bg-blue-600 text-white shadow"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}
        >
          Voter Details
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "voterwisedetails"}
          aria-controls="tab-panel-voterwisedetails"
          onClick={() => setActive("voterwisedetails")}
          className={`h-11 rounded-lg text-sm font-medium transition-colors
            ${active === "voterwisedetails"
              ? "bg-blue-600 text-white shadow"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}
        >
          Colony wise Voter details
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "femalevoters"}
          aria-controls="tab-panel-femalevoters"
          onClick={() => setActive("femalevoters")}
          className={`h-11 rounded-lg text-sm font-medium transition-colors
            ${active === "femalevoters"
              ? "bg-pink-600 text-white shadow"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}
        >
          Male Female Voters
        </button>

      </div>

      {/* Panels */}
      <div
        id="tab-panel-voterwisedetails"
        role="tabpanel"
        hidden={active !== "voterwisedetails"}
        className="focus:outline-none"
      >
        {active === "voterwisedetails" && (
          <div className="bg-white rounded-2xl shadow-md border p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Colony Wise Voter Details
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchVoterData}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Refresh"}
                </button>
                {pagination && (
                  <span className="text-sm text-gray-600">
                    Total: <span className="font-semibold text-blue-600">{pagination.totalRecords.toLocaleString()}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 border text-left">Sr</th>
                      <th className="px-3 py-2 border text-left">Colony</th>
                      <th className="px-3 py-2 border text-left">Total Houses</th>
                      <th className="px-3 py-2 border text-left">Total Voters</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colonyWiseGroupedData.length === 0 ? (
                      <tr>
                        <td className="px-3 py-2 border" colSpan={4}>
                          No data found
                        </td>
                      </tr>
                    ) : (
                      colonyWiseGroupedData.map((colony, idx) => (
                        <tr key={colony.colony_id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 border">{idx + 1}</td>
                          <td className="px-3 py-2 border font-medium">{colony.colony_name}</td>
                          <td className="px-3 py-2 border">{colony.totalHouses}</td>
                          <td className="px-3 py-2 border">
                            <button
                              onClick={() => openColonyModal(colony)}
                              className="text-blue-600 underline hover:text-blue-800 font-medium"
                            >
                              {colony.totalVoters}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {colonyWiseGroupedData.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-100 font-semibold">
                        <td className="px-3 py-2 border" colSpan={2}>Total</td>
                        <td className="px-3 py-2 border">
                          {colonyWiseGroupedData.reduce((sum, c) => sum + c.totalHouses, 0)}
                        </td>
                        <td className="px-3 py-2 border">
                          {colonyWiseGroupedData.reduce((sum, c) => sum + c.totalVoters, 0)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        id="tab-panel-allvoterdetails"
        role="tabpanel"
        hidden={active !== "allvoterdetails"}
        className="focus:outline-none"
      >
        {active === "allvoterdetails" && (
          <div className="">
            {loading ? (
              <div className="bg-white rounded-2xl shadow-md border p-8 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  <p className="text-gray-500">Loading voter details...</p>
                </div>
              </div>
            ) : (
              <Withoutbtn
                data={voterData}
                inputfiled={
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex gap-2">
                      <button
                        onClick={fetchVoterData}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Refresh Data
                      </button>
                    </div>
                    {pagination && (
                      <div className="text-sm text-gray-600">
                        Total Records: <span className="font-semibold text-blue-600">{pagination.totalRecords.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                }
                columns={columns}
                title="All Voter Details"
                filterOptions={[]}
                searchKey="full_name"
              />
            )}
          </div>
        )}
      </div>

      {/* Female Voters Tab Panel */}
      <div
        id="tab-panel-femalevoters"
        role="tabpanel"
        hidden={active !== "femalevoters"}
        className="focus:outline-none"
      >
        {active === "femalevoters" && (
          <div className="">
            {femaleLoading && <Loader />}
            <Withoutbtn
              data={filteredFemaleData}
              columns={femaleColumns}
              title="Female Voters (स्त्री मतदार)"
              filterOptions={[]}
              searchKey="full_name"
              inputfiled={
                <div className="inline-flex items-center gap-2 w-full md:w-auto">
                  <select
                    value={femaleColonyFilter}
                    onChange={e => setFemaleColonyFilter(e.target.value)}
                    disabled={loadingColonies}
                    className="h-11 w-full md:w-64 rounded-lg border px-4 py-2 text-sm"
                  >
                    <option value="">
                      {loadingColonies ? 'Loading colonies...' : 'All Colonies'}
                    </option>
                    {colonyList.map((colony, index) => (
                      <option key={colony.colony_id} value={colony.colony_name}>
                        {index + 1}) {colony.colony_name}({femaleColonyMemberCounts[String(colony.colony_id)] || 0})
                      </option>
                    ))}
                  </select>

                  <select
                    value={femaleYesNoFilter}
                    onChange={e => setFemaleYesNoFilter(e.target.value)}
                    className="h-11 w-full md:w-40 rounded-lg border px-4 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>

                  <button
                    type="button"
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-nowrap"
                    onClick={() => { setFemaleColonyFilter(''); setFemaleYesNoFilter(''); }}
                    disabled={loadingColonies}
                  >
                    Clear Filter
                  </button>

                  <span className="text-sm text-gray-600">
                    Total: <span className="font-semibold text-pink-600">{filteredFemaleData.length}</span>
                  </span>
                </div>
              }
            />
          </div>
        )}
      </div>

      {/* Colony Voters Modal */}
      {colonyModalOpen && selectedColonyData && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={closeColonyModal}
        >
          <div
            className="relative w-[95vw] max-w-6xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {selectedColonyData.colony_name} - Voters
                </h3>
                <p className="text-sm text-gray-500">
                  Total: {selectedColonyData.totalVoters} voters | {selectedColonyData.totalHouses} houses
                </p>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                onClick={closeColonyModal}
                aria-label="Close"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Box */}
            <div className="px-6 py-3 border-b">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, voter ID, house number, mobile..."
                  value={colonySearchTerm}
                  onChange={(e) => setColonySearchTerm(e.target.value)}
                  className="w-full h-10 px-4 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {colonySearchTerm && (
                <p className="text-sm text-gray-600 mt-2">
                  Showing {filteredColonyVoters.length} of {selectedColonyData.totalVoters} voters
                </p>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 border text-left">Sr</th>
                    <th className="px-3 py-2 border text-left">Voter ID</th>
                    <th className="px-3 py-2 border text-left">Full Name</th>
                    <th className="px-3 py-2 border text-left">Father Name</th>
                    <th className="px-3 py-2 border text-left">House No</th>
                    <th className="px-3 py-2 border text-left">Age</th>
                    <th className="px-3 py-2 border text-left">Gender</th>
                    <th className="px-3 py-2 border text-left">Mobile</th>
                    <th className="px-3 py-2 border text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredColonyVoters.length === 0 ? (
                    <tr>
                      <td className="px-3 py-2 border text-center" colSpan={9}>
                        {colonySearchTerm ? "No voters found matching your search" : "No voters found"}
                      </td>
                    </tr>
                  ) : (
                    filteredColonyVoters.map((voter, idx) => (
                      <tr key={voter.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 border">{idx + 1}</td>
                        <td className="px-3 py-2 border font-mono text-blue-600">{voter.Voter_Id || "N/A"}</td>
                        <td className="px-3 py-2 border font-medium">{voter.full_name || "N/A"}</td>
                        <td className="px-3 py-2 border">{voter.Father_name || "N/A"}</td>
                        <td className="px-3 py-2 border">{voter.updated_house_number || voter.House_Number || "N/A"}</td>
                        <td className="px-3 py-2 border">{voter.Age || "N/A"}</td>
                        <td className="px-3 py-2 border">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${voter.Gender === "M" || voter.Gender === "Male"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-pink-100 text-pink-700"
                            }`}>
                            {voter.Gender || "N/A"}
                          </span>
                        </td>
                        <td className="px-3 py-2 border font-mono">{voter.updated_mobile_no || "N/A"}</td>
                        <td className="px-3 py-2 border">
                          <button
                            onClick={() => {
                              closeColonyModal();
                              openEditModal(voter);
                            }}
                            className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={closeColonyModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Only 3 Fields: Colony, House Number, Mobile Number */}
      {editModalOpen && editingVoter && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={closeEditModal}
        >
          <div
            className="relative w-[95vw] max-w-md max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Edit Voter Details
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {editingVoter.full_name} ({editingVoter.Voter_Id})
                </p>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                onClick={closeEditModal}
                aria-label="Close"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body - Only 3 Fields */}
            <div className="p-6">
              <div className="space-y-4">

                {/* Colony Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Colony <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="Updated_colony"
                    value={editFormData.Updated_colony}
                    onChange={handleInputChange}
                    disabled={loadingColonies}
                    className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition-colors bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {loadingColonies ? 'Loading colonies...' : 'Select Colony'}
                    </option>
                    {colonyList.map((colony) => (
                      <option
                        key={colony.colony_id}
                        value={String(colony.colony_id)}
                      >
                        {colony.colony_name}
                      </option>
                    ))}
                  </select>
                  {/* Show current selected colony name */}
                  {editFormData.Updated_colony && (
                    <p className="mt-1 text-xs text-green-600">
                      Selected: {colonyList.find(c => String(c.colony_id) === editFormData.Updated_colony)?.colony_name || editFormData.Updated_colony}
                    </p>
                  )}
                </div>

                {/* House Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    House Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="updated_house_number"
                    value={editFormData.updated_house_number}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition-colors"
                    placeholder="Enter House Number"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="updated_mobile_no"
                    value={editFormData.updated_mobile_no}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition-colors"
                    placeholder="Enter Mobile Number"
                    maxLength={10}
                  />
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveVoter}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                (e.currentTarget as HTMLImageElement).src = "/images/user/npimg.jpg";
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Newdashboard;
