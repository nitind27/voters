"use client";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { colonyentrydatatype, voterdayatype } from "./Votertype";

type Props = {
  colonyentry: colonyentrydatatype[];
  voterentry: voterdayatype[];
};

type ColonyData = {
  colony_id: number;
  colony_name: string;
  status: string;
};

const ColonyWiseVoters: React.FC<Props> = ({ colonyentry, voterentry }) => {
  const [colonyList, setColonyList] = useState<ColonyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedColonyName, setSelectedColonyName] = useState("");
  const [colonyVoters, setColonyVoters] = useState<voterdayatype[]>([]);
  const [selectedColonyId, setSelectedColonyId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Map colony_entry_id -> colony_id (string keys for safety)
  const colonyEntryToColony = useMemo(() => {
    const m = new Map<string, string>();
    (colonyentry || []).forEach((ce) => {
      m.set(String(ce.colony_entry_id), String(ce.colony_id));
    });
    return m;
  }, [colonyentry]);

  // Group voters by colony_id for exact counts and fast lookup
  const votersByColonyId = useMemo(() => {
    const map = new Map<string, voterdayatype[]>();
    (voterentry || []).forEach((v) => {
      const cid = colonyEntryToColony.get(String(v.colony_entry_id));
      if (!cid) return;
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid)!.push(v);
    });
    return map;
  }, [voterentry, colonyEntryToColony]);

  // Filter voters based on search term
  const filteredColonyVoters = useMemo(() => {
    if (!searchTerm.trim()) return colonyVoters;
    
    const term = searchTerm.toLowerCase();
    return colonyVoters.filter((voter) => {
      const fullName = (voter.full_name || 
        [voter.first_name, voter.middle_name, voter.last_name]
          .filter(Boolean)
          .join(" ")).toLowerCase();
      const fullNameMr = (voter.full_name_mr || "").toLowerCase();
      const houseNumber = (voter.house_number || "").toLowerCase();
      const voterNumber = (voter.voter_number || "").toLowerCase();
      const mobile = (voter.mobile || "").toLowerCase();
      const boothNumber = (voter.booth_number || "").toLowerCase();
      
      return fullName.includes(term) ||
             fullNameMr.includes(term) ||
             houseNumber.includes(term) ||
             voterNumber.includes(term) ||
             mobile.includes(term) ||
             boothNumber.includes(term);
    });
  }, [colonyVoters, searchTerm]);

  // Load colonies from /api/colony
  const fetchColonies = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/colony", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch colonies");
      const data = await res.json();
      setColonyList(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load colony list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColonies();
  }, []);

  const openModalForColony = (colonyId: string, colonyName: string) => {
    setSelectedColonyName(colonyName);
    const list = votersByColonyId.get(colonyId) || [];
    setColonyVoters(list);
    setSearchTerm(""); // Reset search when opening modal
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedColonyName("");
    setColonyVoters([]);
    setSearchTerm(""); // Reset search when closing modal
  };

  // Filter colonies by selected id
  const visibleColonies = useMemo(() => {
    if (!selectedColonyId) return colonyList;
    return colonyList.filter(c => String(c.colony_id) === String(selectedColonyId));
  }, [colonyList, selectedColonyId]);

  return (
    <div className="bg-white rounded-2xl shadow-md border p-4">
      {/* Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Colony</label>
        <select
          value={selectedColonyId}
          onChange={(e) => setSelectedColonyId(e.target.value)}
          disabled={loading}
          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm bg-white text-gray-800 border-gray-300 focus:border-blue-400 focus:ring-3 focus:ring-blue-500/10 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">{loading ? "Loading colonies..." : "All Colonies"}</option>
          {colonyList.map((col, i) => {
            const cid = String(col.colony_id);
            const count = votersByColonyId.get(cid)?.length || 0;
            return (
              <option key={col.colony_id} value={cid}>
                {i + 1}) {col.colony_name} ({count})
              </option>
            );
          })}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 border text-left">Sr</th>
              <th className="px-3 py-2 border text-left">Colony</th>
              <th className="px-3 py-2 border text-left">Count</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-2 border" colSpan={3}>
                  Loading colonies...
                </td>
              </tr>
            )}
            {!loading && visibleColonies.length === 0 && (
              <tr>
                <td className="px-3 py-2 border" colSpan={3}>
                  No colonies found
                </td>
              </tr>
            )}
            {!loading &&
              visibleColonies.map((col, idx) => {
                const cid = String(col.colony_id);
                const count = votersByColonyId.get(cid)?.length || 0;
                return (
                  <tr key={col.colony_id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border align-top w-6">{idx + 1}</td>
                    <td className="px-3 py-2 border align-top">{col.colony_name}</td>
                    <td className="px-3 py-2 border align-top">
                      <button
                        type="button"
                        className="text-blue-600 underline text-[16px]"
                        onClick={() => openModalForColony(cid, col.colony_name)}
                      >
                        {count}
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded shadow w-full max-w-5xl m-3 h-[450px] overflow-scroll">
            <div className="flex justify-between items-center py-3 px-4 border-b">
              <h3 className="font-bold text-gray-800">
                Voters - {selectedColonyName}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="size-8 inline-flex justify-center items-center rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            
            {/* Search Box */}
            <div className="p-4 border-b">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search voters by name, house number, voter number, mobile, booth..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 px-4 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
              {searchTerm && (
                <p className="text-sm text-gray-600 mt-2">
                  Showing {filteredColonyVoters.length} of {colonyVoters.length} voters
                </p>
              )}
            </div>

            <div className="p-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 border text-left">Sr</th>
                    <th className="px-3 py-2 border text-left">Full Name</th>
                    <th className="px-3 py-2 border text-left">House No</th>
                    <th className="px-3 py-2 border text-left">Voter No.</th>
                    <th className="px-3 py-2 border text-left">Mobile</th>
                    <th className="px-3 py-2 border text-left">Booth</th>
                    <th className="px-3 py-2 border text-left">Photo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredColonyVoters.length === 0 && (
                    <tr>
                      <td className="px-3 py-2 border" colSpan={7}>
                        {searchTerm ? "No voters found matching your search" : "No voters found"}
                      </td>
                    </tr>
                  )}
                  {filteredColonyVoters.map((v, i) => (
                    <tr key={v.voter_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 border align-top">{i + 1}</td>
                      <td className="px-3 py-2 border align-top">
                        {v.full_name ||
                          [v.first_name, v.middle_name, v.last_name]
                            .filter(Boolean)
                            .join(" ")}
                            {" "}
                            ({v.full_name_mr})
                      </td>
                      <td className="px-3 py-2 border align-top">
                        {v.house_number}
                      </td>
                      <td className="px-3 py-2 border align-top">
                        {v.voter_number}
                      </td>
                      <td className="px-3 py-2 border align-top">
                        {v.mobile || "N/A"}
                      </td>
                      <td className="px-3 py-2 border align-top">{v.booth_number}</td>
                      <td className="px-3 py-2 border align-top">   
                        <img
                          src={`https://vishalnawle.in/vishalnavle/flutter_api_voters/voter_photos/${v.photo}`}
                          alt="Voter Photo"
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer"
                          title="Click to preview"
                          onClick={() =>
                            setPreviewImg(`https://vishalnawle.in/vishalnavle/flutter_api_voters/voter_photos/${v.photo}`)
                          }
                          onError={(e) => {
                            e.currentTarget.src = '/images/user/npimg.jpg';
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end items-center gap-x-2 py-3 px-4 border-t">
              <button
                type="button"
                onClick={closeModal}
                className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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

export default ColonyWiseVoters;