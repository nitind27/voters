"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "react-toastify";
import Label from "../form/Label";
import { Modal } from "../ui/modal";
import { getVoterRowBgClass } from "@/lib/utils";

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
  category_id?: number | null;
};

type FamilyMember = {
  id: number;
  Voter_Id: string;
  full_name: string;
  ENG_Full_name?: string;
  Age?: number;
  Gender?: string;
  family_member: string;
  Updated_colony: string | number | null;
  updated_mobile_no?: string | null;
  voting_status?: string | null;
  voting_paid?: number | null;
  voting_in_transit?: number | null;
  colony_name?: string | null;
  inst_1_paid?: number;
  inst_2_paid?: number;
  inst_3_paid?: number;
};

const PollingData: React.FC = () => {
  const [colonies, setColonies] = useState<ColonyOption[]>([]);
  
  // Voting Status state
  const [votingVolunteerSearchTerm, setVotingVolunteerSearchTerm] = useState("");
  const [votingAvailableVolunteers, setVotingAvailableVolunteers] = useState<VolunteerMasterApiItem[]>([]);
  const [loadingVotingVolunteers, setLoadingVotingVolunteers] = useState(false);
  const [selectedVotingVolunteerId, setSelectedVotingVolunteerId] = useState<number | null>(null);
  const [isVotingVolunteerDropdownOpen, setIsVotingVolunteerDropdownOpen] = useState(false);
  const [selectedVotingColonyId, setSelectedVotingColonyId] = useState<number | null>(null);
  const [votingPrimaryPersons, setVotingPrimaryPersons] = useState<Array<{
    id: number;
    Voter_Id: string;
    full_name: string;
    ENG_Full_name?: string;
    Updated_colony: string | number | null;
    updated_mobile_no?: string | null;
    updated_house_number?: string | null;
    House_Number?: string | null;
    colony_name?: string | null;
    member_count?: number;
  }>>([]);
  const [loadingVotingPrimaryPersons, setLoadingVotingPrimaryPersons] = useState(false);
  const [selectedVotingPrimaryPersonIds, setSelectedVotingPrimaryPersonIds] = useState<string[]>([]);
  const [votingPrimaryPersonSearchTerm, setVotingPrimaryPersonSearchTerm] = useState("");
  const [isVotingPrimaryPersonDropdownOpen, setIsVotingPrimaryPersonDropdownOpen] = useState(false);
  
  // Members data
  const [votingMembers, setVotingMembers] = useState<FamilyMember[]>([]);
  const [loadingVotingMembers, setLoadingVotingMembers] = useState(false);
  const [memberVotingStatus, setMemberVotingStatus] = useState<Record<number, boolean>>({});
  const [originalVotingStatus, setOriginalVotingStatus] = useState<Record<number, boolean>>({});
  const [submittingVotingData, setSubmittingVotingData] = useState(false);
  
  // Confirmation modal state
  const [showVotingUncheckConfirmation, setShowVotingUncheckConfirmation] = useState(false);
  const [pendingVotingUncheck, setPendingVotingUncheck] = useState<{
    memberId: number;
    memberName: string;
  } | null>(null);

  // Filter state - Add "All" option
  const [volunteerFilter, setVolunteerFilter] = useState<string>("All");

  // Load colony list
  useEffect(() => {
    const loadColonies = async () => {
      try {
        const res = await fetch("/api/colony");
        if (!res.ok) throw new Error("Failed to fetch colonies");
        const json = await res.json();
        setColonies(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error(e);
        toast.error("Colony list load होत नाही.");
      }
    };
    loadColonies();
  }, []);

  // Load voting volunteers
  const loadVotingVolunteers = async (searchText = "") => {
    setLoadingVotingVolunteers(true);
    try {
      const params = new URLSearchParams();
      if (searchText.trim()) params.set("search", searchText.trim());
      
      const res = await fetch(`/api/volunteermaster?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load volunteers");
      const json = await res.json();
      // Filter out inactive volunteers
      setVotingAvailableVolunteers((json.data || []).filter((v: VolunteerMasterApiItem) => v.status === "Active"));
    } catch (e) {
      console.error(e);
      toast.error("Volunteers load होत नाही.");
    } finally {
      setLoadingVotingVolunteers(false);
    }
  };

  // Load volunteers on mount
  useEffect(() => {
    loadVotingVolunteers("");
  }, []);

  // Filter colonies based on selected volunteer
  const filteredVotingColonies = useMemo(() => {
    if (!selectedVotingVolunteerId || volunteerFilter === "All") {
      return colonies;
    }

    const selectedVolunteer = votingAvailableVolunteers.find(v => v.user_id === selectedVotingVolunteerId);
    if (!selectedVolunteer) {
      return colonies;
    }

    let volunteerColonyIds: number[] = [];
    if (selectedVolunteer.colony_ids && selectedVolunteer.colony_ids.length > 0) {
      volunteerColonyIds = selectedVolunteer.colony_ids;
    } else if (selectedVolunteer.colony_id) {
      volunteerColonyIds = selectedVolunteer.colony_id
        .split(',')
        .map(id => Number(id.trim()))
        .filter(id => !isNaN(id) && id > 0);
    }

    if (volunteerColonyIds.length === 0) {
      return colonies;
    }

    return colonies.filter(c => volunteerColonyIds.includes(c.colony_id));
  }, [colonies, selectedVotingVolunteerId, votingAvailableVolunteers, volunteerFilter]);

  // Load primary persons when colony is selected
  const loadVotingPrimaryPersons = useCallback(async (colonyId: number) => {
    if (!colonyId) {
      setVotingPrimaryPersons([]);
      setSelectedVotingPrimaryPersonIds([]);
      setVotingMembers([]);
      setMemberVotingStatus({});
      return;
    }

    setLoadingVotingPrimaryPersons(true);
    try {
      const params = new URLSearchParams();
      params.set("colony_id", String(colonyId));
      // Only filter by assigned if volunteer is selected, otherwise show all
      if (volunteerFilter === "Volunteer" && selectedVotingVolunteerId) {
        params.set("only_assigned", "true");
      }
      
      const res = await fetch(`/api/voterstatus/primarypersons?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load primary persons");
      const json = await res.json();
      setVotingPrimaryPersons(json || []);
    } catch (e) {
      console.error(e);
      toast.error("Primary persons load होत नाही.");
      setVotingPrimaryPersons([]);
    } finally {
      setLoadingVotingPrimaryPersons(false);
    }
  }, [volunteerFilter, selectedVotingVolunteerId]);

  // Handle colony change
  const handleVotingColonyChange = (colonyId: number) => {
    setSelectedVotingColonyId(colonyId);
    setSelectedVotingPrimaryPersonIds([]);
    setVotingMembers([]);
    setMemberVotingStatus({});
  };

  // Load primary persons when colony changes
  useEffect(() => {
    if (selectedVotingColonyId) {
      loadVotingPrimaryPersons(selectedVotingColonyId);
    }
  }, [selectedVotingColonyId, loadVotingPrimaryPersons]);

  // Clear colony and primary persons when volunteer changes
  useEffect(() => {
    if (selectedVotingVolunteerId && volunteerFilter !== "All") {
      setSelectedVotingColonyId(null);
      setSelectedVotingPrimaryPersonIds([]);
      setVotingPrimaryPersons([]);
      setVotingMembers([]);
      setMemberVotingStatus({});
    }
  }, [selectedVotingVolunteerId, volunteerFilter]);

  // Handle volunteer filter change
  useEffect(() => {
    if (volunteerFilter === "All") {
      // Reset all selections when "All" is selected
      setSelectedVotingVolunteerId(null);
      setSelectedVotingColonyId(null);
      setSelectedVotingPrimaryPersonIds([]);
      setVotingPrimaryPersons([]);
      setVotingMembers([]);
      setMemberVotingStatus({});
    }
  }, [volunteerFilter]);

  // Load members when primary persons are selected
  useEffect(() => {
    const loadMembersForSelectedVotingPrimaryPersons = async () => {
      if (selectedVotingPrimaryPersonIds.length === 0) {
        setVotingMembers([]);
        setMemberVotingStatus({});
        return;
      }

      setLoadingVotingMembers(true);
      try {
        const memberPromises = selectedVotingPrimaryPersonIds.map(async (primaryPersonVoterId) => {
          const res = await fetch(`/api/voterstatus/familymembers?primary_person_id=${encodeURIComponent(primaryPersonVoterId)}`, {
            cache: "no-store",
          });
          if (!res.ok) throw new Error(`Failed to load members for ${primaryPersonVoterId}`);
          return res.json();
        });

        const memberArrays = await Promise.all(memberPromises);
        const allMembers = memberArrays.flat() as FamilyMember[];

        const uniqueMembers = Array.from(
          new Map(allMembers.map(m => [m.id, m])).values()
        );

        setVotingMembers(uniqueMembers);

        const updatedOriginal: Record<number, boolean> = {};
        uniqueMembers.forEach(member => {
          const dbValue = member.voting_status === "Completed";
          updatedOriginal[member.id] = dbValue;
        });
        setOriginalVotingStatus(prev => ({ ...prev, ...updatedOriginal }));
        
        setMemberVotingStatus(prev => {
          const updated: Record<number, boolean> = { ...prev };
          uniqueMembers.forEach(member => {
            if (!(member.id in prev)) {
              updated[member.id] = member.voting_status === "Completed";
            }
          });
          return updated;
        });
      } catch (e) {
        console.error(e);
        toast.error("Members load होत नाही.");
        setVotingMembers([]);
      } finally {
        setLoadingVotingMembers(false);
      }
    };

    loadMembersForSelectedVotingPrimaryPersons();
  }, [selectedVotingPrimaryPersonIds]);

  // Handle voting status checkbox change
  const handleVotingStatusChange = (memberId: number, checked: boolean) => {
    const originalValue = originalVotingStatus[memberId];
    const member = votingMembers.find(m => m.id === memberId);
    const memberName = member?.full_name || member?.Voter_Id || "Member";
    
    const wasCompleted = originalValue === true || (originalValue === undefined && member?.voting_status === "Completed");
    
    if (!checked && wasCompleted) {
      setPendingVotingUncheck({
        memberId,
        memberName,
      });
      setShowVotingUncheckConfirmation(true);
      return;
    }
    
    setMemberVotingStatus(prev => ({
      ...prev,
      [memberId]: checked,
    }));
  };

  // Confirm unchecking saved voting status
  const handleConfirmVotingUncheck = () => {
    if (pendingVotingUncheck) {
      if (pendingVotingUncheck.memberId === -1) {
        setMemberVotingStatus(prev => {
          const updated = { ...prev };
          votingMembers.forEach(member => {
            updated[member.id] = false;
          });
          return updated;
        });
        setOriginalVotingStatus(prev => {
          const updated = { ...prev };
          votingMembers.forEach(member => {
            updated[member.id] = false;
          });
          return updated;
        });
      } else {
        setMemberVotingStatus(prev => ({
          ...prev,
          [pendingVotingUncheck.memberId]: false,
        }));
        setOriginalVotingStatus(prev => ({
          ...prev,
          [pendingVotingUncheck.memberId]: false,
        }));
      }
    }
    setShowVotingUncheckConfirmation(false);
    setPendingVotingUncheck(null);
  };

  // Cancel unchecking voting status
  const handleCancelVotingUncheck = () => {
    setShowVotingUncheckConfirmation(false);
    setPendingVotingUncheck(null);
  };

  // Submit voting status
  const handleSubmitVotingData = async () => {
    if (votingMembers.length === 0) {
      toast.error("कृपया सदस्य निवडा.");
      return;
    }

    try {
      setSubmittingVotingData(true);
      
      const updatePromises = votingMembers.map(async (member) => {
        const isCompleted = memberVotingStatus[member.id] || false;
        const votingStatus = isCompleted ? "Completed" : "In Transit";

        const res = await fetch(`/api/voterdetailsdata/Voterdetailslist/${member.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Updated_colony: member.Updated_colony,
            updated_house_number: null,
            updated_mobile_no: member.updated_mobile_no,
            volunteer_name: null,
            volunteer_mobile: null,
            volunteer_status: null,
            assigned_colony_name: null,
            inst_1_paid: member.inst_1_paid ?? 0,
            inst_2_paid: member.inst_2_paid ?? 0,
            inst_3_paid: member.inst_3_paid ?? 0,
            voting_paid: member.voting_paid ?? 0,
            voting_in_transit: isCompleted ? 0 : 1,
            voting_status: votingStatus,
          }),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json?.error || `Failed to update member ${member.full_name}`);
        }
      });

      await Promise.all(updatePromises);
      toast.success("Voting status सेव्ह झाला.");
      
      // Reload members
      const memberPromises = selectedVotingPrimaryPersonIds.map(async (primaryPersonVoterId) => {
        const res = await fetch(`/api/voterstatus/familymembers?primary_person_id=${encodeURIComponent(primaryPersonVoterId)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed to reload members for ${primaryPersonVoterId}`);
        return res.json();
      });

      const memberArrays = await Promise.all(memberPromises);
      const allMembers = memberArrays.flat() as FamilyMember[];
      const uniqueMembers = Array.from(
        new Map(allMembers.map(m => [m.id, m])).values()
      );
      setVotingMembers(uniqueMembers);

      const updatedStatus: Record<number, boolean> = {};
      const updatedOriginal: Record<number, boolean> = {};
      
      uniqueMembers.forEach(member => {
        const dbValue = member.voting_status === "Completed";
        updatedStatus[member.id] = dbValue;
        updatedOriginal[member.id] = dbValue;
      });
      
      setMemberVotingStatus(updatedStatus);
      setOriginalVotingStatus(prev => ({ ...prev, ...updatedOriginal }));
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Voting status सेव्ह होत नाही.");
    } finally {
      setSubmittingVotingData(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isVotingVolunteerDropdownOpen && !target.closest('.volunteer-dropdown-container')) {
        setIsVotingVolunteerDropdownOpen(false);
      }
      if (isVotingPrimaryPersonDropdownOpen && !target.closest('.primary-person-dropdown-container')) {
        setIsVotingPrimaryPersonDropdownOpen(false);
      }
    };

    if (isVotingVolunteerDropdownOpen || isVotingPrimaryPersonDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVotingVolunteerDropdownOpen, isVotingPrimaryPersonDropdownOpen]);

  return (
    <div className="space-y-4">
      {/* Voting Status Filters */}
      <div className="border rounded-md p-4 space-y-3 bg-white">
        <h3 className="font-semibold text-sm">Voting Status</h3>
        <div className="flex flex-wrap items-end gap-3">
          {/* Filter Select - All option */}
          <div className="flex-1 min-w-[150px]">
            <Label>Filter</Label>
            <select
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={volunteerFilter}
              onChange={e => setVolunteerFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Volunteer">Volunteer</option>
            </select>
          </div>

          {volunteerFilter === "Volunteer" && (
            <>
              <div className="flex-1 min-w-[250px]">
                <Label>Search & Select Volunteer *</Label>
                <div className="relative volunteer-dropdown-container">
                  <div
                    className="w-full px-3 py-2 border rounded-md text-sm bg-white cursor-pointer flex items-center justify-between"
                    onClick={() => {
                      setIsVotingVolunteerDropdownOpen(!isVotingVolunteerDropdownOpen);
                      if (!isVotingVolunteerDropdownOpen && votingAvailableVolunteers.length === 0) {
                        loadVotingVolunteers("");
                      }
                    }}
                  >
                    <span className={selectedVotingVolunteerId ? "text-gray-900" : "text-gray-500"}>
                      {selectedVotingVolunteerId
                        ? votingAvailableVolunteers.find(v => v.user_id === selectedVotingVolunteerId)?.volunteer_name || "Select volunteer"
                        : "Click to select volunteer"}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform ${isVotingVolunteerDropdownOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {isVotingVolunteerDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                      <div className="p-2 border-b">
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          placeholder="Search volunteer by name or contact..."
                          value={votingVolunteerSearchTerm}
                          onChange={e => {
                            setVotingVolunteerSearchTerm(e.target.value);
                            loadVotingVolunteers(e.target.value);
                          }}
                          onClick={e => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {loadingVotingVolunteers ? (
                          <div className="p-3 text-xs text-gray-500 text-center">Loading...</div>
                        ) : votingAvailableVolunteers.length === 0 ? (
                          <div className="p-3 text-xs text-gray-500 text-center">No volunteers found</div>
                        ) : (
                          votingAvailableVolunteers
                            .filter(v => 
                              !votingVolunteerSearchTerm || 
                              v.volunteer_name.toLowerCase().includes(votingVolunteerSearchTerm.toLowerCase()) ||
                              (v.contact_no && v.contact_no.includes(votingVolunteerSearchTerm))
                            )
                            .map(volunteer => (
                              <div
                                key={volunteer.user_id}
                                onClick={() => {
                                  setSelectedVotingVolunteerId(volunteer.user_id);
                                  setVotingVolunteerSearchTerm("");
                                  setIsVotingVolunteerDropdownOpen(false);
                                }}
                                className={`p-3 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 ${
                                  selectedVotingVolunteerId === volunteer.user_id ? "bg-blue-100" : ""
                                }`}
                              >
                                <div className="font-medium text-gray-900">{volunteer.volunteer_name}</div>
                                {volunteer.contact_no && (
                                  <div className="text-xs text-gray-500 mt-1">{volunteer.contact_no}</div>
                                )}
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <Label>Select Colony *</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={selectedVotingColonyId || ""}
                  onChange={e => {
                    const colonyId = Number(e.target.value);
                    const colony = filteredVotingColonies.find(c => c.colony_id === colonyId);
                    if (colony) {
                      handleVotingColonyChange(colonyId);
                    }
                  }}
                  disabled={!selectedVotingVolunteerId}
                >
                  <option value="">
                    {selectedVotingVolunteerId ? "Select Colony" : "Select Volunteer First"}
                  </option>
                  {filteredVotingColonies.map(c => (
                    <option key={c.colony_id} value={c.colony_id}>
                      {c.colony_name}
                    </option>
                  ))}
                </select>
                {selectedVotingVolunteerId && filteredVotingColonies.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">No colonies assigned to this volunteer</p>
                )}
              </div>
            </>
          )}

          {volunteerFilter === "All" && (
            <div className="flex-1 min-w-[200px]">
              <Label>Select Colony *</Label>
              <select
                className="w-full px-3 py-2 border rounded-md text-sm"
                value={selectedVotingColonyId || ""}
                onChange={e => {
                  const colonyId = Number(e.target.value);
                  const colony = colonies.find(c => c.colony_id === colonyId);
                  if (colony) {
                    handleVotingColonyChange(colonyId);
                  }
                }}
              >
                <option value="">Select Colony</option>
                {colonies.map(c => (
                  <option key={c.colony_id} value={c.colony_id}>
                    {c.colony_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(selectedVotingColonyId && volunteerFilter === "All") || (selectedVotingColonyId && volunteerFilter === "Volunteer" && selectedVotingVolunteerId) ? (
            <div className="flex-1 min-w-[200px]">
              <Label>Select Primary Person (Multi) *</Label>
              <div className="relative primary-person-dropdown-container">
                <div
                  className="w-full px-3 py-2 border rounded-md text-sm bg-white cursor-pointer flex items-center justify-between"
                  onClick={() => {
                    setIsVotingPrimaryPersonDropdownOpen(!isVotingPrimaryPersonDropdownOpen);
                  }}
                >
                  <span className={selectedVotingPrimaryPersonIds.length > 0 ? "text-gray-900" : "text-gray-500"}>
                    {selectedVotingPrimaryPersonIds.length > 0
                      ? `${selectedVotingPrimaryPersonIds.length} primary person(s) selected`
                      : "Click to select primary persons"}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isVotingPrimaryPersonDropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {isVotingPrimaryPersonDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                    <div className="p-2 border-b">
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        placeholder="Search primary person by name, ID, etc..."
                        value={votingPrimaryPersonSearchTerm}
                        onChange={e => setVotingPrimaryPersonSearchTerm(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {loadingVotingPrimaryPersons ? (
                        <div className="p-3 text-xs text-gray-500 text-center">Loading primary persons...</div>
                      ) : (() => {
                        const filteredPersons = votingPrimaryPersons.filter(person => {
                          if (!votingPrimaryPersonSearchTerm.trim()) return true;
                          const searchTerm = votingPrimaryPersonSearchTerm.toLowerCase().trim();
                          const fullName = (person.full_name || "").toLowerCase();
                          const engName = (person.ENG_Full_name || "").toLowerCase();
                          const voterId = (person.Voter_Id || "").toLowerCase();
                          
                          return (
                            fullName.includes(searchTerm) ||
                            engName.includes(searchTerm) ||
                            voterId.includes(searchTerm)
                          );
                        });

                        if (filteredPersons.length === 0) {
                          return <div className="p-3 text-xs text-gray-500 text-center">No primary persons found</div>;
                        }

                        return (
                          <>
                            <div className="p-2 border-b bg-gray-50">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4"
                                  checked={filteredPersons.length > 0 && filteredPersons.every(p => selectedVotingPrimaryPersonIds.includes(p.Voter_Id || String(p.id)))}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      const selectableIds = filteredPersons.map(p => p.Voter_Id || String(p.id));
                                      setSelectedVotingPrimaryPersonIds(prev => [...new Set([...prev, ...selectableIds])]);
                                    } else {
                                      const filteredIds = filteredPersons.map(p => p.Voter_Id || String(p.id));
                                      setSelectedVotingPrimaryPersonIds(prev => prev.filter(id => !filteredIds.includes(id)));
                                    }
                                  }}
                                  onClick={e => e.stopPropagation()}
                                />
                                <span className="text-sm font-medium text-gray-700">Select All</span>
                              </label>
                            </div>
                            {filteredPersons.map(person => {
                              const personVoterId = person.Voter_Id || String(person.id);
                              const isChecked = selectedVotingPrimaryPersonIds.includes(personVoterId);
                              const memberCount = person.member_count || 0;
                              
                              return (
                                <div
                                  key={person.id}
                                  onClick={() => {
                                    if (isChecked) {
                                      setSelectedVotingPrimaryPersonIds(prev => prev.filter(id => id !== personVoterId));
                                    } else {
                                      setSelectedVotingPrimaryPersonIds(prev => [...prev, personVoterId]);
                                    }
                                  }}
                                  className={`p-3 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 ${
                                    isChecked ? "bg-blue-100" : ""
                                  }`}
                                >
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4"
                                      checked={isChecked}
                                      onChange={e => {
                                        e.stopPropagation();
                                        if (e.target.checked) {
                                          setSelectedVotingPrimaryPersonIds(prev => [...prev, personVoterId]);
                                        } else {
                                          setSelectedVotingPrimaryPersonIds(prev => prev.filter(id => id !== personVoterId));
                                        }
                                      }}
                                      onClick={e => e.stopPropagation()}
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{person.full_name || person.Voter_Id}</div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {memberCount} {memberCount === 1 ? 'member' : 'members'}
                                      </div>
                                    </div>
                                  </label>
                                </div>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Members Table */}
      {loadingVotingMembers ? (
        <div className="bg-white rounded-2xl shadow-md border p-8 text-center">
          <p className="text-gray-500 text-lg">Loading members...</p>
        </div>
      ) : votingMembers.length === 0 ? (
        selectedVotingPrimaryPersonIds.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-md border p-8 text-center">
            <p className="text-gray-500 text-lg">No members found for selected primary persons.</p>
          </div>
        ) : null
      ) : (
        <div className="bg-white rounded-2xl shadow-md border">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-lg">Members ({votingMembers.length})</h3>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left border-b font-medium text-gray-700">Sr No</th>
                  <th className="px-4 py-3 text-left border-b font-medium text-gray-700">Voter ID</th>
                  <th className="px-4 py-3 text-left border-b font-medium text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left border-b font-medium text-gray-700">English Name</th>
                  <th className="px-4 py-3 text-left border-b font-medium text-gray-700">Age</th>
                  <th className="px-4 py-3 text-left border-b font-medium text-gray-700">Gender</th>
                  <th className="px-4 py-3 text-left border-b font-medium text-gray-700">Mobile</th>
                  <th className="px-4 py-3 text-center border-b font-medium text-gray-700">
                    <div className="flex flex-col items-center gap-1">
                      <span>Voting Status</span>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={votingMembers.length > 0 && votingMembers.every(m => memberVotingStatus[m.id])}
                          onChange={e => {
                            if (!e.target.checked) {
                              const membersWithCompleted = votingMembers.filter(member => {
                                const originalValue = originalVotingStatus[member.id] || false;
                                return originalValue === true;
                              });

                              if (membersWithCompleted.length > 0) {
                                setPendingVotingUncheck({
                                  memberId: -1,
                                  memberName: `${membersWithCompleted.length} member(s)`,
                                });
                                setShowVotingUncheckConfirmation(true);
                                return;
                              }
                            }
                            
                            setMemberVotingStatus(prev => {
                              const updated = { ...prev };
                              votingMembers.forEach(member => {
                                updated[member.id] = e.target.checked;
                              });
                              return updated;
                            });
                            
                            if (e.target.checked) {
                              setOriginalVotingStatus(prev => {
                                const updated = { ...prev };
                                votingMembers.forEach(member => {
                                  updated[member.id] = true;
                                });
                                return updated;
                              });
                            }
                          }}
                          onClick={e => e.stopPropagation()}
                        />
                        <span className="text-xs text-gray-600">Select All</span>
                      </label>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {votingMembers.map((member, index) => {
                  const isCompleted = memberVotingStatus[member.id] || false;
                  return (
                    <tr key={member.id} className={`border-b hover:bg-gray-50 ${getVoterRowBgClass(member.inst_1_paid, member.inst_2_paid, member.inst_3_paid)}`}>
                      <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                      <td className="px-4 py-3">{member.Voter_Id || "-"}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{member.full_name || "-"}</td>
                      <td className="px-4 py-3 text-gray-500">{member.ENG_Full_name || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{member.Age || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{member.Gender || "-"}</td>
                      <td className="px-4 py-3 text-gray-400">{member.updated_mobile_no || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={isCompleted}
                          onChange={e => handleVotingStatusChange(member.id, e.target.checked)}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {isCompleted ? "Completed" : "In Transit"}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t flex justify-end">
            <button
              type="button"
              onClick={handleSubmitVotingData}
              disabled={submittingVotingData || votingMembers.length === 0}
              className="px-6 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submittingVotingData ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Unchecking Saved Voting Status */}
      {showVotingUncheckConfirmation && pendingVotingUncheck && (
        <Modal
          isOpen={showVotingUncheckConfirmation}
          onClose={handleCancelVotingUncheck}
          className="max-w-md p-6"
        >
          <div>
            <h3 className="text-lg font-semibold mb-4">Confirm Change Voting Status</h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                {pendingVotingUncheck.memberId === -1 ? (
                  <>
                    Are you sure you want to change voting status from <strong>Completed</strong> to <strong>In Transit</strong> for all <strong>{pendingVotingUncheck.memberName}</strong>?
                  </>
                ) : (
                  <>
                    Are you sure you want to change voting status from <strong>Completed</strong> to <strong>In Transit</strong> for{" "}
                    <strong>{pendingVotingUncheck.memberName}</strong>?
                  </>
                )}
              </p>
              <p className="text-xs text-red-600">
                This voting status was previously saved as &quot;Completed&quot; in the database. Changing it to &quot;In Transit&quot; will update the saved status.
              </p>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={handleCancelVotingUncheck}
                  className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVotingUncheck}
                  className="px-4 py-2 text-sm font-medium rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Confirm Change
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PollingData;

