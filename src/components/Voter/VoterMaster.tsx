"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ReusableTable } from "../tables/BasicTableOne";
import { Column } from "../tables/tabletype";
import Label from "../form/Label";

type VoterMasterRow = {
  id: number;
  Voter_Id: string;
  full_name: string;
  House_Number: string | null;
  Updated_colony: string | null;
  updated_house_number: string | null;
  updated_mobile_no: string | null;

  volunteer_name: string | null;
  volunteer_mobile: string | null;
  volunteer_status: "Active" | "Inactive" | null;
  assigned_colony_name?: string | null;

  inst_1_paid: number;
  inst_2_paid: number;
  inst_3_paid: number;

  voting_paid: number;
  voting_in_transit: number;
  voting_status: "Pending" | "In Transit" | "Completed" | null;
};

type ApiResponse = {
  data: VoterMasterRow[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
  };
};

const VoterMaster: React.FC = () => {
  const [rows, setRows] = useState<VoterMasterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"A" | "B" | "C" | "D">("A");

  // B tab state
  type ColonyOption = { colony_id: number; colony_name: string };
  type VolunteerMasterApiItem = {
    user_id: number;
    volunteer_name: string;
    contact_no: string;
    colony_id: string | null;
    status: string;
    username: string;
    password: string;
    created_at?: string;
    updated_at?: string;
    colony_names: string;
    colony_ids: number[];
  };
  type AssignRow = {
    id: number;
    sr_no: number;
    volunteer_name: string;
    contact_no: string;
    colony_names: string;
    status: string;
    username: string;
    password: string;
  };
  const [colonies, setColonies] = useState<ColonyOption[]>([]);
  const [loadingColonies, setLoadingColonies] = useState(false);
  const [assignVolunteerName, setAssignVolunteerName] = useState("");
  const [assignVolunteerMobile, setAssignVolunteerMobile] = useState("");
  const [assignVolunteerStatus, setAssignVolunteerStatus] = useState<"Active" | "Inactive">("Active");
  const [selectedColonies, setSelectedColonies] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignRows, setAssignRows] = useState<AssignRow[]>([]);
  const [loadingAssignData, setLoadingAssignData] = useState(false);
  const [searchContact, setSearchContact] = useState("");

  const fetchData = async (pageNo = 1, searchText = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageNo));
      params.set("limit", "50");
      if (searchText.trim()) params.set("search", searchText.trim());

      const res = await fetch(`/api/votermaster?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load voter master data");
      const json: ApiResponse = await res.json();
      setRows(json.data || []);
      setPage(json.pagination.currentPage);
      setTotalPages(json.pagination.totalPages);
    } catch (e) {
      console.error(e);
      toast.error("डेटा लोड होत नाही, नंतर पुन्हा प्रयत्न करा.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, "");
  }, []);

  // Load colony list for B tab
  useEffect(() => {
    const loadColonies = async () => {
      try {
        setLoadingColonies(true);
        const res = await fetch("/api/colony");
        if (!res.ok) throw new Error("Failed to fetch colonies");
        const json = await res.json();
        setColonies(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error(e);
        toast.error("Colony list load होत नाही.");
      } finally {
        setLoadingColonies(false);
      }
    };
    loadColonies();
  }, []);

  // Fetch volunteer_master data for B tab
  const fetchAssignData = async (searchText = "") => {
    setLoadingAssignData(true);
    try {
      const params = new URLSearchParams();
      if (searchText.trim()) params.set("search", searchText.trim());
      
      const res = await fetch(`/api/volunteermaster?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load volunteer master data");
      const json = await res.json();
      const processedData = (json.data || []).map((item: VolunteerMasterApiItem, index: number) => ({
        id: item.user_id || index,
        sr_no: index + 1,
        volunteer_name: item.volunteer_name || "",
        contact_no: item.contact_no || "",
        colony_names: item.colony_names || "",
        colony_ids: item.colony_ids || [],
        status: item.status || "Active",
        username: item.username || "",
        password: item.password || "",
      }));
      setAssignRows(processedData);
    } catch (e) {
      console.error(e);
      toast.error("Volunteer data load होत नाही.");
    } finally {
      setLoadingAssignData(false);
    }
  };

  // Search volunteer by contact_no and populate form
  const handleSearchVolunteer = async () => {
    if (!searchContact.trim()) {
      toast.error("Please enter contact number to search");
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set("search", searchContact.trim());
      
      const res = await fetch(`/api/volunteermaster?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to search volunteer");
      const json = await res.json();
      
      if (json.data && json.data.length > 0) {
        const volunteer = json.data[0];
        
        // Populate form fields
        setAssignVolunteerName(volunteer.volunteer_name || "");
        setAssignVolunteerMobile(volunteer.contact_no || "");
        setAssignVolunteerStatus(volunteer.status || "Active");
        
        // Pre-select colonies
        if (volunteer.colony_ids && volunteer.colony_ids.length > 0) {
          // Get colony names for the colony_ids
          const colonyNames: string[] = [];
          volunteer.colony_ids.forEach((colonyId: number) => {
            const colony = colonies.find(c => c.colony_id === colonyId);
            if (colony) {
              colonyNames.push(colony.colony_name);
            }
          });
          setSelectedColonies(colonyNames);
        } else {
          setSelectedColonies([]);
        }
        
        toast.success("Volunteer found and form populated");
      } else {
        toast.info("No volunteer found with this contact number");
        // Clear form if not found
        setAssignVolunteerName("");
        setAssignVolunteerMobile("");
        setSelectedColonies([]);
        setAssignVolunteerStatus("Active");
      }
      
      // Refresh table with search results
      await fetchAssignData(searchContact.trim());
    } catch (e) {
      console.error(e);
      toast.error("Search failed. Please try again.");
    }
  };

  // Load assign data when B tab is active
  useEffect(() => {
    if (activeTab === "B") {
      fetchAssignData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleSaveRow = async (row: VoterMasterRow) => {
    try {
      setSavingId(row.id);
      const res = await fetch(`/api/voterdetailsdata/Voterdetailslist/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Updated_colony: row.Updated_colony,
          updated_house_number: row.updated_house_number,
          updated_mobile_no: row.updated_mobile_no,

          volunteer_name: row.volunteer_name,
          volunteer_mobile: row.volunteer_mobile,
          volunteer_status: row.volunteer_status,
          assigned_colony_name: row.assigned_colony_name,

          inst_1_paid: row.inst_1_paid,
          inst_2_paid: row.inst_2_paid,
          inst_3_paid: row.inst_3_paid,

          voting_paid: row.voting_paid,
          voting_in_transit: row.voting_in_transit,
          voting_status: row.voting_status,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to update");
      toast.success("रेकॉर्ड सेव्ह झाला.");
      fetchData(page, search);
    } catch (e) {
      console.error(e);
      toast.error("रेकॉर्ड सेव्ह होत नाही.");
    } finally {
      setSavingId(null);
    }
  };

  const updateRow = (id: number, patch: Partial<VoterMasterRow>) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };

  // Bulk assign volunteer to selected colonies (B tab)
  const handleBulkAssign = async () => {
    if (!assignVolunteerName.trim()) {
      toast.error("Volunteer Name आवश्यक आहे.");
      return;
    }
    if (!selectedColonies.length) {
      toast.error("किमान एक Colony निवडा.");
      return;
    }

    try {
      setAssigning(true);
      const res = await fetch("/api/votermaster/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volunteer_name: assignVolunteerName.trim(),
          volunteer_mobile: assignVolunteerMobile.trim() || null,
          volunteer_status: assignVolunteerStatus,
          colony_names: selectedColonies,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Assign failed");
      
      // Show error if contact_no already exists (insertion was prevented)
      if (json.warning) {
        toast.error(json.warning);
        // Don't reload if contact_no already exists (insertion was skipped)
        return;
      } else {
        toast.success("Volunteer assign झाला.");
        
        // Clear form fields after successful insert
        setAssignVolunteerName("");
        setAssignVolunteerMobile("");
        setSelectedColonies([]);
        setAssignVolunteerStatus("Active");
        
        // Clear search filter (contact_no search box)
        setSearchContact("");
        
        // Reload volunteer_master data to show inserted volunteer in table
        await fetchAssignData("");
        
        // Also reload voter data
        await fetchData(1, search);
      }
    } catch (e) {
      console.error(e);
      toast.error("Assign होत नाही. कृपया पुन्हा प्रयत्न करा.");
    } finally {
      setAssigning(false);
    }
  };

  // A) Volunteer master columns (per voter row)
  const volunteerColumns: Column<VoterMasterRow>[] = useMemo(
    () => [
      {
        key: "Voter_Id",
        label: "Voter ID",
        accessor: "Voter_Id",
      },
      {
        key: "full_name",
        label: "Voter Name",
        accessor: "full_name",
        render: row => <span className="font-medium">{row.full_name}</span>,
      },
      {
        key: "House_Number",
        label: "House No.",
        accessor: "House_Number",
      },
      {
        key: "volunteer_name",
        label: "Volunteer Name",
        accessor: "volunteer_name",
        render: row => (
          <input
            className="w-40 px-2 py-1 border rounded text-xs"
            value={row.volunteer_name ?? ""}
            onChange={e => updateRow(row.id, { volunteer_name: e.target.value })}
          />
        ),
      },
      {
        key: "volunteer_mobile",
        label: "Volunteer Mobile",
        accessor: "volunteer_mobile",
        render: row => (
          <input
            className="w-32 px-2 py-1 border rounded text-xs"
            value={row.volunteer_mobile ?? ""}
            onChange={e => updateRow(row.id, { volunteer_mobile: e.target.value })}
          />
        ),
      },
      {
        key: "volunteer_status",
        label: "Status",
        accessor: "volunteer_status",
        render: row => (
          <select
            className="px-2 py-1 border rounded text-xs"
            value={row.volunteer_status ?? "Active"}
            onChange={e =>
              updateRow(row.id, { volunteer_status: e.target.value as VoterMasterRow["volunteer_status"] })
            }
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        ),
      },
      {
        key: "actions",
        label: "Save",
        render: row => (
          <button
            type="button"
            className="px-3 py-1 text-xs rounded bg-blue-600 text-white disabled:opacity-60"
            onClick={() => handleSaveRow(row)}
            disabled={savingId === row.id}
          >
            {savingId === row.id ? "Saving..." : "Save"}
          </button>
        ),
      },
    ],
    [savingId],
  );


  const assignColumns: Column<AssignRow>[] = [
    { key: "sr_no", label: "Sr No", accessor: "sr_no" },
    {
      key: "volunteer_name",
      label: "Name of Volunteer",
      accessor: "volunteer_name",
    },
    {
      key: "contact_no",
      label: "Contact Number",
      accessor: "contact_no",
    },
    {
      key: "colony_names",
      label: "Assigned Colonies",
      accessor: "colony_names",
    },
    {
      key: "status",
      label: "Status",
      accessor: "status",
    },
  ];

  // C) Financial data – instalments
  const financialColumns: Column<VoterMasterRow>[] = useMemo(
    () => [
      {
        key: "Voter_Id",
        label: "Voter ID",
        accessor: "Voter_Id",
      },
      {
        key: "full_name",
        label: "Voter Name",
        accessor: "full_name",
        render: row => <span className="font-medium">{row.full_name}</span>,
      },
      {
        key: "House_Number",
        label: "House No.",
        accessor: "House_Number",
      },
      {
        key: "volunteer_name",
        label: "Volunteer Name",
        accessor: "volunteer_name",
        render: row => (
          <input
            className="w-40 px-2 py-1 border rounded text-xs"
            value={row.volunteer_name ?? ""}
            onChange={e => updateRow(row.id, { volunteer_name: e.target.value })}
          />
        ),
      },
      {
        key: "volunteer_mobile",
        label: "Volunteer Mobile",
        accessor: "volunteer_mobile",
        render: row => (
          <input
            className="w-28 px-2 py-1 border rounded text-xs"
            value={row.volunteer_mobile ?? ""}
            onChange={e => updateRow(row.id, { volunteer_mobile: e.target.value })}
          />
        ),
      },
      {
        key: "instalments",
        label: "Instalments (1/2/3)",
        render: row => (
          <div className="flex gap-1 justify-center">
            {[1, 2, 3].map(n => {
              type InstalmentKey = "inst_1_paid" | "inst_2_paid" | "inst_3_paid";
              const key: InstalmentKey = `inst_${n}_paid` as InstalmentKey;
              const checked = Number(row[key]) === 1;
              return (
                <label key={n} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    className="w-3 h-3"
                    checked={checked}
                    onChange={() => {
                      const patch: Partial<VoterMasterRow> = {
                        [key]: checked ? 0 : 1,
                      };
                      updateRow(row.id, patch);
                    }}
                  />
                  <span>{n}</span>
                </label>
              );
            })}
          </div>
        ),
      },
    ],
    [],
  );

  // D) Voting status
  const votingColumns: Column<VoterMasterRow>[] = useMemo(
    () => [
      {
        key: "Voter_Id",
        label: "Voter ID",
        accessor: "Voter_Id",
      },
      {
        key: "full_name",
        label: "Voter Name",
        accessor: "full_name",
        render: row => <span className="font-medium">{row.full_name}</span>,
      },
      {
        key: "Updated_colony",
        label: "Colony",
        accessor: "Updated_colony",
      },
      {
        key: "House_Number",
        label: "House No.",
        accessor: "House_Number",
      },
      {
        key: "voting_paid",
        label: "Paid",
        accessor: "voting_paid",
        render: row => (
          <select
            className="px-2 py-1 border rounded text-xs"
            value={row.voting_paid ?? 0}
            onChange={e => updateRow(row.id, { voting_paid: Number(e.target.value) })}
          >
            <option value={0}>No</option>
            <option value={1}>Yes</option>
          </select>
        ),
      },
      {
        key: "voting_status",
        label: "Voting Status",
        accessor: "voting_status",
        render: row => (
          <select
            className="px-2 py-1 border rounded text-xs"
            value={row.voting_status ?? "Pending"}
            onChange={e =>
              updateRow(row.id, {
                voting_status: e.target.value as VoterMasterRow["voting_status"],
              })
            }
          >
            <option value="Pending">Pending</option>
            <option value="In Transit">In Transit</option>
            <option value="Completed">Completed</option>
          </select>
        ),
      },
      {
        key: "actions",
        label: "Save",
        render: row => (
          <button
            type="button"
            className="px-3 py-1 text-xs rounded bg-blue-600 text-white disabled:opacity-60"
            onClick={() => handleSaveRow(row)}
            disabled={savingId === row.id}
          >
            {savingId === row.id ? "Saving..." : "Save"}
          </button>
        ),
      },
    ],
    [savingId],
  );

  return (
    <div className="space-y-4">
      {/* Tabs A / B / C / D */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        <button
          type="button"
          className={`px-4 py-2 text-sm rounded-t ${activeTab === "A" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
          onClick={() => setActiveTab("A")}
        >
          A) Volunteer Master
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm rounded-t ${activeTab === "B" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
          onClick={() => setActiveTab("B")}
        >
          B) Assign Volunteer
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm rounded-t ${activeTab === "C" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
          onClick={() => setActiveTab("C")}
        >
          C) Financial Data
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm rounded-t ${activeTab === "D" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
          onClick={() => setActiveTab("D")}
        >
          D) Voting Status
        </button>
      </div>

      {activeTab === "B" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Search Volunteer (Contact Number)</Label>
            <input
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={searchContact}
              onChange={e => setSearchContact(e.target.value)}
              placeholder="Enter contact number to search"
              onKeyPress={e => {
                if (e.key === "Enter") {
                  handleSearchVolunteer();
                }
              }}
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleSearchVolunteer}
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchContact("");
                setAssignVolunteerName("");
                setAssignVolunteerMobile("");
                setSelectedColonies([]);
                setAssignVolunteerStatus("Active");
                fetchAssignData("");
              }}
              className="px-4 py-2 text-sm rounded border border-gray-300"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Search Voter (ID / Name)</Label>
            <input
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Enter Voter ID or Name"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => fetchData(1, search)}
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                fetchData(1, "");
              }}
              className="px-4 py-2 text-sm rounded border border-gray-300"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {activeTab === "B" ? (
        <>
          <div className="border rounded-md p-4 space-y-3 bg-gray-50">
            <h3 className="font-semibold text-sm">Assign Volunteer to Colony</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Volunteer Name</Label>
                <input
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={assignVolunteerName}
                  onChange={e => setAssignVolunteerName(e.target.value)}
                  placeholder="Enter volunteer name"
                />
              </div>
              <div>
                <Label>Mobile Number</Label>
                <input
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={assignVolunteerMobile}
                  onChange={e => setAssignVolunteerMobile(e.target.value)}
                  placeholder="Enter mobile no."
                />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={assignVolunteerStatus}
                  onChange={e => setAssignVolunteerStatus(e.target.value as "Active" | "Inactive")}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Select Colony (Multi)</Label>
              <div className="max-h-44 overflow-y-auto border rounded-md p-2 bg-white">
                {loadingColonies ? (
                  <div className="text-xs text-gray-500">Loading colonies...</div>
                ) : colonies.length === 0 ? (
                  <div className="text-xs text-gray-500">No colonies found.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                    {colonies.map(c => {
                      const id = String(c.colony_name);
                      const checked = selectedColonies.includes(id);
                      return (
                        <label key={c.colony_id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-3 h-3"
                            checked={checked}
                            onChange={e => {
                              setSelectedColonies(prev =>
                                e.target.checked ? [...prev, id] : prev.filter(x => x !== id),
                              );
                            }}
                          />
                          <span>{c.colony_name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleBulkAssign}
                disabled={assigning}
                className="px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white disabled:opacity-60"
              >
                {assigning ? "Assigning..." : "Add / Assign"}
              </button>
            </div>
          </div>

          {loadingAssignData ? (
            <div className="bg-white rounded-2xl shadow-md border p-8 text-center">
              <p className="text-gray-500 text-lg">Loading volunteer data...</p>
            </div>
          ) : assignRows.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md border p-8 text-center">
              <p className="text-gray-500 text-lg">There are no records to display</p>
            </div>
          ) : (
            <ReusableTable
              data={assignRows}
              columns={assignColumns}
              title="Assign Volunteer (Summary)"
              classname="h-[600px] overflow-y-auto"
              filterOptions={[]}
              searchKey="volunteer_name"
            />
          )}
        </>
      ) : (
        <ReusableTable
          data={rows}
          columns={
            activeTab === "A"
              ? volunteerColumns
              : activeTab === "C"
              ? financialColumns
              : votingColumns
          }
          title={
            activeTab === "A"
              ? "Volunteer Master"
              : activeTab === "C"
              ? "Financial Data"
              : "Voting Status"
          }
          classname="h-[600px] overflow-y-auto"
          filterOptions={[]}
          searchKey={activeTab === "D" ? "full_name" : "volunteer_name"}
        />
      )}

      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={page <= 1 || loading}
            onClick={() => fetchData(page - 1, search)}
          >
            Prev
          </button>
          <button
            type="button"
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={page >= totalPages || loading}
            onClick={() => fetchData(page + 1, search)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoterMaster;


