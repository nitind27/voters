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

  // B) Assign volunteer – aggregated by volunteer + colony
  type AssignRow = {
    id: string;
    sr_no: number;
    volunteer_name: string;
    assigned_colony_name: string;
    voters_count: number;
  };

  const assignRows: AssignRow[] = useMemo(() => {
    const map = new Map<string, { volunteer_name: string; assigned_colony_name: string; voters_count: number }>();
    rows.forEach(r => {
      const vName = r.volunteer_name || "";
      const cName = r.assigned_colony_name || r.Updated_colony || "";
      if (!vName || !cName) return;
      const key = `${vName}::${cName}`;
      const existing = map.get(key);
      if (existing) {
        existing.voters_count += 1;
      } else {
        map.set(key, { volunteer_name: vName, assigned_colony_name: cName, voters_count: 1 });
      }
    });
    return Array.from(map.values()).map((item, index) => ({
      id: `${item.volunteer_name}-${item.assigned_colony_name}`,
      sr_no: index + 1,
      ...item,
    }));
  }, [rows]);

  const assignColumns: Column<AssignRow>[] = [
    { key: "sr_no", label: "Sr No", accessor: "sr_no" },
    {
      key: "volunteer_name",
      label: "Name of Volunteer",
      accessor: "volunteer_name",
    },
    {
      key: "assigned_colony_name",
      label: "Assigned Colony",
      accessor: "assigned_colony_name",
    },
    {
      key: "voters_count",
      label: "Number of Voters",
      accessor: "voters_count",
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
              const key = (`inst_${n}_paid` as keyof VoterMasterRow);
              const checked = Number(row[key]) === 1;
              return (
                <label key={n} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    className="w-3 h-3"
                    checked={checked}
                    onChange={() =>
                      updateRow(row.id, { [key]: checked ? 0 : 1 } as any)
                    }
                  />
                  <span>{n}</span>
                </label>
              );
            })}
          </div>
        ),
      },
    ],
    [savingId],
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
            onChange={e => updateRow(row.id, { voting_status: e.target.value as any })}
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

      {activeTab === "B" ? (
        <ReusableTable
          data={assignRows}
          columns={assignColumns as Column<any>[]}
          title="Assign Volunteer"
          classname="h-[600px] overflow-y-auto"
          filterOptions={[]}
          searchKey="volunteer_name"
        />
      ) : (
        <ReusableTable
          data={rows}
          columns={
            activeTab === "A"
              ? (volunteerColumns as Column<any>[])
              : activeTab === "C"
              ? (financialColumns as Column<any>[])
              : (votingColumns as Column<any>[])
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


