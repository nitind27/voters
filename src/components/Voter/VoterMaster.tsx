"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
// import { ReusableTable } from "../tables/BasicTableOne";
import { Column } from "../tables/tabletype";
import Label from "../form/Label";
import { Modal } from "../ui/modal";
// import { Simpletableshowdata } from "../tables/Simpletableshowdata";
import { Withoutbtn } from "../tables/Withoutbtn";

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
  // const [search, setSearch] = useState("");
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
    primary_person_count: number;
    status: string;
    username: string;
    password: string;
  };
  const [colonies, setColonies] = useState<ColonyOption[]>([]);
  // const [loadingColonies, setLoadingColonies] = useState(false);
  const [colonyCounts, setColonyCounts] = useState<Record<number, { colony_name: string; total: number; pending: number }>>({});
  const [assigning, setAssigning] = useState(false);
  const [assignRows, setAssignRows] = useState<AssignRow[]>([]);
  const [loadingAssignData, setLoadingAssignData] = useState(false);

  // Tab A - Volunteer Master data
  const [volunteerMasterRows, setVolunteerMasterRows] = useState<AssignRow[]>([]);
  const [loadingVolunteerMaster, setLoadingVolunteerMaster] = useState(false);

  // Tab A - Volunteer Master Modal state
  const [isVolunteerModalOpen, setIsVolunteerModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVolunteerId, setEditingVolunteerId] = useState<number | null>(null);
  const [volunteerFormData, setVolunteerFormData] = useState({
    volunteer_name: "",
    contact_no: "",
    status: "Active" as "Active" | "Inactive",
  });
  const [creatingVolunteer, setCreatingVolunteer] = useState(false);
  const [updatingVolunteer, setUpdatingVolunteer] = useState(false);
  const [deletingVolunteerId, setDeletingVolunteerId] = useState<number | null>(null);

  // Tab B - Searchable volunteer select state
  const [volunteerSearchTerm, setVolunteerSearchTerm] = useState("");
  const [availableVolunteers, setAvailableVolunteers] = useState<VolunteerMasterApiItem[]>([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<number | null>(null);
  const [isVolunteerDropdownOpen, setIsVolunteerDropdownOpen] = useState(false);
  
  // Tab B - Colony and Primary Person state
  const [selectedColonyId, setSelectedColonyId] = useState<number | null>(null);
  const [selectedColonyName, setSelectedColonyName] = useState<string>("");
  const [primaryPersons, setPrimaryPersons] = useState<Array<{
    id: number;
    Voter_Id: string;
    full_name: string;
    ENG_Full_name?: string;
    Updated_colony: string | number | null;
    updated_mobile_no?: string | null;
    updated_house_number?: string | null;
    House_Number?: string | null;
    colony_name?: string | null;
  }>>([]);
  const [loadingPrimaryPersons, setLoadingPrimaryPersons] = useState(false);
  const [selectedPrimaryPersonIds, setSelectedPrimaryPersonIds] = useState<string[]>([]);
  const [primaryPersonSearchTerm, setPrimaryPersonSearchTerm] = useState("");
  const [primaryPersonAssignments, setPrimaryPersonAssignments] = useState<Record<string, string>>({});

  // Primary Person Modal state
  const [isPrimaryPersonModalOpen, setIsPrimaryPersonModalOpen] = useState(false);
  const [modalPrimaryPersons, setModalPrimaryPersons] = useState<Array<{
    id: number;
    Voter_Id: string;
    full_name: string;
    ENG_Full_name?: string;
    Updated_colony: string | number | null;
    updated_mobile_no?: string | null;
    updated_house_number?: string | null;
    House_Number?: string | null;
    colony_name?: string | null;
  }>>([]);
  const [loadingModalPrimaryPersons, setLoadingModalPrimaryPersons] = useState(false);
  const [selectedVolunteerForModal, setSelectedVolunteerForModal] = useState<string>("");
  const [modalSearchTerm, setModalSearchTerm] = useState<string>("");

  // Tab C - Financial Data state
  const [financialVolunteerSearchTerm, setFinancialVolunteerSearchTerm] = useState("");
  const [financialAvailableVolunteers, setFinancialAvailableVolunteers] = useState<VolunteerMasterApiItem[]>([]);
  const [loadingFinancialVolunteers, setLoadingFinancialVolunteers] = useState(false);
  const [selectedFinancialVolunteerId, setSelectedFinancialVolunteerId] = useState<number | null>(null);
  const [isFinancialVolunteerDropdownOpen, setIsFinancialVolunteerDropdownOpen] = useState(false);
  const [selectedFinancialColonyId, setSelectedFinancialColonyId] = useState<number | null>(null);
  const [financialPrimaryPersons, setFinancialPrimaryPersons] = useState<Array<{
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
  const [loadingFinancialPrimaryPersons, setLoadingFinancialPrimaryPersons] = useState(false);
  const [selectedFinancialPrimaryPersonIds, setSelectedFinancialPrimaryPersonIds] = useState<string[]>([]);
  const [financialPrimaryPersonSearchTerm, setFinancialPrimaryPersonSearchTerm] = useState("");
  const [isFinancialPrimaryPersonDropdownOpen, setIsFinancialPrimaryPersonDropdownOpen] = useState(false);
  
  // Tab C - Members data
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
  const [financialMembers, setFinancialMembers] = useState<FamilyMember[]>([]);
  const [loadingFinancialMembers, setLoadingFinancialMembers] = useState(false);
  const [memberInstallments, setMemberInstallments] = useState<Record<number, { inst_1_paid: number; inst_2_paid: number; inst_3_paid: number }>>({});
  // Track original database values to detect if user is unchecking a saved value
  const [originalInstallments, setOriginalInstallments] = useState<Record<number, { inst_1_paid: number; inst_2_paid: number; inst_3_paid: number }>>({});
  const [submittingFinancialData, setSubmittingFinancialData] = useState(false);
  
  // Confirmation modal state for unchecking saved installments
  const [showUncheckConfirmation, setShowUncheckConfirmation] = useState(false);
  const [pendingUncheck, setPendingUncheck] = useState<{
    memberId: number;
    memberName: string;
    installment: "inst_1_paid" | "inst_2_paid" | "inst_3_paid";
  } | null>(null);

  // Tab D - Voting Status state
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
  
  // Tab D - Members data
  const [votingMembers, setVotingMembers] = useState<FamilyMember[]>([]);
  const [loadingVotingMembers, setLoadingVotingMembers] = useState(false);
  const [memberVotingStatus, setMemberVotingStatus] = useState<Record<number, boolean>>({});
  // Track original voting status from database to detect if user is unchecking a saved "Completed" status
  const [originalVotingStatus, setOriginalVotingStatus] = useState<Record<number, boolean>>({});
  const [submittingVotingData, setSubmittingVotingData] = useState(false);
  
  // Confirmation modal state for unchecking saved voting status
  const [showVotingUncheckConfirmation, setShowVotingUncheckConfirmation] = useState(false);
  const [pendingVotingUncheck, setPendingVotingUncheck] = useState<{
    memberId: number;
    memberName: string;
  } | null>(null);

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
        // setLoadingColonies(true);
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

  // Load colony primary person counts
  const loadColonyCounts = async () => {
    try {
      const res = await fetch("/api/votermaster/colony-primaryperson-counts", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch colony counts");
      const json = await res.json();
      setColonyCounts(json || {});
    } catch (e) {
      console.error(e);
      // Don't show error toast, just log
    }
  };

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
      const processedData = (json.data || []).map((item: VolunteerMasterApiItem & { primary_person_id?: string | null }, index: number) => {
        // Calculate primary person count from primary_person_id (comma-separated string)
        const primaryPersonCount = item.primary_person_id
          ? item.primary_person_id.split(',').filter((id: string) => id.trim()).length
          : 0;
        
        return {
          id: item.user_id || index,
          sr_no: index + 1,
          volunteer_name: item.volunteer_name || "",
          contact_no: item.contact_no || "",
          colony_names: item.colony_names || "",
          colony_ids: item.colony_ids || [],
          primary_person_count: primaryPersonCount,
          status: item.status || "Active",
          username: item.username || "",
          password: item.password || "",
        };
      });
      setAssignRows(processedData);
    } catch (e) {
      console.error(e);
      toast.error("Volunteer data load होत नाही.");
    } finally {
      setLoadingAssignData(false);
    }
  };

  // Load volunteer master data for Tab A
  const fetchVolunteerMasterData = async (searchText = "") => {
    setLoadingVolunteerMaster(true);
    try {
      const params = new URLSearchParams();
      if (searchText.trim()) params.set("search", searchText.trim());
      
      const res = await fetch(`/api/volunteermaster?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load volunteer master data");
      const json = await res.json();
      const processedData = (json.data || []).map((item: VolunteerMasterApiItem & { primary_person_id?: string | null }, index: number) => {
        // Calculate primary person count from primary_person_id (comma-separated string)
        const primaryPersonCount = item.primary_person_id
          ? item.primary_person_id.split(',').filter((id: string) => id.trim()).length
          : 0;
        
        return {
          id: item.user_id || index,
          sr_no: index + 1,
          volunteer_name: item.volunteer_name || "",
          contact_no: item.contact_no || "",
          colony_names: item.colony_names || "",
          colony_ids: item.colony_ids || [],
          primary_person_count: primaryPersonCount,
          status: item.status || "Active",
          username: item.username || "",
          password: item.password || "",
        };
      });
      setVolunteerMasterRows(processedData);
    } catch (e) {
      console.error(e);
      toast.error("Volunteer master data load होत नाही.");
    } finally {
      setLoadingVolunteerMaster(false);
    }
  };

  // Load assign data when B tab is active
  useEffect(() => {
    if (activeTab === "B") {
      fetchAssignData();
      loadAvailableVolunteers();
      loadPrimaryPersonAssignments();
      loadColonyCounts();
    } else if (activeTab === "A") {
      fetchVolunteerMasterData();
    } else if (activeTab === "C") {
      loadFinancialVolunteers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Reload assignments when volunteer is selected
  useEffect(() => {
    if (selectedVolunteerId && activeTab === "B") {
      const selectedVolunteer = availableVolunteers.find(v => v.user_id === selectedVolunteerId);
      if (selectedVolunteer) {
        loadPrimaryPersonAssignments(selectedVolunteer.volunteer_name);
      }
    } else {
      // Clear selections when no volunteer is selected
      setSelectedPrimaryPersonIds([]);
    }
  }, [selectedVolunteerId, activeTab, availableVolunteers]);

  // Load available volunteers for Tab B select box
  const loadAvailableVolunteers = async (searchText = "") => {
    setLoadingVolunteers(true);
    try {
      const params = new URLSearchParams();
      if (searchText.trim()) params.set("search", searchText.trim());
      
      const res = await fetch(`/api/volunteermaster?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load volunteers");
      const json = await res.json();
      setAvailableVolunteers(json.data || []);
    } catch (e) {
      console.error(e);
      toast.error("Volunteers load होत नाही.");
    } finally {
      setLoadingVolunteers(false);
    }
  };

  // Load primary person assignments
  const loadPrimaryPersonAssignments = async (volunteerName?: string) => {
    try {
      const params = new URLSearchParams();
      if (volunteerName) {
        params.set("volunteer_name", volunteerName);
      }
      
      const res = await fetch(`/api/votermaster/primaryperson-assignments?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load assignments");
      const json = await res.json();
      setPrimaryPersonAssignments(json.allAssignments || {});
      
      // Pre-select current volunteer's assigned primary persons
      if (json.currentVolunteerAssignments && json.currentVolunteerAssignments.length > 0) {
        setSelectedPrimaryPersonIds(json.currentVolunteerAssignments);
      } else {
        setSelectedPrimaryPersonIds([]);
      }
    } catch (e) {
      console.error(e);
      // Don't show error toast for assignments, just log
    }
  };

  // Load primary persons when colony is selected
  const loadPrimaryPersons = async (colonyName: string) => {
    if (!colonyName) {
      setPrimaryPersons([]);
      setSelectedPrimaryPersonIds([]);
      return;
    }

    setLoadingPrimaryPersons(true);
    try {
      const params = new URLSearchParams();
      params.set("colony_name", colonyName);
      
      const res = await fetch(`/api/voterstatus/primarypersons?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load primary persons");
      const json = await res.json();
      setPrimaryPersons(json || []);
      
      // Load assignments after loading primary persons (only if volunteer is selected)
      if (selectedVolunteerId) {
        const selectedVolunteer = availableVolunteers.find(v => v.user_id === selectedVolunteerId);
        if (selectedVolunteer) {
          await loadPrimaryPersonAssignments(selectedVolunteer.volunteer_name);
        }
      } else {
        // Just load all assignments if no volunteer selected
        await loadPrimaryPersonAssignments();
      }
    } catch (e) {
      console.error(e);
      toast.error("Primary persons load होत नाही.");
      setPrimaryPersons([]);
    } finally {
      setLoadingPrimaryPersons(false);
    }
  };

  // Tab C - Load financial volunteers
  const loadFinancialVolunteers = async (searchText = "") => {
    setLoadingFinancialVolunteers(true);
    try {
      const params = new URLSearchParams();
      if (searchText.trim()) params.set("search", searchText.trim());
      
      const res = await fetch(`/api/volunteermaster?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load volunteers");
      const json = await res.json();
      setFinancialAvailableVolunteers(json.data || []);
    } catch (e) {
      console.error(e);
      toast.error("Volunteers load होत नाही.");
    } finally {
      setLoadingFinancialVolunteers(false);
    }
  };

  // Tab C - Load primary persons when colony is selected
  // Only show primary persons that are assigned in volunteer_master table
  const loadFinancialPrimaryPersons = async (colonyId: number) => {
    if (!colonyId) {
      setFinancialPrimaryPersons([]);
      setSelectedFinancialPrimaryPersonIds([]);
      setFinancialMembers([]);
      setMemberInstallments({});
      return;
    }

    setLoadingFinancialPrimaryPersons(true);
    try {
      const params = new URLSearchParams();
      params.set("colony_id", String(colonyId));
      params.set("only_assigned", "true"); // Only show primary persons in volunteer_master
      
      const res = await fetch(`/api/voterstatus/primarypersons?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load primary persons");
      const json = await res.json();
      setFinancialPrimaryPersons(json || []);
    } catch (e) {
      console.error(e);
      toast.error("Primary persons load होत नाही.");
      setFinancialPrimaryPersons([]);
    } finally {
      setLoadingFinancialPrimaryPersons(false);
    }
  };

  // Tab C - Load members when primary persons are selected
  useEffect(() => {
    const loadMembersForSelectedPrimaryPersons = async () => {
      if (selectedFinancialPrimaryPersonIds.length === 0) {
        setFinancialMembers([]);
        setMemberInstallments({});
        return;
      }

      setLoadingFinancialMembers(true);
      try {
        // Fetch members for all selected primary persons
        // Note: selectedFinancialPrimaryPersonIds contains Voter_Id values
        const memberPromises = selectedFinancialPrimaryPersonIds.map(async (primaryPersonVoterId) => {
          const res = await fetch(`/api/voterstatus/familymembers?primary_person_id=${encodeURIComponent(primaryPersonVoterId)}`, {
            cache: "no-store",
          });
          if (!res.ok) throw new Error(`Failed to load members for ${primaryPersonVoterId}`);
          return res.json();
        });

        const memberArrays = await Promise.all(memberPromises);
        const allMembers = memberArrays.flat() as FamilyMember[];

        // Remove duplicates based on id
        const uniqueMembers = Array.from(
          new Map(allMembers.map(m => [m.id, m])).values()
        );

        setFinancialMembers(uniqueMembers);

        // Preserve existing installment state and only initialize new members
        // This ensures checked installments persist when selecting additional primary persons
        setMemberInstallments(prev => {
          const updatedInstallments: Record<number, { inst_1_paid: number; inst_2_paid: number; inst_3_paid: number }> = { ...prev };
          const updatedOriginal: Record<number, { inst_1_paid: number; inst_2_paid: number; inst_3_paid: number }> = { ...originalInstallments };
          
          uniqueMembers.forEach(member => {
            const dbValue = {
              inst_1_paid: Number(member.inst_1_paid) === 1 ? 1 : 0,
              inst_2_paid: Number(member.inst_2_paid) === 1 ? 1 : 0,
              inst_3_paid: Number(member.inst_3_paid) === 1 ? 1 : 0,
            };
            
            // Store original database values for this member
            updatedOriginal[member.id] = dbValue;
            
            // If member already exists in state, preserve their checked state
            // Only initialize new members with database values
            if (!prev[member.id]) {
              updatedInstallments[member.id] = dbValue;
            }
            // If member exists in prev, keep their current state (preserve checked installments)
          });
          
          setOriginalInstallments(updatedOriginal);
          return updatedInstallments;
        });
      } catch (e) {
        console.error(e);
        toast.error("Members load होत नाही.");
        setFinancialMembers([]);
      } finally {
        setLoadingFinancialMembers(false);
      }
    };

    loadMembersForSelectedPrimaryPersons();
  }, [selectedFinancialPrimaryPersonIds]);

  // Tab C - Filter colonies based on selected volunteer
  const filteredFinancialColonies = useMemo(() => {
    if (!selectedFinancialVolunteerId) {
      return colonies;
    }

    const selectedVolunteer = financialAvailableVolunteers.find(v => v.user_id === selectedFinancialVolunteerId);
    if (!selectedVolunteer) {
      return colonies;
    }

    // Use colony_ids array if available, otherwise parse colony_id string
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
  }, [colonies, selectedFinancialVolunteerId, financialAvailableVolunteers]);

  // Tab C - Handle colony change
  const handleFinancialColonyChange = (colonyId: number) => {
    setSelectedFinancialColonyId(colonyId);
    setSelectedFinancialPrimaryPersonIds([]);
    setFinancialMembers([]);
    setMemberInstallments({});
    loadFinancialPrimaryPersons(colonyId);
  };

  // Tab C - Clear colony and primary persons when volunteer changes
  useEffect(() => {
    if (selectedFinancialVolunteerId) {
      // Clear selections when volunteer changes
      setSelectedFinancialColonyId(null);
      setSelectedFinancialPrimaryPersonIds([]);
      setFinancialPrimaryPersons([]);
      setFinancialMembers([]);
      setMemberInstallments({});
    }
  }, [selectedFinancialVolunteerId]);

  // Tab C - Handle installment checkbox change
  const handleMemberInstallmentChange = (memberId: number, installment: "inst_1_paid" | "inst_2_paid" | "inst_3_paid", checked: boolean) => {
    // Check if user is trying to uncheck an installment that was originally saved in database
    const originalValue = originalInstallments[memberId]?.[installment] || 0;
    const member = financialMembers.find(m => m.id === memberId);
    const memberName = member?.full_name || member?.Voter_Id || "Member";
    
    // If unchecking and it was originally checked in database, show confirmation
    if (!checked && originalValue === 1) {
      setPendingUncheck({
        memberId,
        memberName,
        installment,
      });
      setShowUncheckConfirmation(true);
      return;
    }
    
    // Otherwise, proceed with the change
    setMemberInstallments(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [installment]: checked ? 1 : 0,
      },
    }));
  };

  // Tab C - Confirm unchecking saved installment
  const handleConfirmUncheck = () => {
    if (pendingUncheck) {
      if (pendingUncheck.memberId === -1) {
        // Uncheck all members for this installment
        setMemberInstallments(prev => {
          const updated = { ...prev };
          financialMembers.forEach(member => {
            if (!updated[member.id]) {
              updated[member.id] = { inst_1_paid: 0, inst_2_paid: 0, inst_3_paid: 0 };
            }
            updated[member.id] = {
              ...updated[member.id],
              [pendingUncheck.installment]: 0,
            };
          });
          return updated;
        });
        // Update original values
        setOriginalInstallments(prev => {
          const updated = { ...prev };
          financialMembers.forEach(member => {
            if (!updated[member.id]) {
              updated[member.id] = { inst_1_paid: 0, inst_2_paid: 0, inst_3_paid: 0 };
            }
            updated[member.id] = {
              ...updated[member.id],
              [pendingUncheck.installment]: 0,
            };
          });
          return updated;
        });
      } else {
        // Uncheck single member
        setMemberInstallments(prev => ({
          ...prev,
          [pendingUncheck.memberId]: {
            ...prev[pendingUncheck.memberId],
            [pendingUncheck.installment]: 0,
          },
        }));
        // Update original value since user confirmed
        setOriginalInstallments(prev => ({
          ...prev,
          [pendingUncheck.memberId]: {
            ...prev[pendingUncheck.memberId],
            [pendingUncheck.installment]: 0,
          },
        }));
      }
    }
    setShowUncheckConfirmation(false);
    setPendingUncheck(null);
  };

  // Tab C - Cancel unchecking
  const handleCancelUncheck = () => {
    setShowUncheckConfirmation(false);
    setPendingUncheck(null);
  };

  // Tab C - Handle select all for a specific installment
  const handleSelectAllInstallment = (installment: "inst_1_paid" | "inst_2_paid" | "inst_3_paid", checked: boolean) => {
    // If unchecking, check if any members have this installment originally saved
    if (!checked) {
      const membersWithSavedInstallment = financialMembers.filter(member => {
        const originalValue = originalInstallments[member.id]?.[installment] || 0;
        return originalValue === 1;
      });

      if (membersWithSavedInstallment.length > 0) {
        // Show confirmation for unchecking all
        setPendingUncheck({
          memberId: -1, // Special value for "all members"
          memberName: `${membersWithSavedInstallment.length} member(s)`,
          installment,
        });
        setShowUncheckConfirmation(true);
        return;
      }
    }

    // Otherwise, proceed with the change
    setMemberInstallments(prev => {
      const updated = { ...prev };
      financialMembers.forEach(member => {
        if (!updated[member.id]) {
          updated[member.id] = { inst_1_paid: 0, inst_2_paid: 0, inst_3_paid: 0 };
        }
        updated[member.id] = {
          ...updated[member.id],
          [installment]: checked ? 1 : 0,
        };
      });
      return updated;
    });

    // Update original values if checking all
    if (checked) {
      setOriginalInstallments(prev => {
        const updated = { ...prev };
        financialMembers.forEach(member => {
          if (!updated[member.id]) {
            updated[member.id] = { inst_1_paid: 0, inst_2_paid: 0, inst_3_paid: 0 };
          }
          updated[member.id] = {
            ...updated[member.id],
            [installment]: 1,
          };
        });
        return updated;
      });
    }
  };

  // Tab C - Check if all members have a specific installment checked
  const isAllInstallmentChecked = (installment: "inst_1_paid" | "inst_2_paid" | "inst_3_paid"): boolean => {
    if (financialMembers.length === 0) return false;
    return financialMembers.every(member => {
      const installments = memberInstallments[member.id] || { inst_1_paid: 0, inst_2_paid: 0, inst_3_paid: 0 };
      return installments[installment] === 1;
    });
  };

  // Tab D - Load voting volunteers
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
      setVotingAvailableVolunteers(json.data || []);
    } catch (e) {
      console.error(e);
      toast.error("Volunteers load होत नाही.");
    } finally {
      setLoadingVotingVolunteers(false);
    }
  };

  // Tab D - Filter colonies based on selected volunteer
  const filteredVotingColonies = useMemo(() => {
    if (!selectedVotingVolunteerId) {
      return colonies;
    }

    const selectedVolunteer = votingAvailableVolunteers.find(v => v.user_id === selectedVotingVolunteerId);
    if (!selectedVolunteer) {
      return colonies;
    }

    // Use colony_ids array if available, otherwise parse colony_id string
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
  }, [colonies, selectedVotingVolunteerId, votingAvailableVolunteers]);

  // Tab D - Load primary persons when colony is selected
  const loadVotingPrimaryPersons = async (colonyId: number) => {
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
      params.set("only_assigned", "true"); // Only show primary persons in volunteer_master
      
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
  };

  // Tab D - Handle colony change
  const handleVotingColonyChange = (colonyId: number) => {
    setSelectedVotingColonyId(colonyId);
    setSelectedVotingPrimaryPersonIds([]);
    setVotingMembers([]);
    setMemberVotingStatus({});
    loadVotingPrimaryPersons(colonyId);
  };

  // Tab D - Clear colony and primary persons when volunteer changes
  useEffect(() => {
    if (selectedVotingVolunteerId) {
      // Clear selections when volunteer changes
      setSelectedVotingColonyId(null);
      setSelectedVotingPrimaryPersonIds([]);
      setVotingPrimaryPersons([]);
      setVotingMembers([]);
      setMemberVotingStatus({});
    }
  }, [selectedVotingVolunteerId]);

  // Tab D - Load members when primary persons are selected
  useEffect(() => {
    const loadMembersForSelectedVotingPrimaryPersons = async () => {
      if (selectedVotingPrimaryPersonIds.length === 0) {
        setVotingMembers([]);
        setMemberVotingStatus({});
        return;
      }

      setLoadingVotingMembers(true);
      try {
        // Fetch members for all selected primary persons
        const memberPromises = selectedVotingPrimaryPersonIds.map(async (primaryPersonVoterId) => {
          const res = await fetch(`/api/voterstatus/familymembers?primary_person_id=${encodeURIComponent(primaryPersonVoterId)}`, {
            cache: "no-store",
          });
          if (!res.ok) throw new Error(`Failed to load members for ${primaryPersonVoterId}`);
          return res.json();
        });

        const memberArrays = await Promise.all(memberPromises);
        const allMembers = memberArrays.flat() as FamilyMember[];

        // Remove duplicates based on id
        const uniqueMembers = Array.from(
          new Map(allMembers.map(m => [m.id, m])).values()
        );

        setVotingMembers(uniqueMembers);

        // Initialize voting status state for all members
        // Checked if voting_status is "Completed", unchecked if "In Transit" or other
        const updatedOriginal: Record<number, boolean> = {};
        uniqueMembers.forEach(member => {
          const dbValue = member.voting_status === "Completed";
          // Store original database value
          updatedOriginal[member.id] = dbValue;
        });
        setOriginalVotingStatus(prev => ({ ...prev, ...updatedOriginal }));
        
        setMemberVotingStatus(prev => {
          const updated: Record<number, boolean> = { ...prev };
          uniqueMembers.forEach(member => {
            // Preserve existing state if member already exists
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

  // Tab D - Handle voting status checkbox change
  const handleVotingStatusChange = (memberId: number, checked: boolean) => {
    // Check if user is trying to uncheck a voting status that was originally "Completed" in database
    const originalValue = originalVotingStatus[memberId];
    const member = votingMembers.find(m => m.id === memberId);
    const memberName = member?.full_name || member?.Voter_Id || "Member";
    
    // If unchecking and it was originally "Completed" in database, show confirmation
    // Check both originalVotingStatus and current member's voting_status from database
    const wasCompleted = originalValue === true || (originalValue === undefined && member?.voting_status === "Completed");
    
    if (!checked && wasCompleted) {
      setPendingVotingUncheck({
        memberId,
        memberName,
      });
      setShowVotingUncheckConfirmation(true);
      return;
    }
    
    // Otherwise, proceed with the change
    setMemberVotingStatus(prev => ({
      ...prev,
      [memberId]: checked,
    }));
  };

  // Tab D - Confirm unchecking saved voting status
  const handleConfirmVotingUncheck = () => {
    if (pendingVotingUncheck) {
      if (pendingVotingUncheck.memberId === -1) {
        // Uncheck all members
        setMemberVotingStatus(prev => {
          const updated = { ...prev };
          votingMembers.forEach(member => {
            updated[member.id] = false;
          });
          return updated;
        });
        // Update original values
        setOriginalVotingStatus(prev => {
          const updated = { ...prev };
          votingMembers.forEach(member => {
            updated[member.id] = false;
          });
          return updated;
        });
      } else {
        // Uncheck single member
        setMemberVotingStatus(prev => ({
          ...prev,
          [pendingVotingUncheck.memberId]: false,
        }));
        // Update original value since user confirmed
        setOriginalVotingStatus(prev => ({
          ...prev,
          [pendingVotingUncheck.memberId]: false,
        }));
      }
    }
    setShowVotingUncheckConfirmation(false);
    setPendingVotingUncheck(null);
  };

  // Tab D - Cancel unchecking voting status
  const handleCancelVotingUncheck = () => {
    setShowVotingUncheckConfirmation(false);
    setPendingVotingUncheck(null);
  };

  // Tab D - Submit voting status
  const handleSubmitVotingData = async () => {
    if (votingMembers.length === 0) {
      toast.error("कृपया सदस्य निवडा.");
      return;
    }

    try {
      setSubmittingVotingData(true);
      
      // Update each member's voting status
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
      
      // Reload members to reflect updated data
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

      // Update voting status state with fresh data from database
      const updatedStatus: Record<number, boolean> = {};
      const updatedOriginal: Record<number, boolean> = {};
      
      uniqueMembers.forEach(member => {
        const dbValue = member.voting_status === "Completed";
        updatedStatus[member.id] = dbValue;
        // Update original values to reflect new saved state
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

  // Tab C - Submit financial data
  const handleSubmitFinancialData = async () => {
    if (financialMembers.length === 0) {
      toast.error("कृपया सदस्य निवडा.");
      return;
    }

    try {
      setSubmittingFinancialData(true);
      
      // Update each member's installments
      const updatePromises = financialMembers.map(async (member) => {
        const installments = memberInstallments[member.id];
        if (!installments) return;

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
            inst_1_paid: installments.inst_1_paid,
            inst_2_paid: installments.inst_2_paid,
            inst_3_paid: installments.inst_3_paid,
            voting_paid: member.voting_paid ?? 0,
            voting_in_transit: 0,
            voting_status: member.voting_status || "Pending",
          }),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json?.error || `Failed to update member ${member.full_name}`);
        }
      });

      await Promise.all(updatePromises);
      toast.success("Financial data सेव्ह झाला.");
      
      // Reload members to reflect updated data
      const memberPromises = selectedFinancialPrimaryPersonIds.map(async (primaryPersonVoterId) => {
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
      setFinancialMembers(uniqueMembers);

      // After submit, update installment state with fresh data from database
      // This ensures saved data is reflected, but preserves any unchecked state for other members
      const updatedInstallments: Record<number, { inst_1_paid: number; inst_2_paid: number; inst_3_paid: number }> = {};
      const updatedOriginal: Record<number, { inst_1_paid: number; inst_2_paid: number; inst_3_paid: number }> = {};
      
      uniqueMembers.forEach(member => {
        const dbValue = {
          inst_1_paid: Number(member.inst_1_paid) === 1 ? 1 : 0,
          inst_2_paid: Number(member.inst_2_paid) === 1 ? 1 : 0,
          inst_3_paid: Number(member.inst_3_paid) === 1 ? 1 : 0,
        };
        // Update with fresh database values for submitted members
        updatedInstallments[member.id] = dbValue;
        // Update original values to reflect new saved state (so confirmation won't show for newly saved values)
        updatedOriginal[member.id] = dbValue;
      });
      
      setMemberInstallments(updatedInstallments);
      setOriginalInstallments(prev => ({ ...prev, ...updatedOriginal }));
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Financial data सेव्ह होत नाही.");
    } finally {
      setSubmittingFinancialData(false);
    }
  };

  // Handle colony selection change
  const handleColonyChange = (colonyId: number, colonyName: string) => {
    setSelectedColonyId(colonyId);
    setSelectedColonyName(colonyName);
    setSelectedPrimaryPersonIds([]);
    loadPrimaryPersons(colonyName);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isVolunteerDropdownOpen && !target.closest('.volunteer-dropdown-container')) {
        setIsVolunteerDropdownOpen(false);
      }
      if (isFinancialVolunteerDropdownOpen && !target.closest('.volunteer-dropdown-container')) {
        setIsFinancialVolunteerDropdownOpen(false);
      }
      if (isFinancialPrimaryPersonDropdownOpen && !target.closest('.primary-person-dropdown-container')) {
        setIsFinancialPrimaryPersonDropdownOpen(false);
      }
      if (isVotingVolunteerDropdownOpen && !target.closest('.volunteer-dropdown-container')) {
        setIsVotingVolunteerDropdownOpen(false);
      }
      if (isVotingPrimaryPersonDropdownOpen && !target.closest('.primary-person-dropdown-container')) {
        setIsVotingPrimaryPersonDropdownOpen(false);
      }
    };

    if (isVolunteerDropdownOpen || isFinancialVolunteerDropdownOpen || isFinancialPrimaryPersonDropdownOpen || isVotingVolunteerDropdownOpen || isVotingPrimaryPersonDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVolunteerDropdownOpen, isFinancialVolunteerDropdownOpen, isFinancialPrimaryPersonDropdownOpen, isVotingVolunteerDropdownOpen, isVotingPrimaryPersonDropdownOpen]);

  // Helper function to highlight matching text
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm.trim() || !text) {
      return <span>{text}</span>;
    }
    
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <span>
        {parts.map((part, index) => {
          if (part === '') return null;
          // Check if this part exactly matches the search term (case-insensitive)
          const isMatch = part.toLowerCase() === searchTerm.toLowerCase();
          return isMatch ? (
            <span key={index} className="bg-yellow-300">{part}</span>
          ) : (
            <span key={index}>{part}</span>
          );
        })}
      </span>
    );
  };

  // Handle create volunteer in Tab A
  const handleCreateVolunteer = async () => {
    if (!volunteerFormData.volunteer_name.trim()) {
      toast.error("Volunteer Name आवश्यक आहे.");
      return;
    }

    try {
      setCreatingVolunteer(true);
      const res = await fetch("/api/volunteermaster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volunteer_name: volunteerFormData.volunteer_name.trim(),
          contact_no: volunteerFormData.contact_no.trim() || null,
          status: volunteerFormData.status,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to create volunteer");
      
      toast.success("Volunteer तयार झाला.");
      setIsVolunteerModalOpen(false);
      setVolunteerFormData({
        volunteer_name: "",
        contact_no: "",
        status: "Active",
      });
      
      // Refresh data if on Tab A or Tab B
      if (activeTab === "A") {
        await fetchVolunteerMasterData("");
      } else if (activeTab === "B") {
        await fetchAssignData();
        await loadAvailableVolunteers();
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Volunteer तयार होत नाही.");
    } finally {
      setCreatingVolunteer(false);
    }
  };

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
      fetchData(page);
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

  // Bulk assign volunteer with colony and primary persons (B tab)
  const handleBulkAssign = async () => {
    if (!selectedVolunteerId) {
      toast.error("कृपया Volunteer निवडा.");
      return;
    }
    if (!selectedColonyId) {
      toast.error("कृपया Colony निवडा.");
      return;
    }
    if (!selectedPrimaryPersonIds.length) {
      toast.error("किमान एक Primary Person निवडा.");
      return;
    }

    const selectedVolunteer = availableVolunteers.find(v => v.user_id === selectedVolunteerId);
    if (!selectedVolunteer) {
      toast.error("Selected volunteer not found");
      return;
    }

    try {
      setAssigning(true);
      const res = await fetch("/api/votermaster/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volunteer_name: selectedVolunteer.volunteer_name,
          volunteer_mobile: selectedVolunteer.contact_no || null,
          volunteer_status: selectedVolunteer.status as "Active" | "Inactive",
          colony_names: [selectedColonyName],
          primary_person_ids: selectedPrimaryPersonIds.join(","), // Comma-separated string
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
        
        // Clear form fields after successful assign
        setSelectedVolunteerId(null);
        setVolunteerSearchTerm("");
        setSelectedColonyId(null);
        setSelectedColonyName("");
        setSelectedPrimaryPersonIds([]);
        setPrimaryPersons([]);
        setIsVolunteerDropdownOpen(false);
        
        // Reload volunteer_master data to show updated volunteer in table
        await fetchAssignData("");
        
        // Reload Tab A volunteer master data if on Tab A
        if (activeTab === "A") {
          await fetchVolunteerMasterData("");
        }
        
        // Also reload voter data
          await fetchData(1);
      }
    } catch (e) {
      console.error(e);
      toast.error("Assign होत नाही. कृपया पुन्हा प्रयत्न करा.");
    } finally {
      setAssigning(false);
    }
  };

  // Load primary persons for modal
  const loadPrimaryPersonsForModal = async (volunteerName: string) => {
    setLoadingModalPrimaryPersons(true);
    setSelectedVolunteerForModal(volunteerName);
    try {
      const res = await fetch(`/api/votermaster/volunteer-primarypersons?volunteer_name=${encodeURIComponent(volunteerName)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch primary persons");
      const json = await res.json();
      setModalPrimaryPersons(json || []);
      setIsPrimaryPersonModalOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Primary person data load होत नाही.");
    } finally {
      setLoadingModalPrimaryPersons(false);
    }
  };

  // Handle edit volunteer
  const handleEditVolunteer = (row: AssignRow) => {
    setEditingVolunteerId(row.id);
    setVolunteerFormData({
      volunteer_name: row.volunteer_name || "",
      contact_no: row.contact_no || "",
      status: (row.status as "Active" | "Inactive") || "Active",
    });
    setIsEditModalOpen(true);
  };

  // Handle update volunteer
  const handleUpdateVolunteer = async () => {
    if (!editingVolunteerId) return;
    if (!volunteerFormData.volunteer_name.trim()) {
      toast.error("Volunteer Name आवश्यक आहे.");
      return;
    }

    try {
      setUpdatingVolunteer(true);
      const res = await fetch("/api/volunteermaster", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: editingVolunteerId,
          volunteer_name: volunteerFormData.volunteer_name.trim(),
          contact_no: volunteerFormData.contact_no.trim() || null,
          status: volunteerFormData.status,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to update volunteer");
      
      toast.success("Volunteer अपडेट झाला.");
      setIsEditModalOpen(false);
      setEditingVolunteerId(null);
      setVolunteerFormData({
        volunteer_name: "",
        contact_no: "",
        status: "Active",
      });
      
      // Reload volunteer master data
      await fetchVolunteerMasterData("");
    } catch (e) {
      console.error(e);
      toast.error("Volunteer अपडेट होत नाही.");
    } finally {
      setUpdatingVolunteer(false);
    }
  };

  // Handle delete volunteer
  const handleDeleteVolunteer = async (userId: number, volunteerName: string) => {
    if (!confirm(`Are you sure you want to delete volunteer "${volunteerName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingVolunteerId(userId);
      const res = await fetch(`/api/volunteermaster?user_id=${userId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to delete volunteer");
      
      toast.success("Volunteer डिलीट झाला.");
      
      // Reload volunteer master data
      await fetchVolunteerMasterData("");
    } catch (e) {
      console.error(e);
      toast.error("Volunteer डिलीट होत नाही.");
    } finally {
      setDeletingVolunteerId(null);
    }
  };

  // Tab A - Volunteer Master columns (only volunteer_name and contact_no with actions)
  const volunteerMasterColumns: Column<AssignRow>[] = [
    {
      key: "volunteer_name",
      label: "Volunteer Name",
      accessor: "volunteer_name",
    },
    {
      key: "contact_no",
      label: "Contact Number",
      accessor: "contact_no",
    },
    {
      key: "actions",
      label: "Actions",
      accessor: "volunteer_name" as keyof AssignRow,
      render: (row: AssignRow) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleEditVolunteer(row)}
            className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleDeleteVolunteer(row.id, row.volunteer_name)}
            disabled={deletingVolunteerId === row.id}
            className="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deletingVolunteerId === row.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      ),
    },
  ];

  const assignColumns: Column<AssignRow>[] = [
  
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
      key: "primary_person_count",
      label: "Total Number of voters",
      accessor: "primary_person_count",
      render: (row: AssignRow) => (
        <button
          type="button"
          onClick={() => loadPrimaryPersonsForModal(row.volunteer_name)}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          disabled={row.primary_person_count === 0}
        >
          {row.primary_person_count || 0}
        </button>
      ),
    },
    {
      key: "status",
      label: "Status",
      accessor: "status",
    },
  ];

  // C) Financial data – instalments
  // Note: financialColumns is not currently used as Tab C uses a form-based interface
  // const financialColumns: Column<VoterMasterRow>[] = useMemo(
  //   () => [
  //     {
  //       key: "Voter_Id",
  //       label: "Voter ID",
  //       accessor: "Voter_Id",
  //     },
  //     {
  //       key: "full_name",
  //       label: "Voter Name",
  //       accessor: "full_name",
  //       render: row => <span className="font-medium">{row.full_name}</span>,
  //     },
  //     {
  //       key: "House_Number",
  //       label: "House No.",
  //       accessor: "House_Number",
  //     },
  //     {
  //       key: "volunteer_name",
  //       label: "Volunteer Name",
  //       accessor: "volunteer_name",
  //       render: row => (
  //         <input
  //           className="w-40 px-2 py-1 border rounded text-xs"
  //           value={row.volunteer_name ?? ""}
  //           onChange={e => updateRow(row.id, { volunteer_name: e.target.value })}
  //         />
  //       ),
  //     },
  //     {
  //       key: "volunteer_mobile",
  //       label: "Volunteer Mobile",
  //       accessor: "volunteer_mobile",
  //       render: row => (
  //         <input
  //           className="w-28 px-2 py-1 border rounded text-xs"
  //           value={row.volunteer_mobile ?? ""}
  //           onChange={e => updateRow(row.id, { volunteer_mobile: e.target.value })}
  //         />
  //       ),
  //     },
  //     {
  //       key: "instalments",
  //       label: "Instalments (1/2/3)",
  //       render: row => (
  //         <div className="flex gap-1 justify-center">
  //           {[1, 2, 3].map(n => {
  //             type InstalmentKey = "inst_1_paid" | "inst_2_paid" | "inst_3_paid";
  //             const key: InstalmentKey = `inst_${n}_paid` as InstalmentKey;
  //             const checked = Number(row[key]) === 1;
  //             return (
  //               <label key={n} className="flex items-center gap-1 text-xs">
  //                 <input
  //                   type="checkbox"
  //                   className="w-3 h-3"
  //                   checked={checked}
  //                   onChange={() => {
  //                     const patch: Partial<VoterMasterRow> = {
  //                       [key]: checked ? 0 : 1,
  //                     };
  //                     updateRow(row.id, patch);
  //                   }}
  //                 />
  //                 <span>{n}</span>
  //               </label>
  //             );
  //           })}
  //         </div>
  //       ),
  //     },
  //   ],
  //   [],
  // );

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
    [savingId, handleSaveRow],
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
          {/* <div>
            <Label>Search Volunteer (Contact Number)</Label>
            <input
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={searchContact}
              onChange={e => setSearchContact(e.target.value)}
              placeholder="Enter contact number to search"
              onKeyPress={e => {
                if (e.key === "Enter") {
                  fetchAssignData(searchContact.trim());
                }
              }}
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => fetchAssignData(searchContact.trim())}
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchContact("");
                setSelectedVolunteerId(null);
                setVolunteerSearchTerm("");
                setSelectedColonyId(null);
                setSelectedColonyName("");
                setSelectedPrimaryPersonIds([]);
                setPrimaryPersons([]);
                fetchAssignData("");
              }}
              className="px-4 py-2 text-sm rounded border border-gray-300"
            >
              Clear
            </button>
          </div> */}
        </div>
      ) : (
        <div className="flex justify-end">
          <div className="flex items-end gap-2">
             {/* <button
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
             </button> */}
              {activeTab === "A" && (
                <button
                  type="button"
                  onClick={() => setIsVolunteerModalOpen(true)}
                  className="px-4 py-2 text-sm font-medium rounded bg-green-600 text-white hover:bg-green-700"
                >
                  Add Volunteer
                </button>
              )}
            </div>
        </div>
      )}

      {activeTab === "B" ? (
        <>
          <div className="border rounded-md p-4 space-y-3 bg-white">
            <h3 className="font-semibold text-sm">Assign Volunteer to Colony</h3>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[250px]">
                <Label>Search & Select Volunteer *</Label>
                <div className="relative volunteer-dropdown-container">
                  <div
                    className="w-full px-3 py-2 border rounded-md text-sm bg-white cursor-pointer flex items-center justify-between"
                    onClick={() => {
                      setIsVolunteerDropdownOpen(!isVolunteerDropdownOpen);
                      if (!isVolunteerDropdownOpen && availableVolunteers.length === 0) {
                        loadAvailableVolunteers("");
                      }
                    }}
                  >
                    <span className={selectedVolunteerId ? "text-gray-900" : "text-gray-500"}>
                      {selectedVolunteerId
                        ? availableVolunteers.find(v => v.user_id === selectedVolunteerId)?.volunteer_name || "Select volunteer"
                        : "Click to select volunteer"}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform ${isVolunteerDropdownOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {isVolunteerDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                      {/* Search input inside dropdown */}
                      <div className="p-2 border-b">
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          placeholder="Search volunteer by name or contact..."
                          value={volunteerSearchTerm}
                          onChange={e => {
                            setVolunteerSearchTerm(e.target.value);
                            loadAvailableVolunteers(e.target.value);
                          }}
                          onClick={e => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      {/* Dropdown list */}
                      <div className="max-h-60 overflow-y-auto">
                        {loadingVolunteers ? (
                          <div className="p-3 text-xs text-gray-500 text-center">Loading...</div>
                        ) : availableVolunteers.length === 0 ? (
                          <div className="p-3 text-xs text-gray-500 text-center">No volunteers found</div>
                        ) : (
                          availableVolunteers
                            .filter(v => 
                              !volunteerSearchTerm || 
                              v.volunteer_name.toLowerCase().includes(volunteerSearchTerm.toLowerCase()) ||
                              (v.contact_no && v.contact_no.includes(volunteerSearchTerm))
                            )
                            .map(volunteer => (
                              <div
                                key={volunteer.user_id}
                                onClick={() => {
                                  setSelectedVolunteerId(volunteer.user_id);
                                  setVolunteerSearchTerm("");
                                  setIsVolunteerDropdownOpen(false);
                                }}
                                className={`p-3 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 ${
                                  selectedVolunteerId === volunteer.user_id ? "bg-blue-100" : ""
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
                <div className="flex items-center gap-2">
                  <select
                    className="flex-1 px-3 py-2 border rounded-md text-sm"
                    value={selectedColonyId || ""}
                    onChange={e => {
                      const colonyId = Number(e.target.value);
                      const colony = colonies.find(c => c.colony_id === colonyId);
                      if (colony) {
                        handleColonyChange(colonyId, colony.colony_name);
                      }
                    }}
                  >
                    <option value="">Select Colony</option>
                    {colonies.map(c => {
                      const counts = colonyCounts[c.colony_id];
                      const total = counts?.total || 0;
                      const pending = counts?.pending || 0;
                      const done = total - pending; // Already assigned count
                      return (
                        <option key={c.colony_id} value={c.colony_id}>
                          {c.colony_name}{total > 0 ? ` - ${done}/${total} remaining (${pending})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  {selectedColonyId && (() => {
                    const counts = colonyCounts[selectedColonyId];
                    const total = counts?.total || 0;
                    const pending = counts?.pending || 0;
                    const done = total - pending;
                    if (total > 0) {
                      return (
                        <span className="text-xs text-red-600 font-medium whitespace-nowrap">
                          {done}/{total} remaining ({pending})
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>

            {selectedColonyId && (
              <div>
                <Label>Select Primary Person (Multi) *</Label>
                {/* Search filter for primary persons */}
                <div className="mb-2">
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholder="Search by name, ID, house number, mobile, etc..."
                    value={primaryPersonSearchTerm}
                    onChange={e => setPrimaryPersonSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-60 overflow-y-auto border rounded-md bg-white">
                  {loadingPrimaryPersons ? (
                    <div className="p-4 text-center text-xs text-gray-500">Loading primary persons...</div>
                  ) : (() => {
                    // Filter primary persons by all fields
                    const filteredPersons = primaryPersons.filter(person => {
                      if (!primaryPersonSearchTerm.trim()) return true;
                      const searchTerm = primaryPersonSearchTerm.toLowerCase().trim();
                      
                      // Search across all fields
                      const fullName = (person.full_name || "").toLowerCase();
                      const engName = (person.ENG_Full_name || "").toLowerCase();
                      const voterId = (person.Voter_Id || "").toLowerCase();
                      const houseNo = (person.updated_house_number || person.House_Number || "").toLowerCase();
                      const mobileNo = (person.updated_mobile_no || "").toLowerCase();
                      const colonyName = (person.colony_name || "").toLowerCase();
                      
                      return (
                        fullName.includes(searchTerm) ||
                        engName.includes(searchTerm) ||
                        voterId.includes(searchTerm) ||
                        houseNo.includes(searchTerm) ||
                        mobileNo.includes(searchTerm) ||
                        colonyName.includes(searchTerm)
                      );
                    });
                    
                    if (filteredPersons.length === 0) {
                      return <div className="p-4 text-center text-xs text-gray-500">No primary persons found.</div>;
                    }
                    
                    const searchTerm = primaryPersonSearchTerm.trim();
                    
                    const selectedVolunteer = availableVolunteers.find(v => v.user_id === selectedVolunteerId);
                    const selectedVolunteerName = selectedVolunteer?.volunteer_name || "";
                    
                    return (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left border-b w-10">
                              <input
                                type="checkbox"
                                className="w-4 h-4"
                                checked={filteredPersons.length > 0 && filteredPersons.every(p => {
                                  const pid = String(p.id);
                                  const assignedName = primaryPersonAssignments[pid];
                                  const isOther = !!(assignedName && assignedName !== selectedVolunteerName);
                                  return isOther || selectedPrimaryPersonIds.includes(pid);
                                })}
                                onChange={e => {
                                  if (e.target.checked) {
                                    const selectableIds = filteredPersons
                                      .filter(p => {
                                        const pid = String(p.id);
                                        const assignedName = primaryPersonAssignments[pid];
                                        return !(assignedName && assignedName !== selectedVolunteerName);
                                      })
                                      .map(p => String(p.id));
                                    setSelectedPrimaryPersonIds(prev => [...new Set([...prev, ...selectableIds])]);
                                  } else {
                                    const filteredIds = filteredPersons.map(p => String(p.id));
                                    setSelectedPrimaryPersonIds(prev => prev.filter(id => !filteredIds.includes(id)));
                                  }
                                }}
                              />
                            </th>
                            <th className="px-3 py-2 text-left border-b font-medium text-gray-700">Name</th>
                            <th className="px-3 py-2 text-left border-b font-medium text-gray-700">English Name</th>
                            <th className="px-3 py-2 text-left border-b font-medium text-gray-700">Voter ID</th>
                            <th className="px-3 py-2 text-left border-b font-medium text-gray-700">House No</th>
                            <th className="px-3 py-2 text-left border-b font-medium text-gray-700">Mobile</th>
                            <th className="px-3 py-2 text-left border-b font-medium text-gray-700">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPersons.map(person => {
                            const personId = String(person.id);
                            const isChecked = selectedPrimaryPersonIds.includes(personId);
                            const houseNumber = person.updated_house_number || person.House_Number || "N/A";
                            
                            // Check if this primary person is already assigned to another volunteer
                            const assignedVolunteerName = primaryPersonAssignments[personId];
                            const isAssignedToCurrentVolunteer = assignedVolunteerName === selectedVolunteerName;
                            const isAssignedToOtherVolunteer = !!(assignedVolunteerName && assignedVolunteerName !== selectedVolunteerName);
                            const isDisabled: boolean = isAssignedToOtherVolunteer;
                            
                            return (
                              <tr
                                key={person.id}
                                className={`${
                                  isDisabled 
                                    ? "bg-gray-200 opacity-60" 
                                    : isChecked
                                    ? "bg-blue-50 hover:bg-blue-100"
                                    : "hover:bg-gray-50"
                                } ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                                onClick={() => {
                                  if (!isDisabled) {
                                    if (isChecked) {
                                      setSelectedPrimaryPersonIds(prev => prev.filter(id => id !== personId));
                                    } else {
                                      setSelectedPrimaryPersonIds(prev => [...prev, personId]);
                                    }
                                  }
                                }}
                              >
                                <td className="px-3 py-2 border-b" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4"
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onChange={e => {
                                      if (!isDisabled && e.target.checked) {
                                        setSelectedPrimaryPersonIds(prev => [...prev, personId]);
                                      } else if (!isDisabled) {
                                        setSelectedPrimaryPersonIds(prev => prev.filter(id => id !== personId));
                                      }
                                    }}
                                  />
                                </td>
                                <td className="px-3 py-2 border-b font-medium text-gray-900">
                                  {highlightText(person.full_name || "", searchTerm)}
                                </td>
                                <td className="px-3 py-2 border-b text-gray-500">
                                  {person.ENG_Full_name ? highlightText(person.ENG_Full_name, searchTerm) : "-"}
                                </td>
                                <td className="px-3 py-2 border-b text-gray-400">
                                  {highlightText(person.Voter_Id || "", searchTerm)}
                                </td>
                                <td className="px-3 py-2 border-b text-gray-600 font-medium">
                                  {highlightText(houseNumber, searchTerm)}
                                </td>
                                <td className="px-3 py-2 border-b text-gray-400">
                                  {person.updated_mobile_no ? highlightText(person.updated_mobile_no, searchTerm) : "-"}
                                </td>
                                <td className="px-3 py-2 border-b">
                                  {isAssignedToOtherVolunteer && (
                                    <span className="text-red-600 font-medium text-xs">
                                      Assigned: <span className="font-bold">{assignedVolunteerName}</span>
                                    </span>
                                  )}
                                  {isAssignedToCurrentVolunteer && (
                                    <span className="text-green-600 font-medium text-xs">
                                      ✓ Current
                                    </span>
                                  )}
                                  {!isAssignedToOtherVolunteer && !isAssignedToCurrentVolunteer && (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
                {selectedPrimaryPersonIds.length > 0 && (
                  <div className="mt-2 text-xs text-green-600">
                    Selected: {selectedPrimaryPersonIds.length} primary person(s)
                  </div>
                )}
              </div>
            )}

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
            <Withoutbtn
              data={assignRows}
              columns={assignColumns}
              title="Assign Volunteer (Summary)"
              classname="h-[600px] overflow-y-auto"
              filterOptions={[]}
              searchKey="volunteer_name"
            />
          )}

          {/* Primary Person Modal */}
          {isPrimaryPersonModalOpen && (
            <Modal
              isOpen={isPrimaryPersonModalOpen}
              onClose={() => {
                setIsPrimaryPersonModalOpen(false);
                setModalPrimaryPersons([]);
                setSelectedVolunteerForModal("");
                setModalSearchTerm("");
              }}
              className="max-w-5xl p-6"
            >
              <div>
                <h3 className="text-lg font-semibold mb-4">Volunteer Name - {selectedVolunteerForModal}</h3>
                
                {/* Search Filter */}
                <div className="mb-4">
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholder="Search by Name, Voter ID, House No, Mobile, Colony..."
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                  />
                </div>

                <div className="max-h-[70vh] overflow-y-auto">
                {loadingModalPrimaryPersons ? (
                  <div className="text-center py-8 text-gray-500">Loading primary persons...</div>
                ) : (() => {
                  // Filter primary persons based on search term
                  const filteredPersons = modalPrimaryPersons.filter(person => {
                    if (!modalSearchTerm.trim()) return true;
                    const searchTerm = modalSearchTerm.toLowerCase().trim();
                    const fullName = (person.full_name || "").toLowerCase();
                    const engName = (person.ENG_Full_name || "").toLowerCase();
                    const voterId = (person.Voter_Id || "").toLowerCase();
                    const houseNo = (person.updated_house_number || person.House_Number || "").toLowerCase();
                    const mobileNo = (person.updated_mobile_no || "").toLowerCase();
                    const colonyName = (person.colony_name || "").toLowerCase();
                    
                    return (
                      fullName.includes(searchTerm) ||
                      engName.includes(searchTerm) ||
                      voterId.includes(searchTerm) ||
                      houseNo.includes(searchTerm) ||
                      mobileNo.includes(searchTerm) ||
                      colonyName.includes(searchTerm)
                    );
                  });

                  if (filteredPersons.length === 0 && modalPrimaryPersons.length > 0) {
                    return <div className="text-center py-8 text-gray-500">No primary persons found matching your search.</div>;
                  }

                  if (filteredPersons.length === 0) {
                    return <div className="text-center py-8 text-gray-500">No primary persons assigned to this volunteer.</div>;
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-gray-100 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Sr No</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Eng Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Voter ID</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">House No</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Mobile</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Colony</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPersons.map((person, index) => {
                            const houseNumber = person.updated_house_number || person.House_Number || "N/A";
                            return (
                              <tr key={person.id} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                                <td className="px-4 py-3 font-medium text-gray-900">{person.full_name || "-"}</td>
                                <td className="px-4 py-3 text-gray-500">{person.ENG_Full_name || "-"}</td>
                                <td className="px-4 py-3 text-gray-400">{person.Voter_Id || "-"}</td>
                                <td className="px-4 py-3 text-gray-600 font-medium">{houseNumber}</td>
                                <td className="px-4 py-3 text-gray-400">{person.updated_mobile_no || "-"}</td>
                                <td className="px-4 py-3 text-gray-500">{person.colony_name || "-"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
                </div>
                <div className="flex justify-end mt-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrimaryPersonModalOpen(false);
                      setModalPrimaryPersons([]);
                      setSelectedVolunteerForModal("");
                      setModalSearchTerm("");
                    }}
                    className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </>
      ) : (
        <>
          {activeTab === "A" ? (
            <>
              {loadingVolunteerMaster ? (
                <div className="bg-white rounded-2xl shadow-md border p-8 text-center">
                  <p className="text-gray-500 text-lg">Loading volunteer master data...</p>
                </div>
              ) : volunteerMasterRows.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-md border p-8 text-center">
                  <p className="text-gray-500 text-lg">There are no records to display</p>
                </div>
              ) : (
                <Withoutbtn
                  data={volunteerMasterRows}
                  columns={volunteerMasterColumns}
                  title="Volunteer Master"
                  classname="h-[600px] overflow-y-auto"
                  filterOptions={[]}
                  searchKey="volunteer_name"
                />
              )}
            </>
          ) : activeTab === "C" ? (
            <>
              {/* Tab C - Financial Data Filters */}
              <div className="border rounded-md p-4 space-y-3 bg-white">
                <h3 className="font-semibold text-sm">Financial Data - Installments</h3>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[250px]">
                    <Label>Search & Select Volunteer *</Label>
                    <div className="relative volunteer-dropdown-container">
                      <div
                        className="w-full px-3 py-2 border rounded-md text-sm bg-white cursor-pointer flex items-center justify-between"
                        onClick={() => {
                          setIsFinancialVolunteerDropdownOpen(!isFinancialVolunteerDropdownOpen);
                          if (!isFinancialVolunteerDropdownOpen && financialAvailableVolunteers.length === 0) {
                            loadFinancialVolunteers("");
                          }
                        }}
                      >
                        <span className={selectedFinancialVolunteerId ? "text-gray-900" : "text-gray-500"}>
                          {selectedFinancialVolunteerId
                            ? financialAvailableVolunteers.find(v => v.user_id === selectedFinancialVolunteerId)?.volunteer_name || "Select volunteer"
                            : "Click to select volunteer"}
                        </span>
                        <svg
                          className={`w-4 h-4 transition-transform ${isFinancialVolunteerDropdownOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      {isFinancialVolunteerDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                          <div className="p-2 border-b">
                            <input
                              type="text"
                              className="w-full px-3 py-2 border rounded-md text-sm"
                              placeholder="Search volunteer by name or contact..."
                              value={financialVolunteerSearchTerm}
                              onChange={e => {
                                setFinancialVolunteerSearchTerm(e.target.value);
                                loadFinancialVolunteers(e.target.value);
                              }}
                              onClick={e => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {loadingFinancialVolunteers ? (
                              <div className="p-3 text-xs text-gray-500 text-center">Loading...</div>
                            ) : financialAvailableVolunteers.length === 0 ? (
                              <div className="p-3 text-xs text-gray-500 text-center">No volunteers found</div>
                            ) : (
                              financialAvailableVolunteers
                                .filter(v => 
                                  !financialVolunteerSearchTerm || 
                                  v.volunteer_name.toLowerCase().includes(financialVolunteerSearchTerm.toLowerCase()) ||
                                  (v.contact_no && v.contact_no.includes(financialVolunteerSearchTerm))
                                )
                                .map(volunteer => (
                                  <div
                                    key={volunteer.user_id}
                                    onClick={() => {
                                      setSelectedFinancialVolunteerId(volunteer.user_id);
                                      setFinancialVolunteerSearchTerm("");
                                      setIsFinancialVolunteerDropdownOpen(false);
                                    }}
                                    className={`p-3 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 ${
                                      selectedFinancialVolunteerId === volunteer.user_id ? "bg-blue-100" : ""
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
                      value={selectedFinancialColonyId || ""}
                      onChange={e => {
                        const colonyId = Number(e.target.value);
                        const colony = filteredFinancialColonies.find(c => c.colony_id === colonyId);
                        if (colony) {
                          handleFinancialColonyChange(colonyId);
                        }
                      }}
                      disabled={!selectedFinancialVolunteerId}
                    >
                      <option value="">
                        {selectedFinancialVolunteerId ? "Select Colony" : "Select Volunteer First"}
                      </option>
                      {filteredFinancialColonies.map(c => (
                        <option key={c.colony_id} value={c.colony_id}>
                          {c.colony_name}
                        </option>
                      ))}
                    </select>
                    {selectedFinancialVolunteerId && filteredFinancialColonies.length === 0 && (
                      <p className="text-xs text-red-600 mt-1">No colonies assigned to this volunteer</p>
                    )}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                  {selectedFinancialColonyId && (
                  <div>
                    <Label>Select Primary Person (Multi) *</Label>
                    <div className="relative primary-person-dropdown-container">
                      <div
                        className="w-full px-3 py-2 border rounded-md text-sm bg-white cursor-pointer flex items-center justify-between "
                        onClick={() => {
                          setIsFinancialPrimaryPersonDropdownOpen(!isFinancialPrimaryPersonDropdownOpen);
                        }}
                      >
                        <span className={selectedFinancialPrimaryPersonIds.length > 0 ? "text-gray-900" : "text-gray-500"}>
                          {selectedFinancialPrimaryPersonIds.length > 0
                            ? `${selectedFinancialPrimaryPersonIds.length} primary person(s) selected`
                            : "Click to select primary persons"}
                        </span>
                        <svg
                          className={`w-4 h-4 transition-transform ${isFinancialPrimaryPersonDropdownOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      {isFinancialPrimaryPersonDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                          {/* Search input inside dropdown */}
                          <div className="p-2 border-b">
                            <input
                              type="text"
                              className="w-full px-3 py-2 border rounded-md text-sm"
                              placeholder="Search primary person by name, ID, etc..."
                              value={financialPrimaryPersonSearchTerm}
                              onChange={e => setFinancialPrimaryPersonSearchTerm(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                          {/* Dropdown list with checkboxes */}
                          <div className="max-h-60 overflow-y-auto">
                            {loadingFinancialPrimaryPersons ? (
                              <div className="p-3 text-xs text-gray-500 text-center">Loading primary persons...</div>
                            ) : (() => {
                              // Apply search filter
                              const filteredPersons = financialPrimaryPersons.filter(person => {
                                if (!financialPrimaryPersonSearchTerm.trim()) return true;
                                const searchTerm = financialPrimaryPersonSearchTerm.toLowerCase().trim();
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
                                  {/* Select All option */}
                                  <div className="p-2 border-b bg-gray-50">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4"
                                        checked={filteredPersons.length > 0 && filteredPersons.every(p => {
                                          const personVoterId = p.Voter_Id || String(p.id);
                                          return selectedFinancialPrimaryPersonIds.includes(personVoterId);
                                        })}
                                        onChange={e => {
                                          if (e.target.checked) {
                                            const selectableIds = filteredPersons.map(p => p.Voter_Id || String(p.id));
                                            setSelectedFinancialPrimaryPersonIds(prev => [...new Set([...prev, ...selectableIds])]);
                                          } else {
                                            const filteredIds = filteredPersons.map(p => p.Voter_Id || String(p.id));
                                            setSelectedFinancialPrimaryPersonIds(prev => prev.filter(id => !filteredIds.includes(id)));
                                          }
                                        }}
                                        onClick={e => e.stopPropagation()}
                                      />
                                      <span className="text-sm font-medium text-gray-700">Select All</span>
                                    </label>
                                  </div>
                                  {/* Primary person options */}
                                  {filteredPersons.map(person => {
                                    const personVoterId = person.Voter_Id || String(person.id);
                                    const isChecked = selectedFinancialPrimaryPersonIds.includes(personVoterId);
                                    const memberCount = person.member_count || 0;
                                    
                                    return (
                                      <div
                                        key={person.id}
                                        onClick={() => {
                                          if (isChecked) {
                                            setSelectedFinancialPrimaryPersonIds(prev => prev.filter(id => id !== personVoterId));
                                          } else {
                                            setSelectedFinancialPrimaryPersonIds(prev => [...prev, personVoterId]);
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
                                                setSelectedFinancialPrimaryPersonIds(prev => [...prev, personVoterId]);
                                              } else {
                                                setSelectedFinancialPrimaryPersonIds(prev => prev.filter(id => id !== personVoterId));
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
                    {/* {selectedFinancialPrimaryPersonIds.length > 0 && (
                      <div className="mt-2 text-xs text-green-600">
                        Selected: {selectedFinancialPrimaryPersonIds.length} primary person(s)
                      </div>
                    )} */}
                  </div>
                )}
                </div>
                </div>

              
              </div>

              {/* Tab C - Members Table */}
              {loadingFinancialMembers ? (
                <div className="bg-white rounded-2xl shadow-md border p-8 text-center">
                  <p className="text-gray-500 text-lg">Loading members...</p>
                </div>
              ) : financialMembers.length === 0 ? (
                selectedFinancialPrimaryPersonIds.length > 0 ? (
                  <div className="bg-white rounded-2xl shadow-md border p-8 text-center">
                    <p className="text-gray-500 text-lg">No members found for selected primary persons.</p>
                  </div>
                ) : null
              ) : (
                <div className="bg-white rounded-2xl shadow-md border">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold text-lg">Members ({financialMembers.length})</h3>
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
                              <span>Installment 1</span>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4"
                                  checked={isAllInstallmentChecked("inst_1_paid")}
                                  onChange={e => handleSelectAllInstallment("inst_1_paid", e.target.checked)}
                                  onClick={e => e.stopPropagation()}
                                />
                                <span className="text-xs text-gray-600">Select All</span>
                              </label>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-center border-b font-medium text-gray-700">
                            <div className="flex flex-col items-center gap-1">
                              <span>Installment 2</span>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4"
                                  checked={isAllInstallmentChecked("inst_2_paid")}
                                  onChange={e => handleSelectAllInstallment("inst_2_paid", e.target.checked)}
                                  onClick={e => e.stopPropagation()}
                                />
                                <span className="text-xs text-gray-600">Select All</span>
                              </label>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-center border-b font-medium text-gray-700">
                            <div className="flex flex-col items-center gap-1">
                              <span>Installment 3</span>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4"
                                  checked={isAllInstallmentChecked("inst_3_paid")}
                                  onChange={e => handleSelectAllInstallment("inst_3_paid", e.target.checked)}
                                  onClick={e => e.stopPropagation()}
                                />
                                <span className="text-xs text-gray-600">Select All</span>
                              </label>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialMembers.map((member, index) => {
                          const installments = memberInstallments[member.id] || { inst_1_paid: 0, inst_2_paid: 0, inst_3_paid: 0 };
                          return (
                            <tr key={member.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                              <td className="px-4 py-3 text-gray-400">{member.Voter_Id || "-"}</td>
                              <td className="px-4 py-3 font-medium text-gray-900">{member.full_name || "-"}</td>
                              <td className="px-4 py-3 text-gray-500">{member.ENG_Full_name || "-"}</td>
                              <td className="px-4 py-3 text-gray-600">{member.Age || "-"}</td>
                              <td className="px-4 py-3 text-gray-600">{member.Gender || "-"}</td>
                              <td className="px-4 py-3 text-gray-400">{member.updated_mobile_no || "-"}</td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4"
                                  checked={installments.inst_1_paid === 1}
                                  onChange={e => handleMemberInstallmentChange(member.id, "inst_1_paid", e.target.checked)}
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4"
                                  checked={installments.inst_2_paid === 1}
                                  onChange={e => handleMemberInstallmentChange(member.id, "inst_2_paid", e.target.checked)}
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4"
                                  checked={installments.inst_3_paid === 1}
                                  onChange={e => handleMemberInstallmentChange(member.id, "inst_3_paid", e.target.checked)}
                                />
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
                      onClick={handleSubmitFinancialData}
                      disabled={submittingFinancialData || financialMembers.length === 0}
                      className="px-6 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submittingFinancialData ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : activeTab === "D" ? (
            <>
              {/* Tab D - Voting Status Filters */}
              <div className="border rounded-md p-4 space-y-3 bg-white">
                <h3 className="font-semibold text-sm">Voting Status</h3>
                <div className="flex flex-wrap items-end gap-3">
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
                  <div className="flex-1 min-w-[200px]">
                  {selectedVotingColonyId && (
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
                )}
                  </div>
                </div>

            
              </div>

              {/* Tab D - Members Table */}
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
                                    // If unchecking, check if any members have "Completed" status originally
                                    if (!e.target.checked) {
                                      const membersWithCompleted = votingMembers.filter(member => {
                                        const originalValue = originalVotingStatus[member.id] || false;
                                        return originalValue === true;
                                      });

                                      if (membersWithCompleted.length > 0) {
                                        // Show confirmation for unchecking all
                                        setPendingVotingUncheck({
                                          memberId: -1, // Special value for "all members"
                                          memberName: `${membersWithCompleted.length} member(s)`,
                                        });
                                        setShowVotingUncheckConfirmation(true);
                                        return;
                                      }
                                    }
                                    
                                    // Otherwise, proceed with the change (checking all or unchecking when no completed members)
                                    setMemberVotingStatus(prev => {
                                      const updated = { ...prev };
                                      votingMembers.forEach(member => {
                                        updated[member.id] = e.target.checked;
                                      });
                                      return updated;
                                    });
                                    
                                    // Update original values if checking all
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
                            <tr key={member.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                              <td className="px-4 py-3 text-gray-400">{member.Voter_Id || "-"}</td>
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
            </>
          ) : (
            <Withoutbtn
              data={rows}
              columns={votingColumns}
              title="Voting Status"
              classname="h-[600px] overflow-y-auto"
              filterOptions={[]}
              searchKey="full_name"
            />
          )}
          {/* Volunteer Master Modal */}
          {activeTab === "A" && (
            <Modal
              isOpen={isVolunteerModalOpen}
              onClose={() => {
                setIsVolunteerModalOpen(false);
                setVolunteerFormData({
                  volunteer_name: "",
                  contact_no: "",
                  status: "Active",
                });
              }}
              className="max-w-md p-6"
            >
              <div>
                <h3 className="text-lg font-semibold mb-4">Add Volunteer</h3>
                <div className="space-y-4">
                  <div>
                    
                    <Label>Volunteer Name *</Label>
                    <input
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={volunteerFormData.volunteer_name}
                      onChange={e => setVolunteerFormData({ ...volunteerFormData, volunteer_name: e.target.value })}
                      placeholder="Enter volunteer name"
                    />
                  </div>
                  <div>
                    <Label>Contact Number</Label>
                    <input
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={volunteerFormData.contact_no}
                      onChange={e => setVolunteerFormData({ ...volunteerFormData, contact_no: e.target.value })}
                      placeholder="Enter contact number"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={volunteerFormData.status}
                      onChange={e => setVolunteerFormData({ ...volunteerFormData, status: e.target.value as "Active" | "Inactive" })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setIsVolunteerModalOpen(false);
                        setVolunteerFormData({
                          volunteer_name: "",
                          contact_no: "",
                          status: "Active",
                        });
                      }}
                      className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateVolunteer}
                      disabled={creatingVolunteer}
                      className="px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {creatingVolunteer ? "Creating..." : "Create"}
                    </button>
                  </div>
                </div>
              </div>
            </Modal>
          )}

          {/* Volunteer Master Edit Modal */}
          {activeTab === "A" && (
            <Modal
              isOpen={isEditModalOpen}
              onClose={() => {
                setIsEditModalOpen(false);
                setEditingVolunteerId(null);
                setVolunteerFormData({
                  volunteer_name: "",
                  contact_no: "",
                  status: "Active",
                });
              }}
              className="max-w-md p-6"
            >
              <div>
                <h3 className="text-lg font-semibold mb-4">Edit Volunteer</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Volunteer Name *</Label>
                    <input
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={volunteerFormData.volunteer_name}
                      onChange={e => setVolunteerFormData({ ...volunteerFormData, volunteer_name: e.target.value })}
                      placeholder="Enter volunteer name"
                    />
                  </div>
                  <div>
                    <Label>Contact Number</Label>
                    <input
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={volunteerFormData.contact_no}
                      onChange={e => setVolunteerFormData({ ...volunteerFormData, contact_no: e.target.value })}
                      placeholder="Enter contact number"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={volunteerFormData.status}
                      onChange={e => setVolunteerFormData({ ...volunteerFormData, status: e.target.value as "Active" | "Inactive" })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditModalOpen(false);
                        setEditingVolunteerId(null);
                        setVolunteerFormData({
                          volunteer_name: "",
                          contact_no: "",
                          status: "Active",
                        });
                      }}
                      className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateVolunteer}
                      disabled={updatingVolunteer}
                      className="px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {updatingVolunteer ? "Updating..." : "Update"}
                    </button>
                  </div>
                </div>
              </div>
            </Modal>
          )}

        </>
      )}

      {/* Tab C - Confirmation Modal for Unchecking Saved Installments */}
      {showUncheckConfirmation && pendingUncheck && (
        <Modal
          isOpen={showUncheckConfirmation}
          onClose={handleCancelUncheck}
          className="max-w-md p-6"
        >
          <div>
            <h3 className="text-lg font-semibold mb-4">Confirm Uncheck Installment</h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                {pendingUncheck.memberId === -1 ? (
                  <>
                    Are you sure you want to uncheck <strong>Installment {pendingUncheck.installment === "inst_1_paid" ? "1" : pendingUncheck.installment === "inst_2_paid" ? "2" : "3"}</strong> for all <strong>{pendingUncheck.memberName}</strong>?
                  </>
                ) : (
                  <>
                    Are you sure you want to uncheck <strong>Installment {pendingUncheck.installment === "inst_1_paid" ? "1" : pendingUncheck.installment === "inst_2_paid" ? "2" : "3"}</strong> for{" "}
                    <strong>{pendingUncheck.memberName}</strong>?
                  </>
                )}
              </p>
              <p className="text-xs text-red-600">
                This installment was previously saved in the database. Unchecking it will remove the saved status.
              </p>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={handleCancelUncheck}
                  className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUncheck}
                  className="px-4 py-2 text-sm font-medium rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Confirm Uncheck
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Tab D - Confirmation Modal for Unchecking Saved Voting Status */}
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

      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={page <= 1 || loading}
            onClick={() => fetchData(page - 1)}
          >
            Prev
          </button>
          <button
            type="button"
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={page >= totalPages || loading}
            onClick={() => fetchData(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoterMaster;


