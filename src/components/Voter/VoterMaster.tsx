"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
// import { ReusableTable } from "../tables/BasicTableOne";
import { Column } from "../tables/tabletype";
import Label from "../form/Label";
import { Modal } from "../ui/modal";
// import { Simpletableshowdata } from "../tables/Simpletableshowdata";
import { Withoutbtn } from "../tables/Withoutbtn";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { FaEdit, FaPowerOff, FaKey } from 'react-icons/fa';
import { getVoterIdColorClass } from "@/lib/utils";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [rows, setRows] = useState<VoterMasterRow[]>([]); // setRows used in fetchData and updateRow
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // const [search, setSearch] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [savingId, setSavingId] = useState<number | null>(null); // setSavingId used in handleSaveRow
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
    category_id?: number | null;
    primary_person_id?: string | null;
  };
  type AssignRow = {
    id: number;
    sr_no: number;
    volunteer_name: string;
    contact_no: string;
    colony_names: string;
    primary_person_count: number;
    total_voters?: number;
    status: string;
    username: string;
    password: string;
    category_id?: number | null;
    category_name?: string | null;
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
    category_id: null as number | null,
  });
  const [creatingVolunteer, setCreatingVolunteer] = useState(false);
  const [updatingVolunteer, setUpdatingVolunteer] = useState(false);
  // const [deletingVolunteerId, setDeletingVolunteerId] = useState<number | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [resettingPasswordId, setResettingPasswordId] = useState<number | null>(null);
  
  // Category state
  type CategoryOption = {
    category_id: number;
    name: string;
  };
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Tab B - Searchable volunteer select state
  const [volunteerSearchTerm, setVolunteerSearchTerm] = useState("");
  const [availableVolunteers, setAvailableVolunteers] = useState<VolunteerMasterApiItem[]>([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<number | null>(null);
  const [isVolunteerDropdownOpen, setIsVolunteerDropdownOpen] = useState(false);
  
  // Tab B - Colony and Primary Person state
  const [selectedColonyId, setSelectedColonyId] = useState<number | null>(null);
  const [selectedColonyName, setSelectedColonyName] = useState<string>("");
  const [isColonyDropdownOpen, setIsColonyDropdownOpen] = useState(false);
  const [colonySearchTerm, setColonySearchTerm] = useState<string>("");
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
    inst_1_paid?: string | number | null;
    inst_2_paid?: string | number | null;
    inst_3_paid?: string | number | null;
    member_count?: number;
  }>>([]);
  const [loadingPrimaryPersons, setLoadingPrimaryPersons] = useState(false);
  const [selectedPrimaryPersonIds, setSelectedPrimaryPersonIds] = useState<string[]>([]);
  const [primaryPersonSearchTerm, setPrimaryPersonSearchTerm] = useState("");
  const [primaryPersonAssignments, setPrimaryPersonAssignments] = useState<Record<string, string>>({});

  // Family Members Modal state
  const [isFamilyMembersModalOpen, setIsFamilyMembersModalOpen] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loadingFamilyMembers, setLoadingFamilyMembers] = useState(false);
  const [selectedPrimaryPersonForFamilyModal, setSelectedPrimaryPersonForFamilyModal] = useState<{
    id: number;
    Voter_Id: string;
    full_name: string;
  } | null>(null);

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
    member_count?: number;
    inst_1_paid?: string | number | null;
    inst_2_paid?: string | number | null;
    inst_3_paid?: string | number | null;
  }>>([]);
  const [loadingModalPrimaryPersons, setLoadingModalPrimaryPersons] = useState(false);
  const [selectedVolunteerForModal, setSelectedVolunteerForModal] = useState<string>("");
  const [modalSearchTerm, setModalSearchTerm] = useState<string>("");

  // Total Voters Modal state
  const [isTotalVotersModalOpen, setIsTotalVotersModalOpen] = useState(false);
  const [modalTotalVoters, setModalTotalVoters] = useState<FamilyMember[]>([]);
  const [loadingModalTotalVoters, setLoadingModalTotalVoters] = useState(false);
  const [selectedVolunteerForTotalVotersModal, setSelectedVolunteerForTotalVotersModal] = useState<string>("");
  const [totalVotersModalSearchTerm, setTotalVotersModalSearchTerm] = useState<string>("");

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
    inst_1_paid?: string | number | null;
    inst_2_paid?: string | number | null;
    inst_3_paid?: string | number | null;
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

  // Extended FamilyMember with volunteer information
  type FamilyMemberWithVolunteer = FamilyMember & {
    volunteer_name?: string;
    volunteer_contact?: string;
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
  // const [votingVolunteerSearchTerm, setVotingVolunteerSearchTerm] = useState(""); // Unused
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [votingAvailableVolunteers, setVotingAvailableVolunteers] = useState<VolunteerMasterApiItem[]>([]);
  // const [loadingVotingVolunteers, setLoadingVotingVolunteers] = useState(false); // Unused
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedVotingVolunteerId, setSelectedVotingVolunteerId] = useState<number | null>(null);
  const [isVotingVolunteerDropdownOpen, setIsVotingVolunteerDropdownOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedVotingColonyId, setSelectedVotingColonyId] = useState<number | null>(null);

  // Tab D - Voting Status Summary Table
  type VotingStatusSummaryRow = {
    volunteer_id: number;
    volunteer_name: string;
    volunteer_contact: string;
    assigned_colony: string;
    total_voters: number;
    in_transit_count: number;
    voting_done_count: number;
    pending_count: number;
    percentage: number;
    _allMembers?: FamilyMember[]; // All family members for this volunteer
  };
  const [votingStatusSummary, setVotingStatusSummary] = useState<VotingStatusSummaryRow[]>([]);
  const [loadingVotingStatusSummary, setLoadingVotingStatusSummary] = useState(false);
  const [votingStatusSearch, setVotingStatusSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof VotingStatusSummaryRow | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  // Cache for all primary persons (pre-fetched for Tab D performance)
  const [cachedAllPrimaryPersons, setCachedAllPrimaryPersons] = useState<Array<{
    id: number;
    Voter_Id: string;
    full_name: string;
    ENG_Full_name?: string;
    member_count?: number;
  }>>([]);
  const [isPreFetchingPrimaryPersons, setIsPreFetchingPrimaryPersons] = useState(false);

  // Tab D - Status List Modals
  const [isStatusListModalOpen, setIsStatusListModalOpen] = useState(false);
  const [statusListModalType, setStatusListModalType] = useState<"in_transit" | "voting_done" | "pending" | null>(null);
  const [statusListData, setStatusListData] = useState<FamilyMember[]>([]);
  const [statusListVolunteerName, setStatusListVolunteerName] = useState<string>("");
  
  // Tab D - Summary Card Modal
  const [isSummaryCardModalOpen, setIsSummaryCardModalOpen] = useState(false);
  const [summaryCardModalType, setSummaryCardModalType] = useState<"total_voters" | "in_transit" | "voting_done" | "pending" | null>(null);
  const [summaryCardModalData, setSummaryCardModalData] = useState<FamilyMemberWithVolunteer[]>([]);
  const [summaryCardModalSearch, setSummaryCardModalSearch] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingStatusList, setLoadingStatusList] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [votingPrimaryPersons, setVotingPrimaryPersons] = useState<Array<{
    id: number;
    Voter_Id: string;
    full_name: string;
    ENG_Full_name?: string;
    Updated_colony: string | number | null;
    updated_house_number?: string | null;
    House_Number?: string | null;
    colony_name?: string | null;
    member_count?: number;
    inst_1_paid?: string | number | null;
    inst_2_paid?: string | number | null;
    inst_3_paid?: string | number | null;
    updated_mobile_no?: string | null;
  }>>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingVotingPrimaryPersons, setLoadingVotingPrimaryPersons] = useState(false);
  const [selectedVotingPrimaryPersonIds, setSelectedVotingPrimaryPersonIds] = useState<string[]>([]);
  // const [votingPrimaryPersonSearchTerm, setVotingPrimaryPersonSearchTerm] = useState(""); // Unused
  const [isVotingPrimaryPersonDropdownOpen, setIsVotingPrimaryPersonDropdownOpen] = useState(false);
  
  // Tab D - Members data
  const [votingMembers, setVotingMembers] = useState<FamilyMember[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingVotingMembers, setLoadingVotingMembers] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [memberVotingStatus, setMemberVotingStatus] = useState<Record<number, boolean>>({});
  // Track original voting status from database to detect if user is unchecking a saved "Completed" status
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [originalVotingStatus, setOriginalVotingStatus] = useState<Record<number, boolean>>({});
  // const [submittingVotingData, setSubmittingVotingData] = useState(false); // Unused
  
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

  // Load categories (only category_id 5 and 6)
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const res = await fetch("/api/usercategorycrud", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch categories");
        const json = await res.json();
        // Filter only category_id 5 and 6
        const filteredCategories = (Array.isArray(json) ? json : []).filter(
          (cat: CategoryOption) => cat.category_id === 5 || cat.category_id === 6
        );
        setCategories(filteredCategories);
      } catch (e) {
        console.error(e);
        toast.error("Category list load होत नाही.");
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  // Reload volunteer master data when categories are loaded (to show category names)
  useEffect(() => {
    if (categories.length > 0 && activeTab === "A") {
      fetchVolunteerMasterData("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

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
      const processedData: AssignRow[] = (json.data || [])
        .filter((item: VolunteerMasterApiItem) => 
          item.status === "Active" && Number(item.category_id) === 5 // Only show Active volunteers with category_id = 5
        )
        .map((item: VolunteerMasterApiItem & { primary_person_id?: string | null }, index: number) => {
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
            total_voters: undefined, // Will be calculated below
            status: item.status || "Active",
            username: item.username || "",
            password: item.password || "",
            category_id: item.category_id || null,
          };
        });
      
      // Calculate total_voters and filter colonies for each volunteer by fetching primary persons
      const dataWithTotalVoters = await Promise.all(
        processedData.map(async (row: AssignRow) => {
          if (row.primary_person_count === 0) {
            return { ...row, total_voters: 0, colony_names: "" }; // No primary persons = no colonies to show
          }
          
          try {
            const primaryPersonsRes = await fetch(
              `/api/voterstatus/primarypersons?only_assigned=true&volunteer_id=${row.id}`,
              { cache: "no-store" }
            );
            if (primaryPersonsRes.ok) {
              const primaryPersons = await primaryPersonsRes.json();
              const totalVoters = primaryPersons.reduce(
                (sum: number, pp: { member_count?: number }) => sum + (pp.member_count || 0),
                0
              );
              
              // Get unique colony names from primary persons (only colonies that have primary persons)
              const colonyNamesSet = new Set<string>();
              primaryPersons.forEach((pp: { colony_name?: string | null }) => {
                if (pp.colony_name) {
                  colonyNamesSet.add(pp.colony_name);
                }
              });
              
              // Filter colony_names to only include colonies that have primary persons
              let filteredColonyNames = "";
              if (colonyNamesSet.size > 0) {
                const colonyNamesArray = Array.from(colonyNamesSet);
                // Format with numbers: 1) Colony1, 2) Colony2, etc.
                filteredColonyNames = colonyNamesArray
                  .map((name, index) => `${index + 1}) ${name}`)
                  .join(', ');
              }
              
              return { ...row, total_voters: totalVoters, colony_names: filteredColonyNames };
            }
          } catch (e) {
            console.error(`Error fetching total voters for volunteer ${row.volunteer_name}:`, e);
          }
          
          return { ...row, total_voters: 0, colony_names: "" };
        })
      );
      
      setAssignRows(dataWithTotalVoters);
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
      const processedData = (json.data || [])
        .map((item: VolunteerMasterApiItem & { primary_person_id?: string | null }, index: number) => {
          // Calculate primary person count from primary_person_id (comma-separated string)
          const primaryPersonCount = item.primary_person_id
            ? item.primary_person_id.split(',').filter((id: string) => id.trim()).length
            : 0;
          
          // Find category name from categories state
          const categoryName = item.category_id 
            ? categories.find(cat => cat.category_id === item.category_id)?.name || null
            : null;
          
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
            category_id: item.category_id || null,
            category_name: categoryName,
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

  // Pre-fetch primary persons when component mounts (for Tab D performance)
  useEffect(() => {
    // Pre-fetch immediately when component mounts
    preFetchAllPrimaryPersons();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fetch primary persons when on other tabs (for Tab D performance)
  useEffect(() => {
    // Pre-fetch in background when on tabs A, B, or C (if cache is empty)
    if ((activeTab === "A" || activeTab === "B" || activeTab === "C") && cachedAllPrimaryPersons.length === 0) {
      preFetchAllPrimaryPersons();
    }
  }, [activeTab, cachedAllPrimaryPersons.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
    } else if (activeTab === "D") {
      loadVotingStatusSummary();
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
      setIsColonyDropdownOpen(false);
      setSelectedColonyId(null);
      setSelectedColonyName("");
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
      // Filter out inactive volunteers
      setAvailableVolunteers((json.data || []).filter((v: VolunteerMasterApiItem) => v.status === "Active"));
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

      // Auto-select all primary persons by default
      const allPersonIds = (json || []).map((person: {id: number}) => String(person.id));
      setSelectedPrimaryPersonIds(allPersonIds);

      // Load assignments after loading primary persons (only if volunteer is selected)
      // But don't let it override our auto-selection - just load for display purposes
      if (selectedVolunteerId) {
        const selectedVolunteer = availableVolunteers.find(v => v.user_id === selectedVolunteerId);
        if (selectedVolunteer) {
          await loadPrimaryPersonAssignments(selectedVolunteer.volunteer_name);
        }
      } else {
        // Just load all assignments if no volunteer selected
        await loadPrimaryPersonAssignments();
      }

      // Ensure all primary persons remain selected after loading assignments
      setSelectedPrimaryPersonIds(allPersonIds);
    } catch (e) {
      console.error(e);
      toast.error("Primary persons load होत नाही.");
      setPrimaryPersons([]);
    } finally {
      setLoadingPrimaryPersons(false);
    }
  };

  // Load family members for a primary person
  const loadFamilyMembers = async (primaryPersonVoterId: string, primaryPersonId: number, primaryPersonName: string) => {
    setLoadingFamilyMembers(true);
    setSelectedPrimaryPersonForFamilyModal({
      id: primaryPersonId,
      Voter_Id: primaryPersonVoterId,
      full_name: primaryPersonName,
    });
    try {
      const res = await fetch(`/api/voterstatus/familymembers?primary_person_id=${encodeURIComponent(primaryPersonVoterId)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load family members");
      const json = await res.json();
      setFamilyMembers(json || []);
      setIsFamilyMembersModalOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Family members load होत नाही.");
      setFamilyMembers([]);
    } finally {
      setLoadingFamilyMembers(false);
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
      // Filter out inactive volunteers
      setFinancialAvailableVolunteers((json.data || []).filter((v: VolunteerMasterApiItem) => v.status === "Active"));
    } catch (e) {
      console.error(e);
      toast.error("Volunteers load होत नाही.");
    } finally {
      setLoadingFinancialVolunteers(false);
    }
  };

  // Tab C - Load primary persons when colony is selected
  // Only show primary persons that are assigned to the selected volunteer in volunteer_master table
  const loadFinancialPrimaryPersons = async (colonyId: number, volunteerId: number | null = null) => {
    if (!colonyId) {
      setFinancialPrimaryPersons([]);
      setSelectedFinancialPrimaryPersonIds([]);
      setFinancialMembers([]);
      setMemberInstallments({});
      return;
    }

    // Require volunteer to be selected
    if (!volunteerId) {
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
      params.set("volunteer_id", String(volunteerId)); // Always include volunteer_id filter
      
      const res = await fetch(`/api/voterstatus/primarypersons?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Failed to load primary persons:", errorText);
        throw new Error("Failed to load primary persons");
      }
      const json = await res.json();
      console.log("Loaded primary persons:", json?.length || 0, "for colony:", colonyId, "volunteer:", volunteerId);
      setFinancialPrimaryPersons(json || []);
    } catch (e) {
      console.error("Error loading primary persons:", e);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    loadFinancialPrimaryPersons(colonyId, selectedFinancialVolunteerId);
  };

  // Tab C - Handle volunteer change: reload primary persons if colony is selected, or clear if volunteer is cleared
  useEffect(() => {
    if (!selectedFinancialVolunteerId) {
      // If volunteer is cleared, clear everything
      setSelectedFinancialColonyId(null);
      setFinancialPrimaryPersons([]);
      setSelectedFinancialPrimaryPersonIds([]);
      setFinancialMembers([]);
      setMemberInstallments({});
    } else {
      // Check if the currently selected colony belongs to the new volunteer
      const selectedVolunteer = financialAvailableVolunteers.find(v => v.user_id === selectedFinancialVolunteerId);
      let volunteerColonyIds: number[] = [];
      if (selectedVolunteer) {
        if (selectedVolunteer.colony_ids && selectedVolunteer.colony_ids.length > 0) {
          volunteerColonyIds = selectedVolunteer.colony_ids;
        } else if (selectedVolunteer.colony_id) {
          volunteerColonyIds = selectedVolunteer.colony_id
            .split(',')
            .map(id => Number(id.trim()))
            .filter(id => !isNaN(id) && id > 0);
        }
      }

      // If colony is selected, check if it belongs to the new volunteer
      if (selectedFinancialColonyId) {
        if (volunteerColonyIds.length > 0 && !volunteerColonyIds.includes(selectedFinancialColonyId)) {
          // Selected colony doesn't belong to new volunteer, clear it
          setSelectedFinancialColonyId(null);
          setFinancialPrimaryPersons([]);
          setSelectedFinancialPrimaryPersonIds([]);
          setFinancialMembers([]);
          setMemberInstallments({});
        } else if (volunteerColonyIds.length > 0 && volunteerColonyIds.includes(selectedFinancialColonyId)) {
          // Colony belongs to volunteer, reload primary persons with new volunteer filter
          loadFinancialPrimaryPersons(selectedFinancialColonyId, selectedFinancialVolunteerId);
          // Clear selected primary persons when volunteer changes
          setSelectedFinancialPrimaryPersonIds([]);
          setFinancialMembers([]);
          setMemberInstallments({});
        }
      } else {
        // Volunteer selected but no colony yet - just clear primary persons
        setFinancialPrimaryPersons([]);
        setSelectedFinancialPrimaryPersonIds([]);
        setFinancialMembers([]);
        setMemberInstallments({});
      }
    }
  }, [selectedFinancialVolunteerId, financialAvailableVolunteers, selectedFinancialColonyId]);

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
  // const loadVotingVolunteers = async (searchText = "") => { // Unused
  //   setLoadingVotingVolunteers(true);
  //   try {
  //     const params = new URLSearchParams();
  //     if (searchText.trim()) params.set("search", searchText.trim());
  //     
  //     const res = await fetch(`/api/volunteermaster?${params.toString()}`, {
  //       cache: "no-store",
  //     });
  //     if (!res.ok) throw new Error("Failed to load volunteers");
  //     const json = await res.json();
  //     // Filter out inactive volunteers
  //     setVotingAvailableVolunteers((json.data || []).filter((v: VolunteerMasterApiItem) => v.status === "Active"));
  //   } catch (e) {
  //     console.error(e);
  //     toast.error("Volunteers load होत नाही.");
  //   } finally {
  //     setLoadingVotingVolunteers(false);
  //   }
  // };

  // Pre-fetch all primary persons for Tab D (called when component mounts or on other tabs)
  const preFetchAllPrimaryPersons = async () => {
    // Only pre-fetch if cache is empty and not already fetching
    if (cachedAllPrimaryPersons.length > 0 || isPreFetchingPrimaryPersons) {
      return;
    }
    
    setIsPreFetchingPrimaryPersons(true);
    try {
      console.log("[Voting Status] Pre-fetching all primary persons...");
      const startTime = performance.now();
      const primaryPersonsRes = await fetch("/api/voterstatus/primarypersons?only_assigned=false", {
        cache: "no-store",
      });
      if (primaryPersonsRes.ok) {
        const data = await primaryPersonsRes.json();
        setCachedAllPrimaryPersons(data);
        console.log(`[Voting Status] Pre-fetched ${data.length} primary persons in ${(performance.now() - startTime).toFixed(2)}ms`);
      }
    } catch (e) {
      console.error("[Voting Status] Error pre-fetching primary persons:", e);
    } finally {
      setIsPreFetchingPrimaryPersons(false);
    }
  };

  // Tab D - Load voting status summary
  const loadVotingStatusSummary = async () => {
    const startTime = performance.now();
    console.log("[Voting Status] Starting to load voting status summary...");
    setLoadingVotingStatusSummary(true);
    try {
      // Optimize: Fetch primary persons and volunteers in parallel for better performance
      let allPrimaryPersons = cachedAllPrimaryPersons;
      const primaryPersonsPromise = allPrimaryPersons.length === 0
        ? fetch("/api/voterstatus/primarypersons?only_assigned=false", {
            cache: "no-store",
          }).then(async (res) => {
            const data = res.ok ? await res.json() : [];
            setCachedAllPrimaryPersons(data);
            return data;
          })
        : Promise.resolve(allPrimaryPersons);
      
      const volunteersPromise = fetch("/api/volunteermaster", {
        cache: "no-store",
      }).then(async (res) => {
        if (!res.ok) throw new Error("Failed to load volunteers");
        const json = await res.json();
        return (json.data || []).filter((v: VolunteerMasterApiItem) => v.status === "Active");
      });
      
      // Execute both fetches in parallel
      const [primaryPersonsResult, activeVolunteers] = await Promise.all([
        primaryPersonsPromise,
        volunteersPromise
      ]);
      
      if (allPrimaryPersons.length === 0) {
        allPrimaryPersons = primaryPersonsResult || [];
        console.log(`[Voting Status] Primary persons loaded (${allPrimaryPersons.length} persons)`);
      } else {
        console.log(`[Voting Status] Using cached primary persons (${allPrimaryPersons.length} persons)`);
      }
      
      console.log(`[Voting Status] Volunteers loaded (${activeVolunteers.length} active volunteers)`);
      
      // Fetch voting status data for each volunteer
      const summaryPromises = activeVolunteers.map(async (volunteer: VolunteerMasterApiItem) => {
        try {
          // Get all family members for this volunteer's assigned primary persons
          const primaryPersonIds = volunteer.primary_person_id 
            ? volunteer.primary_person_id.split(',').map((id: string) => id.trim()).filter(Boolean)
            : [];
          
          if (primaryPersonIds.length === 0) {
            return {
              volunteer_id: volunteer.user_id,
              volunteer_name: volunteer.volunteer_name,
              volunteer_contact: volunteer.contact_no || "",
              assigned_colony: volunteer.colony_names || "",
              total_voters: 0,
              in_transit_count: 0,
              voting_done_count: 0,
              pending_count: 0,
              percentage: 0,
              _allMembers: [],
            } as VotingStatusSummaryRow;
          }

          // Find primary persons data from the pre-fetched list to get correct Voter_Id
          // primary_person_id in volunteer_master can be stored as either id or Voter_Id
          type PrimaryPersonType = {
            Voter_Id: string;
            id: number;
            member_count?: number;
          };
          const primaryPersonsData = primaryPersonIds
            .map((primaryPersonId: string) => {
              return allPrimaryPersons.find((pp: PrimaryPersonType) => 
                String(pp.Voter_Id) === primaryPersonId || String(pp.id) === primaryPersonId
              );
            })
            .filter(Boolean) as PrimaryPersonType[];

          // Extract Voter_Id values (the API needs Voter_Id, not id)
          const primaryPersonVoterIds = primaryPersonsData.map((pp: PrimaryPersonType) => pp.Voter_Id).filter(Boolean);

          if (primaryPersonVoterIds.length === 0) {
            return {
              volunteer_id: volunteer.user_id,
              volunteer_name: volunteer.volunteer_name,
              volunteer_contact: volunteer.contact_no || "",
              assigned_colony: volunteer.colony_names || "",
              total_voters: 0,
              in_transit_count: 0,
              voting_done_count: 0,
              pending_count: 0,
              percentage: 0,
              _allMembers: [],
            } as VotingStatusSummaryRow;
          }

          // Fetch all family members for all primary persons using Voter_Id in a single batch request
          // This gets all voters (including primary persons) where family_member IN (primaryPersonVoterIds)
          // Using batch API to reduce number of API calls significantly
          let allMembersFlat: FamilyMember[] = [];
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for batch request
            
            // Batch API call: pass all primary person IDs as comma-separated string
            const batchIds = primaryPersonVoterIds.join(',');
            const res = await fetch(`/api/voterstatus/familymembers?primary_person_ids=${encodeURIComponent(batchIds)}`, {
              cache: "no-store",
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            
            if (res.ok) {
              allMembersFlat = await res.json() as FamilyMember[];
            } else {
              console.error(`Error fetching batch members for volunteer ${volunteer.volunteer_name}:`, res.statusText);
            }
          } catch (e: unknown) {
            const error = e as { name?: string };
            if (error.name !== 'AbortError') {
              console.error(`Error fetching batch members for volunteer ${volunteer.volunteer_name}:`, e);
            }
          }
          
          // Remove duplicates based on id (since same voter might be in multiple primary person families)
          // This ensures we count each voter only once
          const uniqueMembersMap = new Map<number, FamilyMember>();
          allMembersFlat.forEach(member => {
            if (member.id && !uniqueMembersMap.has(member.id)) {
              uniqueMembersMap.set(member.id, member);
            }
          });
          const allMembers = Array.from(uniqueMembersMap.values());

          // Calculate total_voters: sum of member_count from each primary person
          // This matches exactly how B tab shows FamilyMember Count (sum of all member_count values)
          // member_count = COUNT(*) WHERE family_member = Voter_Id (includes primary person + all family members)
          const totalVoters = primaryPersonsData.reduce((sum: number, pp: PrimaryPersonType) => {
            return sum + (pp.member_count || 0);
          }, 0);

          // Count by voting_status from tbl_voters_search
          // In Transit: voting_status = "In Transit"
          const inTransitCount = allMembers.filter(m => m.voting_status === "In Transit").length;
          // Voting Done: voting_status = "Completed" OR "Direct" (both considered as voting done)
          const votingDoneCount = allMembers.filter(m => m.voting_status === "Completed" || m.voting_status === "Direct").length;
          // Pending: voting_status = "Pending" or NULL or empty
          const pendingCount = allMembers.filter(m => !m.voting_status || m.voting_status === "" || m.voting_status === "Pending").length;
          // Percentage: (Completed + Direct) / Total * 100
          const percentage = totalVoters > 0 ? Math.round((votingDoneCount / totalVoters) * 100) : 0;

          return {
            volunteer_id: volunteer.user_id,
            volunteer_name: volunteer.volunteer_name,
            volunteer_contact: volunteer.contact_no || "",
            assigned_colony: volunteer.colony_names || "",
            total_voters: totalVoters,
            in_transit_count: inTransitCount,
            voting_done_count: votingDoneCount,
            pending_count: pendingCount,
            percentage: percentage,
            _allMembers: allMembers, // Store for modal access
          } as VotingStatusSummaryRow;
        } catch (e) {
          console.error(`Error loading data for volunteer ${volunteer.volunteer_name}:`, e);
          return {
            volunteer_id: volunteer.user_id,
            volunteer_name: volunteer.volunteer_name,
            volunteer_contact: volunteer.contact_no || "",
            assigned_colony: volunteer.colony_names || "",
            total_voters: 0,
            in_transit_count: 0,
            voting_done_count: 0,
            pending_count: 0,
            percentage: 0,
            _allMembers: [],
          } as VotingStatusSummaryRow;
        }
      });

      // Use Promise.allSettled to ensure all promises complete even if some fail
      const summaryStart = performance.now();
      const summaryResults = await Promise.allSettled(summaryPromises);
      const summary = summaryResults
        .map(result => result.status === 'fulfilled' ? result.value : null)
        .filter(s => s !== null) as VotingStatusSummaryRow[];

      // Sort by total_voters count in descending order (highest count first)
      summary.sort((a, b) => b.total_voters - a.total_voters);

      const totalTime = performance.now() - startTime;
      console.log(`[Voting Status] Summary loaded in ${(performance.now() - summaryStart).toFixed(2)}ms`);
      console.log(`[Voting Status] Total loading time: ${totalTime.toFixed(2)}ms (${summary.length} volunteers)`);
      setVotingStatusSummary(summary);
      
      if (summary.length === 0 && activeVolunteers.length > 0) {
        toast.info("No voting status data available for active volunteers.");
      }
    } catch (e) {
      console.error("Error loading voting status summary:", e);
      toast.error("Voting status summary load होत नाही.");
      setVotingStatusSummary([]);
    } finally {
      setLoadingVotingStatusSummary(false);
    }
  };

  // Tab D - Open summary card modal
  const openSummaryCardModal = (type: "total_voters" | "in_transit" | "voting_done" | "pending") => {
    setSummaryCardModalType(type);
    setSummaryCardModalSearch("");
    
    // Collect all members from all volunteers based on type
    let allMembers: FamilyMemberWithVolunteer[] = [];
    
    const filteredData = votingStatusSummary.filter((row) => {
      if (!votingStatusSearch.trim()) return true;
      const searchLower = votingStatusSearch.toLowerCase();
      return (
        row.volunteer_name?.toLowerCase().includes(searchLower) ||
        row.volunteer_contact?.toLowerCase().includes(searchLower) ||
        row.assigned_colony?.toLowerCase().includes(searchLower)
      );
    });
    
    filteredData.forEach((row) => {
      const members = row._allMembers || [];
      let filteredMembers: FamilyMember[] = [];
      
      if (type === "total_voters") {
        filteredMembers = members;
      } else if (type === "in_transit") {
        filteredMembers = members.filter((m: FamilyMember) => m.voting_status === "In Transit");
      } else if (type === "voting_done") {
        filteredMembers = members.filter((m: FamilyMember) => m.voting_status === "Completed" || m.voting_status === "Direct");
      } else if (type === "pending") {
        filteredMembers = members.filter((m: FamilyMember) => !m.voting_status || m.voting_status === "" || m.voting_status === "Pending");
      }
      
      // Add volunteer information to each member
      const membersWithVolunteer = filteredMembers.map((m: FamilyMember) => ({
        ...m,
        volunteer_name: row.volunteer_name,
        volunteer_contact: row.volunteer_contact,
      }));
      
      allMembers = [...allMembers, ...membersWithVolunteer];
    });
    
    // Remove duplicates based on id, keeping the first occurrence
    const uniqueMembers = Array.from(
      new Map(allMembers.map(m => [m.id, m])).values()
    );
    
    setSummaryCardModalData(uniqueMembers);
    setIsSummaryCardModalOpen(true);
  };

  // Tab D - Open status list modal
  const openStatusListModal = (type: "in_transit" | "voting_done" | "pending", volunteerId: number, volunteerName: string) => {
    const summaryRow = votingStatusSummary.find(row => row.volunteer_id === volunteerId);
    if (!summaryRow) return;

    const allMembers = summaryRow._allMembers || [];
    let filteredMembers: FamilyMember[] = [];

    if (type === "in_transit") {
      // In Transit: voting_status = "In Transit"
      filteredMembers = allMembers.filter((m: FamilyMember) => m.voting_status === "In Transit");
    } else if (type === "voting_done") {
      // Voting Done: voting_status = "Completed" OR "Direct" (both considered as voting done)
      filteredMembers = allMembers.filter((m: FamilyMember) => m.voting_status === "Completed" || m.voting_status === "Direct");
    } else if (type === "pending") {
      // Pending: voting_status = "Pending" or NULL or empty
      filteredMembers = allMembers.filter((m: FamilyMember) => !m.voting_status || m.voting_status === "" || m.voting_status === "Pending");
    }

    setStatusListData(filteredMembers);
    setStatusListVolunteerName(volunteerName);
    setStatusListModalType(type);
    setIsStatusListModalOpen(true);
  };

  // Tab D - Export summary card modal to Excel
  const exportSummaryCardModalToExcel = () => {
    if (summaryCardModalData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const filteredData = summaryCardModalData.filter((member) => {
      if (!summaryCardModalSearch.trim()) return true;
      const searchLower = summaryCardModalSearch.toLowerCase();
      return (
        member.Voter_Id?.toLowerCase().includes(searchLower) ||
        member.full_name?.toLowerCase().includes(searchLower) ||
        member.ENG_Full_name?.toLowerCase().includes(searchLower) ||
        member.updated_mobile_no?.toLowerCase().includes(searchLower) ||
        member.colony_name?.toLowerCase().includes(searchLower) ||
        member.volunteer_name?.toLowerCase().includes(searchLower) ||
        member.volunteer_contact?.toLowerCase().includes(searchLower)
      );
    });

    try {
      const typeLabel = summaryCardModalType === "total_voters" ? "Total Voters" 
        : summaryCardModalType === "in_transit" ? "In Transit" 
        : summaryCardModalType === "voting_done" ? "Voting Done" 
        : "Pending";
      
      const exportData = filteredData.map((member, idx) => ({
        'Sr No': idx + 1,
        'Voter ID': member.Voter_Id || 'N/A',
        'Name': member.full_name || 'N/A',
        'English Name': member.ENG_Full_name || 'N/A',
        'Age': member.Age || 'N/A',
        'Gender': member.Gender || 'N/A',
        'Contact No': member.updated_mobile_no || 'N/A',
        'Colony': member.colony_name || 'N/A',
        'Volunteer Name': member.volunteer_name || 'N/A',
        'Volunteer Contact': member.volunteer_contact || 'N/A',
        'Voting Status': member.voting_status || 'N/A',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 8 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, typeLabel);
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `${typeLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);
      toast.success('Excel file downloaded successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  // Tab D - Export summary card modal to PDF
  const exportSummaryCardModalToPDF = () => {
    if (summaryCardModalData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const filteredData = summaryCardModalData.filter((member: FamilyMemberWithVolunteer) => {
      if (!summaryCardModalSearch.trim()) return true;
      const searchLower = summaryCardModalSearch.toLowerCase();
      return (
        member.Voter_Id?.toLowerCase().includes(searchLower) ||
        member.full_name?.toLowerCase().includes(searchLower) ||
        member.ENG_Full_name?.toLowerCase().includes(searchLower) ||
        member.updated_mobile_no?.toLowerCase().includes(searchLower) ||
        member.colony_name?.toLowerCase().includes(searchLower)
      );
    });

    try {
      const typeLabel = summaryCardModalType === "total_voters" ? "Total Voters" 
        : summaryCardModalType === "in_transit" ? "In Transit" 
        : summaryCardModalType === "voting_done" ? "Voting Done" 
        : "Pending";
      
      const tableRows = filteredData.map((member, index) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px; text-align: center;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.Voter_Id || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.full_name || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.ENG_Full_name || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.Age || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.Gender || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.updated_mobile_no || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.colony_name || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.volunteer_name || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.volunteer_contact || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.voting_status || "-"}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <html>
          <head>
            <title>${typeLabel}</title>
            <style>
              @page { size: A4 landscape; margin: 10mm; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
              h1 { text-align: center; margin-bottom: 5px; font-size: 18px; font-weight: bold; }
              h2 { text-align: center; margin-bottom: 15px; font-size: 14px; color: #666; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #000; font-size: 11px; text-align: left; }
              td { padding: 8px; border: 1px solid #000; font-size: 11px; }
            </style>
          </head>
          <body>
            <h1>${typeLabel} Report</h1>
            <h2>Total Records: ${filteredData.length} | Generated on: ${new Date().toLocaleString()}</h2>
            <table>
              <thead>
                <tr>
                  <th style="text-align: center;">Sr No</th>
                  <th>Voter ID</th>
                  <th>Name</th>
                  <th>English Name</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Contact No</th>
                  <th>Colony</th>
                  <th>Voting Status</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
        toast.success('PDF print dialog opened!');
      } else {
        toast.error('Please allow popups to download PDF');
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Failed to export PDF file');
    }
  };

  // Tab D - Export status list to Excel
  const exportStatusListToExcel = () => {
    if (statusListData.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const statusLabel = statusListModalType === "in_transit" ? "In Transit" : statusListModalType === "voting_done" ? "Voting Done" : "Pending";
      const exportData = statusListData.map((member, idx) => ({
        'Sr No': idx + 1,
        'Voter ID': member.Voter_Id || 'N/A',
        'Name': member.full_name || 'N/A',
        'English Name': member.ENG_Full_name || 'N/A',
        'Age': member.Age || 'N/A',
        'Gender': member.Gender || 'N/A',
        'Contact No': member.updated_mobile_no || 'N/A',
        'Colony': member.colony_name || 'N/A',
        'Voting Status': member.voting_status || 'N/A',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 8 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, statusLabel);
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `${statusListVolunteerName}_${statusLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);
      toast.success('Excel file downloaded successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  // Tab D - Export status list to PDF
  const exportVolunteerDataToExcel = (volunteerRow: VotingStatusSummaryRow) => {
    if (!volunteerRow._allMembers || volunteerRow._allMembers.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const exportData = volunteerRow._allMembers.map((member: FamilyMember, idx: number) => ({
        'Sr No': idx + 1,
        'Voter ID': member.Voter_Id || 'N/A',
        'Name': member.full_name || 'N/A',
        'English Name': member.ENG_Full_name || 'N/A',
        'Age': member.Age || 'N/A',
        'Gender': member.Gender || 'N/A',
        'Contact No': member.updated_mobile_no || 'N/A',
        'Colony': member.colony_name || 'N/A',
        'Voting Status': member.voting_status || 'N/A',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 8 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, volunteerRow.volunteer_name);
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `${volunteerRow.volunteer_name}_Voting_Status_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);
      toast.success('Excel file downloaded successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  const exportVolunteerDataToPDF = (volunteerRow: VotingStatusSummaryRow) => {
    if (!volunteerRow._allMembers || volunteerRow._allMembers.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const tableRows = volunteerRow._allMembers.map((member: FamilyMember, index: number) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px; text-align: center;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.Voter_Id || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.full_name || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.ENG_Full_name || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.Age || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.Gender || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.updated_mobile_no || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.colony_name || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.voting_status || "-"}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <html>
          <head>
            <title>Voting Status - ${volunteerRow.volunteer_name}</title>
            <style>
              @page { size: A4 landscape; margin: 10mm; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
              h1 { text-align: center; margin-bottom: 5px; font-size: 18px; font-weight: bold; }
              h2 { text-align: center; margin-bottom: 15px; font-size: 14px; color: #666; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #000; font-size: 11px; text-align: left; }
              td { padding: 8px; border: 1px solid #000; font-size: 11px; }
            </style>
          </head>
          <body>
            <h1>Voting Status Report</h1>
            <h2>Volunteer: ${volunteerRow.volunteer_name} | Colony: ${volunteerRow.assigned_colony || "N/A"} | Total Voters: ${volunteerRow.total_voters}</h2>
            <table>
              <thead>
                <tr>
                  <th style="text-align: center;">Sr No</th>
                  <th>Voter ID</th>
                  <th>Name</th>
                  <th>English Name</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Contact No</th>
                  <th>Colony</th>
                  <th>Voting Status</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Failed to export PDF file');
    }
  };

  // Tab D - Export all voting status summary to Excel
  const exportAllVotingStatusToExcel = () => {
    if (votingStatusSummary.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const exportData = votingStatusSummary.map((row, idx) => ({
        'Sr No': idx + 1,
        'Volunteer Name': row.volunteer_name || 'N/A',
        'Volunteer Contact': row.volunteer_contact || 'N/A',
        'Assigned Colony': row.assigned_colony || 'N/A',
        'Number of all Voters': row.total_voters || 0,
        'In-Transit (count)': row.in_transit_count || 0,
        'Voting Done (count)': row.voting_done_count || 0,
        'Pending (count)': row.pending_count || 0,
        'Percentage Voters': `${row.percentage}%`,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Voting Status Summary');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `Voting_Status_Summary_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);
      toast.success('Excel file downloaded successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  // Tab D - Export all voting status summary to PDF
  const exportAllVotingStatusToPDF = () => {
    if (votingStatusSummary.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const tableRows = votingStatusSummary.map((row, index) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px; text-align: center;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${row.volunteer_name || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${row.volunteer_contact || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${row.assigned_colony || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px; text-align: center;">${row.total_voters || 0}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px; text-align: center;">${row.in_transit_count || 0}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px; text-align: center;">${row.voting_done_count || 0}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px; text-align: center;">${row.pending_count || 0}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px; text-align: center;">${row.percentage}%</td>
        </tr>
      `).join('');

      const htmlContent = `
        <html>
          <head>
            <title>Voting Status Summary</title>
            <style>
              @page { size: A4 landscape; margin: 10mm; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
              h1 { text-align: center; margin-bottom: 5px; font-size: 18px; font-weight: bold; }
              h2 { text-align: center; margin-bottom: 15px; font-size: 14px; color: #666; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #000; font-size: 11px; text-align: left; }
              td { padding: 8px; border: 1px solid #000; font-size: 11px; }
            </style>
          </head>
          <body>
            <h1>Voting Status Summary Report</h1>
            <h2>Generated on: ${new Date().toLocaleString()} | Total Volunteers: ${votingStatusSummary.length}</h2>
            <table>
              <thead>
                <tr>
                  <th style="text-align: center;">Sr</th>
                  <th>Volunteer Name</th>
                  <th>Volunteer Contact</th>
                  <th>Assigned Colony</th>
                  <th style="text-align: center;">Number of all Voters</th>
                  <th style="text-align: center;">In-Transit (count)</th>
                  <th style="text-align: center;">Voting Done (count)</th>
                  <th style="text-align: center;">Pending (count)</th>
                  <th style="text-align: center;">Percentage Voters</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
      toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Failed to export PDF file');
    }
  };

  const exportStatusListToPDF = () => {
    if (statusListData.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const statusLabel = statusListModalType === "in_transit" ? "In Transit" : statusListModalType === "voting_done" ? "Voting Done" : "Pending";
      const tableRows = statusListData.map((member, index) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px; text-align: center;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.Voter_Id || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.full_name || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.ENG_Full_name || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.Age || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.Gender || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.updated_mobile_no || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.colony_name || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${member.voting_status || "-"}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <html>
          <head>
            <title>${statusLabel} - ${statusListVolunteerName}</title>
            <style>
              @page { size: A4 landscape; margin: 10mm; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
              h1 { text-align: center; margin-bottom: 5px; font-size: 18px; font-weight: bold; }
              h2 { text-align: center; margin-bottom: 15px; font-size: 14px; color: #666; }
              .info { text-align: center; margin-bottom: 15px; font-size: 12px; color: #666; }
              table { width: 100%; border-collapse: collapse; margin: 0 auto; font-size: 10px; }
              th { background-color: #4a5568; color: white; padding: 8px; border: 1px solid #000; font-weight: bold; text-align: center; }
              td { padding: 6px; border: 1px solid #000; }
            </style>
          </head>
          <body>
            <h1>${statusLabel} List</h1>
            <h2>Volunteer: ${statusListVolunteerName}</h2>
            <div class="info">
              <p>Generated on: ${new Date().toLocaleString()}</p>
              <p>Total Records: ${statusListData.length}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Voter ID</th>
                  <th>Name</th>
                  <th>English Name</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Contact No</th>
                  <th>Colony</th>
                  <th>Voting Status</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
        toast.success('PDF print dialog opened!');
      } else {
        toast.error('Please allow popups to download PDF');
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Failed to export PDF file');
    }
  };

  // Tab D - Filter colonies based on selected volunteer
  // const filteredVotingColonies = useMemo(() => { // Unused
  //   if (!selectedVotingVolunteerId) {
  //     return colonies;
  //   }
  //
  //   const selectedVolunteer = votingAvailableVolunteers.find(v => v.user_id === selectedVotingVolunteerId);
  //   if (!selectedVolunteer) {
  //     return colonies;
  //   }
  //
  //   // Use colony_ids array if available, otherwise parse colony_id string
  //   let volunteerColonyIds: number[] = [];
  //   if (selectedVolunteer.colony_ids && selectedVolunteer.colony_ids.length > 0) {
  //     volunteerColonyIds = selectedVolunteer.colony_ids;
  //   } else if (selectedVolunteer.colony_id) {
  //     volunteerColonyIds = selectedVolunteer.colony_id
  //       .split(',')
  //       .map(id => Number(id.trim()))
  //       .filter(id => !isNaN(id) && id > 0);
    //   }
    //
    //   if (volunteerColonyIds.length === 0) {
    //     return colonies;
    //   }
    //
    //   return colonies.filter(c => volunteerColonyIds.includes(c.colony_id));
    // }, [colonies, selectedVotingVolunteerId, votingAvailableVolunteers]);

  // Tab D - Load primary persons when colony is selected
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loadVotingPrimaryPersons = async (colonyId: number | null) => {
    if (!colonyId || colonyId === -1) {
      // Load from all colonies if "All" is selected
      if (colonyId === -1) {
        setLoadingVotingPrimaryPersons(true);
        try {
          const params = new URLSearchParams();
          // Don't set colony_id when "All" is selected
          if (selectedVotingVolunteerId) {
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
      } else {
        setVotingPrimaryPersons([]);
        setSelectedVotingPrimaryPersonIds([]);
        setVotingMembers([]);
        setMemberVotingStatus({});
      }
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
  // const handleVotingColonyChange = (colonyId: number) => { // Unused
  //   setSelectedVotingColonyId(colonyId);
  //   setSelectedVotingPrimaryPersonIds([]);
  //   setVotingMembers([]);
  //   setMemberVotingStatus({});
  //   loadVotingPrimaryPersons(colonyId);
  // };

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
  // const handleVotingStatusChange = (memberId: number, checked: boolean) => { // Unused
  //   // Check if user is trying to uncheck a voting status that was originally "Completed" in database
  //   const originalValue = originalVotingStatus[memberId];
  //   const member = votingMembers.find(m => m.id === memberId);
  //   const memberName = member?.full_name || member?.Voter_Id || "Member";
  //   
  //   // If unchecking and it was originally "Completed" in database, show confirmation
  //   // Check both originalVotingStatus and current member's voting_status from database
  //   const wasCompleted = originalValue === true || (originalValue === undefined && member?.voting_status === "Completed");
  //   
  //   if (!checked && wasCompleted) {
  //     setPendingVotingUncheck({
  //       memberId,
  //       memberName,
  //     });
  //     setShowVotingUncheckConfirmation(true);
  //     return;
  //   }
  //   
  //   // Otherwise, proceed with the change
  //   setMemberVotingStatus(prev => ({
  //     ...prev,
  //     [memberId]: checked,
  //   }));
  // };

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
  // const handleSubmitVotingData = async () => { // Unused
  //   if (votingMembers.length === 0) {
  //     toast.error("कृपया सदस्य निवडा.");
  //     return;
  //   }
  //
  //   try {
  //     setSubmittingVotingData(true);
  //     
  //     // Update each member's voting status
  //     const updatePromises = votingMembers.map(async (member) => {
  //       const isCompleted = memberVotingStatus[member.id] || false;
  //       const votingStatus = isCompleted ? "Completed" : "In Transit";
  //
  //       const res = await fetch(`/api/voterdetailsdata/Voterdetailslist/${member.id}`, {
  //         method: "PUT",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({
  //           Updated_colony: member.Updated_colony,
  //           updated_house_number: null,
  //           updated_mobile_no: member.updated_mobile_no,
  //           volunteer_name: null,
  //           volunteer_mobile: null,
  //           volunteer_status: null,
  //           assigned_colony_name: null,
  //           inst_1_paid: member.inst_1_paid ?? 0,
  //           inst_2_paid: member.inst_2_paid ?? 0,
  //           inst_3_paid: member.inst_3_paid ?? 0,
  //           voting_paid: member.voting_paid ?? 0,
  //           voting_in_transit: isCompleted ? 0 : 1,
  //           voting_status: votingStatus,
  //         }),
  //       });
  //
  //       if (!res.ok) {
  //         const json = await res.json();
  //         throw new Error(json?.error || `Failed to update member ${member.full_name}`);
  //       }
  //     });
  //
  //     await Promise.all(updatePromises);
  //     toast.success("Voting status सेव्ह झाला.");
  //     
  //     // Reload members to reflect updated data
  //     const memberPromises = selectedVotingPrimaryPersonIds.map(async (primaryPersonVoterId) => {
  //       const res = await fetch(`/api/voterstatus/familymembers?primary_person_id=${encodeURIComponent(primaryPersonVoterId)}`, {
  //         cache: "no-store",
  //       });
  //       if (!res.ok) throw new Error(`Failed to reload members for ${primaryPersonVoterId}`);
  //       return res.json();
  //     });
  //
  //     const memberArrays = await Promise.all(memberPromises);
  //     const allMembers = memberArrays.flat() as FamilyMember[];
  //     const uniqueMembers = Array.from(
  //       new Map(allMembers.map(m => [m.id, m])).values()
  //     );
  //     setVotingMembers(uniqueMembers);
  //
  //     // Update voting status state with fresh data from database
  //     const updatedStatus: Record<number, boolean> = {};
  //     const updatedOriginal: Record<number, boolean> = {};
  //     
  //     uniqueMembers.forEach(member => {
  //       const dbValue = member.voting_status === "Completed";
  //       updatedStatus[member.id] = dbValue;
  //       // Update original values to reflect new saved state
  //       updatedOriginal[member.id] = dbValue;
  //     });
  //     
  //     setMemberVotingStatus(updatedStatus);
  //     setOriginalVotingStatus(prev => ({ ...prev, ...updatedOriginal }));
  //   } catch (e) {
  //     console.error(e);
  //     toast.error(e instanceof Error ? e.message : "Voting status सेव्ह होत नाही.");
  //   } finally {
  //     setSubmittingVotingData(false);
  //   }
  // };

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
      
      // Clear all filters after successful submit
      setFinancialVolunteerSearchTerm("");
      setSelectedFinancialVolunteerId(null);
      setIsFinancialVolunteerDropdownOpen(false);
      setSelectedFinancialColonyId(null);
      setFinancialPrimaryPersons([]);
      setSelectedFinancialPrimaryPersonIds([]);
      setFinancialPrimaryPersonSearchTerm("");
      setIsFinancialPrimaryPersonDropdownOpen(false);
      setFinancialMembers([]);
      setMemberInstallments({});
      setOriginalInstallments({});
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
    // Don't clear selectedPrimaryPersonIds here - let loadPrimaryPersons handle auto-selection
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
          category_id: volunteerFormData.category_id || null,
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
        category_id: null,
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    // Primary Person selection is now optional - can submit without selecting any

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
        
        // Reload colony counts to reflect updated assignments after submit
        await loadColonyCounts();
      }
    } catch (e) {
      console.error(e);
      toast.error("Assign होत नाही. कृपया पुन्हा प्रयत्न करा.");
    } finally {
      setAssigning(false);
    }
  };

  // Load total voters (primary persons + family members) for modal
  const loadTotalVotersForModal = async (volunteerId: number, volunteerName: string) => {
    setLoadingModalTotalVoters(true);
    setSelectedVolunteerForTotalVotersModal(volunteerName);
    try {
      // First, get primary persons for this volunteer
      const primaryPersonsRes = await fetch(
        `/api/voterstatus/primarypersons?only_assigned=true&volunteer_id=${volunteerId}`,
        { cache: "no-store" }
      );
      if (!primaryPersonsRes.ok) throw new Error("Failed to fetch primary persons");
      const primaryPersons = await primaryPersonsRes.json();
      
      if (primaryPersons.length === 0) {
        setModalTotalVoters([]);
        setIsTotalVotersModalOpen(true);
        return;
      }

      // Get all primary person Voter IDs
      const primaryPersonVoterIds = primaryPersons
        .map((pp: { Voter_Id?: string }) => pp.Voter_Id)
        .filter(Boolean);

      if (primaryPersonVoterIds.length === 0) {
        setModalTotalVoters([]);
        setIsTotalVotersModalOpen(true);
        return;
      }

      // Fetch all family members using batch API
      const batchIds = primaryPersonVoterIds.join(',');
      const membersRes = await fetch(
        `/api/voterstatus/familymembers?primary_person_ids=${encodeURIComponent(batchIds)}`,
        { cache: "no-store" }
      );
      
      if (!membersRes.ok) throw new Error("Failed to fetch family members");
      const allMembers = await membersRes.json() as FamilyMember[];

      // Remove duplicates based on id
      const uniqueMembers = Array.from(
        new Map(allMembers.map(m => [m.id, m])).values()
      );

      setModalTotalVoters(uniqueMembers);
      setIsTotalVotersModalOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Total voters data load होत नाही.");
      setModalTotalVoters([]);
    } finally {
      setLoadingModalTotalVoters(false);
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
      const primaryPersons = await res.json();
      
      // Fetch member_count for each primary person
      const primaryPersonsWithCount = await Promise.all(
        (primaryPersons || []).map(async (person: { Voter_Id: string; id: number; [key: string]: unknown }) => {
          try {
            const membersRes = await fetch(
              `/api/voterstatus/familymembers?primary_person_id=${encodeURIComponent(person.Voter_Id)}`,
              { cache: "no-store" }
            );
            if (membersRes.ok) {
              const members = await membersRes.json();
              return { ...person, member_count: members?.length || 0 };
            }
            return { ...person, member_count: 0 };
          } catch {
            return { ...person, member_count: 0 };
          }
        })
      );
      
      setModalPrimaryPersons(primaryPersonsWithCount);
      setIsPrimaryPersonModalOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Primary person data load होत नाही.");
    } finally {
      setLoadingModalPrimaryPersons(false);
    }
  };

  // Export Primary Persons to Excel
  const exportPrimaryPersonsToExcel = () => {
    if (modalPrimaryPersons.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const exportData = modalPrimaryPersons.map((person, idx) => {
        const houseNumber = person.updated_house_number || person.House_Number || "N/A";
        return {
          'Sr No': idx + 1,
          'Name': person.full_name || 'N/A',
          'English Name': person.ENG_Full_name || 'N/A',
          'Voter ID': person.Voter_Id || 'N/A',
          'House No': houseNumber,
          'Mobile': person.updated_mobile_no || 'N/A',
          'Colony': person.colony_name || 'N/A',
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 8 },   // Sr No
        { wch: 25 },  // Name
        { wch: 25 },  // English Name
        { wch: 15 },  // Voter ID
        { wch: 15 },  // House No
        { wch: 12 },  // Mobile
        { wch: 20 }   // Colony
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Primary Persons');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `${selectedVolunteerForModal}_Primary_Persons_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);
      toast.success('Excel file downloaded successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  // Export Primary Persons to PDF
  const exportPrimaryPersonsToPDF = () => {
    if (modalPrimaryPersons.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const tableRows = modalPrimaryPersons.map((person, index) => {
        const houseNumber = person.updated_house_number || person.House_Number || "N/A";
        return `
          <tr>
            <td style="padding: 8px; border: 1px solid #000; font-size: 11px; text-align: center;">${index + 1}</td>
            <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${person.full_name || "-"}</td>
            <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${person.ENG_Full_name || "-"}</td>
            <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${person.Voter_Id || "-"}</td>
            <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${houseNumber}</td>
            <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${person.updated_mobile_no || "-"}</td>
            <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${person.colony_name || "-"}</td>
          </tr>
        `;
      }).join('');

      const htmlContent = `
        <html>
          <head>
            <title>Primary Persons - ${selectedVolunteerForModal}</title>
            <style>
              @page { size: A4 landscape; margin: 10mm; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
              h1 { text-align: center; margin-bottom: 5px; font-size: 18px; font-weight: bold; }
              h2 { text-align: center; margin-bottom: 15px; font-size: 14px; color: #666; }
              .info { text-align: center; margin-bottom: 15px; font-size: 12px; color: #666; }
              table { width: 100%; border-collapse: collapse; margin: 0 auto; font-size: 10px; }
              th { background-color: #4a5568; color: white; padding: 8px; border: 1px solid #000; font-weight: bold; text-align: center; }
              td { padding: 6px; border: 1px solid #000; }
            </style>
          </head>
          <body>
            <h1>Primary Persons List</h1>
            <h2>Volunteer Name: ${selectedVolunteerForModal}</h2>
            <div class="info">
              <p>Generated on: ${new Date().toLocaleString()}</p>
              <p>Total Records: ${modalPrimaryPersons.length}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Name</th>
                  <th>English Name</th>
                  <th>Voter ID</th>
                  <th>House No</th>
                  <th>Mobile</th>
                  <th>Colony</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
        toast.success('PDF print dialog opened!');
      } else {
        toast.error('Please allow popups to download PDF');
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Failed to export PDF file');
    }
  };

  // Export Total Voters to Excel
  const exportTotalVotersToExcel = () => {
    if (modalTotalVoters.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const exportData = modalTotalVoters.map((voter, idx) => ({
        'Sr No': idx + 1,
        'Voter ID': voter.Voter_Id || 'N/A',
        'Name': voter.full_name || 'N/A',
        'English Name': voter.ENG_Full_name || 'N/A',
        'Age': voter.Age || 'N/A',
        'Gender': voter.Gender || 'N/A',
        'Family Member': voter.family_member || 'N/A',
        'Mobile': voter.updated_mobile_no || 'N/A',
        'Voting Status': voter.voting_status || 'N/A',
        'Colony': voter.colony_name || 'N/A',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 8 },   // Sr No
        { wch: 15 },  // Voter ID
        { wch: 25 },  // Name
        { wch: 25 },  // English Name
        { wch: 8 },   // Age
        { wch: 10 },   // Gender
        { wch: 15 },  // Family Member
        { wch: 12 },  // Mobile
        { wch: 15 },  // Voting Status
        { wch: 20 }   // Colony
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Total Voters');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `${selectedVolunteerForTotalVotersModal}_Total_Voters_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);
      toast.success('Excel file downloaded successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  // Export Total Voters to PDF
  const exportTotalVotersToPDF = () => {
    if (modalTotalVoters.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const tableRows = modalTotalVoters.map((voter, index) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px; text-align: center;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${voter.Voter_Id || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${voter.full_name || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${voter.ENG_Full_name || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px; text-align: center;">${voter.Age || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px; text-align: center;">${voter.Gender || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${voter.family_member || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${voter.updated_mobile_no || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${voter.voting_status || "-"}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px;">${voter.colony_name || "-"}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <html>
          <head>
            <title>Total Voters - ${selectedVolunteerForTotalVotersModal}</title>
            <style>
              @page { size: A4 landscape; margin: 10mm; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
              h1 { text-align: center; margin-bottom: 5px; font-size: 18px; font-weight: bold; }
              h2 { text-align: center; margin-bottom: 15px; font-size: 14px; color: #666; }
              .info { text-align: center; margin-bottom: 15px; font-size: 12px; color: #666; }
              table { width: 100%; border-collapse: collapse; margin: 0 auto; font-size: 9px; }
              th { background-color: #4a5568; color: white; padding: 8px; border: 1px solid #000; font-weight: bold; text-align: center; }
              td { padding: 6px; border: 1px solid #000; }
            </style>
          </head>
          <body>
            <h1>Total Voters List</h1>
            <h2>Volunteer Name: ${selectedVolunteerForTotalVotersModal}</h2>
            <div class="info">
              <p>Generated on: ${new Date().toLocaleString()}</p>
              <p>Total Records: ${modalTotalVoters.length}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Voter ID</th>
                  <th>Name</th>
                  <th>English Name</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Family Member</th>
                  <th>Mobile</th>
                  <th>Voting Status</th>
                  <th>Colony</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Failed to export PDF file');
    }
  };

  // Handle edit volunteer
  const handleEditVolunteer = (row: AssignRow) => {
    setEditingVolunteerId(row.id);
    setVolunteerFormData({
      volunteer_name: row.volunteer_name || "",
      contact_no: row.contact_no || "",
      status: (row.status as "Active" | "Inactive") || "Active",
      category_id: row.category_id || null,
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
          category_id: volunteerFormData.category_id || null,
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
        category_id: null,
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

  // Handle status change for volunteer
  const handleStatusChange = async (userId: number, newStatus: "Active" | "Inactive") => {
    try {
      setUpdatingStatusId(userId);
      // Find the volunteer to get current data
      const volunteer = volunteerMasterRows.find(v => v.id === userId);
      if (!volunteer) {
        throw new Error("Volunteer not found");
      }

      const res = await fetch("/api/volunteermaster", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          volunteer_name: volunteer.volunteer_name,
          contact_no: volunteer.contact_no || null,
          status: newStatus,
          category_id: volunteer.category_id || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to update volunteer status");
      
      toast.success(`Volunteer status ${newStatus} झाला.`);
      
      // Reload volunteer master data
      await fetchVolunteerMasterData("");
      
      // Also reload Tab B data if on Tab B
      if (activeTab === "B") {
        await fetchAssignData("");
        await loadAvailableVolunteers();
      }
    } catch (e) {
      console.error(e);
      toast.error("Volunteer status अपडेट होत नाही.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

 

  // Handle reset password
  const handleResetPassword = async (userId: number, volunteerName: string, contactNo: string) => {
    if (!confirm(`Are you sure you want to reset password for volunteer "${volunteerName}"? Password will be set to contact number.`)) {
      return;
    }

    try {
      setResettingPasswordId(userId);
      // Find the volunteer to get current data
      const volunteer = volunteerMasterRows.find(v => v.id === userId);
      if (!volunteer) {
        throw new Error("Volunteer not found");
      }

      // Reset password to contact_no
      const newPassword = contactNo || "";

      const res = await fetch("/api/volunteermaster", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          volunteer_name: volunteer.volunteer_name,
          contact_no: volunteer.contact_no || null,
          status: volunteer.status,
          category_id: volunteer.category_id || null,
          password: newPassword, // Update password to contact_no
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to reset password");
      
      toast.success("Password reset झाला.");
      
      // Reload volunteer master data
      await fetchVolunteerMasterData("");
    } catch (e) {
      console.error(e);
      toast.error("Password reset होत नाही.");
    } finally {
      setResettingPasswordId(null);
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
      key: "category_name",
      label: "Category",
      accessor: "category_name",
      render: (row: AssignRow) => {
        // Find category name by matching category_id with categories array
        const category = row.category_id 
          ? categories.find(cat => cat.category_id  == row.category_id)
          : null;
        return (
          <span className="text-gray-700">
            {category?.name || "-"}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      accessor: "status",
      render: (row: AssignRow) => (
        <span
          className={`px-3 py-1 text-xs rounded font-medium ${
            row.status === "Active" 
              ? "bg-green-100 text-green-800" 
              : "bg-red-100 text-red-800"
          }`}
        >
          {row.status || "Active"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      accessor: "volunteer_name" as keyof AssignRow,
      render: (row: AssignRow) => {
        const isActive = row.status === "Active";
        const isUpdating = updatingStatusId === row.id;
        const isResetting = resettingPasswordId === row.id;
        return (
          <div className="flex flex-wrap gap-1 sm:gap-2 min-w-0">
            <button
              type="button"
              onClick={() => handleEditVolunteer(row)}
              className="px-2 py-1 sm:px-2.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 flex-shrink-0 flex items-center justify-center"
              title="Edit"
              aria-label="Edit"
            >
              <FaEdit className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange(row.id, isActive ? "Inactive" : "Active")}
              disabled={isUpdating}
              className={`px-2 py-1 sm:px-2.5 text-xs rounded text-white hover:opacity-90 disabled:opacity-60 flex-shrink-0 flex items-center justify-center ${
                isActive 
                  ? "bg-red-600 hover:bg-red-700" 
                  : "bg-green-600 hover:bg-green-700"
              }`}
              title={isUpdating 
                ? (isActive ? "Deactivating..." : "Activating...") 
                : (isActive ? "Deactivate" : "Activate")}
              aria-label={isActive ? "Deactivate" : "Activate"}
            >
              <FaPowerOff className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleResetPassword(row.id, row.volunteer_name, row.contact_no)}
              disabled={isResetting || !row.contact_no}
              className="px-2 py-1 sm:px-2.5 text-xs rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60 flex-shrink-0 flex items-center justify-center"
              title={isResetting ? "Resetting..." : "Reset Password"}
              aria-label="Reset Password"
            >
              <FaKey className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
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
      label: "Assigned primary members",
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
      key: "total_voters",
      label: "Total voters",
      accessor: "total_voters",
      render: (row: AssignRow) => (
        <button
          type="button"
          onClick={() => loadTotalVotersForModal(row.id, row.volunteer_name)}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          disabled={!row.total_voters || row.total_voters === 0}
        >
          {row.total_voters !== undefined ? row.total_voters : "-"}
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
  // const votingColumns: Column<VoterMasterRow>[] = useMemo( // Unused
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
  //       key: "Updated_colony",
  //       label: "Colony",
  //       accessor: "Updated_colony",
  //     },
  //     {
  //       key: "House_Number",
  //       label: "House No.",
  //       accessor: "House_Number",
  //     },
  //     {
  //       key: "voting_paid",
  //       label: "Paid",
  //       accessor: "voting_paid",
  //       render: row => (
  //         <select
  //           className="px-2 py-1 border rounded text-xs"
  //           value={row.voting_paid ?? 0}
  //           onChange={e => updateRow(row.id, { voting_paid: Number(e.target.value) })}
  //         >
  //           <option value={0}>No</option>
  //           <option value={1}>Yes</option>
  //         </select>
  //       ),
  //     },
  //     {
  //       key: "voting_status",
  //       label: "Voting Status",
  //       accessor: "voting_status",
  //       render: row => (
  //         <select
  //           className="px-2 py-1 border rounded text-xs"
  //           value={row.voting_status ?? "Pending"}
  //           onChange={e =>
  //             updateRow(row.id, {
  //               voting_status: e.target.value as VoterMasterRow["voting_status"],
  //             })
  //           }
  //         >
  //           <option value="Pending">Pending</option>
  //           <option value="In Transit">In Transit</option>
  //           <option value="Completed">Completed</option>
  //         </select>
  //       ),
  //     },
  //     {
  //       key: "actions",
  //       label: "Save",
  //       render: row => (
  //         <button
  //           type="button"
  //           className="px-3 py-1 text-xs rounded bg-blue-600 text-white disabled:opacity-60"
  //           onClick={() => handleSaveRow(row)}
  //           disabled={savingId === row.id}
  //         >
  //           {savingId === row.id ? "Saving..." : "Save"}
  //         </button>
  //       ),
  //     },
  //   ],
  //   [savingId, handleSaveRow],
  // );

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
                        ) : (() => {
                          const filteredVolunteers = availableVolunteers.filter(v => 
                            Number(v.category_id) === 5 &&
                            (!volunteerSearchTerm || 
                            v.volunteer_name.toLowerCase().includes(volunteerSearchTerm.toLowerCase()) ||
                            (v.contact_no && v.contact_no.includes(volunteerSearchTerm)))
                          );
                          return filteredVolunteers.length === 0 ? (
                            <div className="p-3 text-xs text-gray-500 text-center">No volunteers found</div>
                          ) : (
                            filteredVolunteers.map(volunteer => (
                              <div
                                key={volunteer.user_id}
                                onClick={() => {
                                  setSelectedVolunteerId(volunteer.user_id);
                                  setVolunteerSearchTerm("");
                                  setIsVolunteerDropdownOpen(false);
                                  setIsColonyDropdownOpen(false);
                                  setColonySearchTerm("");
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
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <Label>Select Colony *</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <div
                      className="w-full px-3 py-2 border rounded-md text-sm bg-white cursor-pointer flex items-center justify-between"
                      onClick={() => {
                        setIsColonyDropdownOpen(!isColonyDropdownOpen);
                        if (!selectedVolunteerId) {
                          toast.error("कृपया पहिले Volunteer निवडा.");
                          return;
                        }
                      }}
                    >
                      <span className={selectedColonyId ? "text-gray-900" : "text-gray-500"}>
                        {selectedColonyId
                          ? colonies.find(c => c.colony_id === selectedColonyId)?.colony_name || "Select Colony"
                          : "Click to select colony"}
                      </span>
                      <svg
                        className={`w-4 h-4 transition-transform ${isColonyDropdownOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {isColonyDropdownOpen && selectedVolunteerId && (() => {
                      const selectedVolunteer = availableVolunteers.find(v => v.user_id === selectedVolunteerId);
                      const assignedColonyIds = selectedVolunteer?.colony_ids || [];
                      const selectedVolunteerColonyCount = assignedColonyIds.length; // Count of colonies assigned to selected volunteer
                      
                      const filteredColonies = colonies.filter(c => {
                        if (!colonySearchTerm.trim()) return true;
                        const searchTerm = colonySearchTerm.toLowerCase();
                        return c.colony_name.toLowerCase().includes(searchTerm);
                      });
                      
                      return (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                          <div className="p-2 border-b">
                            <input
                              type="text"
                              className="w-full px-3 py-2 border rounded-md text-sm"
                              placeholder="Search colony..."
                              value={colonySearchTerm}
                              onChange={e => setColonySearchTerm(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                          {selectedVolunteerColonyCount > 0 && (
                            <div className="px-3 py-2 bg-blue-50 border-b text-xs text-blue-700 font-medium">
                              {selectedVolunteer?.volunteer_name} has {selectedVolunteerColonyCount} colon{selectedVolunteerColonyCount !== 1 ? 'ies' : 'y'} assigned
                            </div>
                          )}
                          <div className="max-h-60 overflow-y-auto">
                            {filteredColonies.length === 0 ? (
                              <div className="p-3 text-xs text-gray-500 text-center">No colonies found</div>
                            ) : (
                              filteredColonies.map(colony => {
                                const counts = colonyCounts[colony.colony_id];
                                const total = counts?.total || 0;
                                const pending = counts?.pending || 0;
                                const done = total - pending;
                                const isAssigned = assignedColonyIds.includes(colony.colony_id);
                                
                                return (
                                  <div
                                    key={colony.colony_id}
                                    onClick={() => {
                                      handleColonyChange(colony.colony_id, colony.colony_name);
                                      setIsColonyDropdownOpen(false);
                                      setColonySearchTerm("");
                                    }}
                                    className={`p-3 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 ${
                                      selectedColonyId === colony.colony_id ? "bg-blue-100" : ""
                                    } ${
                                      isAssigned ? "bg-green-50 hover:bg-green-100" : ""
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`font-medium ${isAssigned ? "text-green-700" : "text-gray-900"}`}>
                                          {colony.colony_name}
                                        </span>
                                        {isAssigned && (
                                          <span className="text-xs px-2 py-0.5 bg-green-200 text-green-800 rounded">
                                            Assigned
                                          </span>
                                        )}
                                      </div>
                                      {total > 0 && (
                                        <span className="text-xs text-gray-500">
                                          {done}/{total} ({pending})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
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
                                checked={(() => {
                                  // All filtered persons are now selectable
                                  const selectablePersons = filteredPersons;
                                  return selectablePersons.length > 0 && selectablePersons.every(p => {
                                    const pid = String(p.id);
                                    return selectedPrimaryPersonIds.includes(pid);
                                  });
                                })()}
                                onChange={e => {
                                  // All filtered persons are now selectable
                                  const selectableIds = filteredPersons.map(p => String(p.id));

                                  if (e.target.checked) {
                                    setSelectedPrimaryPersonIds(prev => [...new Set([...prev, ...selectableIds])]);
                                  } else {
                                    setSelectedPrimaryPersonIds(prev => prev.filter(id => !selectableIds.includes(id)));
                                  }
                                }}
                              />
                            </th>
                            <th className="px-3 py-2 text-left border-b font-medium text-gray-700">Sr</th>
                            <th className="px-3 py-2 text-left border-b font-medium text-gray-700">Name</th>
                            <th className="px-3 py-2 text-left border-b font-medium text-gray-700">English Name</th>
                            <th className="px-3 py-2 text-left border-b font-medium text-gray-700">FamilyMember Count</th>
                            <th className="px-3 py-2 text-left border-b font-medium text-gray-700">Contact No</th>
                            <th className="px-3 py-2 text-left border-b font-medium text-gray-700">Status</th>
                            <th className="px-3 py-2 text-left border-b font-medium text-gray-700">Voter ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPersons.map((person, index) => {
                            const personId = String(person.id);
                            const isChecked = selectedPrimaryPersonIds.includes(personId);
                            
                            // Check if this primary person is already assigned to another volunteer
                            const assignedVolunteerName = primaryPersonAssignments[personId];
                            const isAssignedToCurrentVolunteer = assignedVolunteerName === selectedVolunteerName;
                            const isAssignedToOtherVolunteer = !!(assignedVolunteerName && assignedVolunteerName !== selectedVolunteerName);
                            const memberCount = person.member_count || 0;
                            
                            return (
                              <tr
                                key={person.id}
                                className={`${
                                  isChecked
                                    ? "bg-blue-50 hover:bg-blue-100"
                                    : "hover:bg-gray-50"
                                } cursor-pointer`}
                                onClick={() => {
                                  if (isChecked) {
                                    setSelectedPrimaryPersonIds(prev => prev.filter(id => id !== personId));
                                  } else {
                                    setSelectedPrimaryPersonIds(prev => [...prev, personId]);
                                  }
                                }}
                              >
                                <td className="px-3 py-2 border-b" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4"
                                    checked={isChecked}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setSelectedPrimaryPersonIds(prev => [...prev, personId]);
                                      } else {
                                        setSelectedPrimaryPersonIds(prev => prev.filter(id => id !== personId));
                                      }
                                    }}
                                  />
                                </td>
                                <td className="px-3 py-2 border-b text-gray-600 font-medium">
                                  {index + 1}
                                </td>
                                <td className="px-3 py-2 border-b font-medium text-gray-900">
                                  {highlightText(person.full_name || "", searchTerm)}
                                </td>
                                <td className="px-3 py-2 border-b text-gray-500">
                                  {person.ENG_Full_name ? highlightText(person.ENG_Full_name, searchTerm) : "-"}
                                </td>
                                <td className="px-3 py-2 border-b" onClick={e => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (memberCount > 0) {
                                        loadFamilyMembers(person.Voter_Id, person.id, person.full_name || "");
                                      }
                                    }}
                                    className={`text-blue-600 hover:text-blue-800 font-medium underline ${
                                      memberCount === 0 ? "text-gray-400 cursor-not-allowed" : "cursor-pointer"
                                    }`}
                                    disabled={memberCount === 0}
                                  >
                                    {memberCount}
                                  </button>
                                </td>
                                <td className="px-3 py-2 border-b text-gray-400">
                                  {person.updated_mobile_no ? highlightText(person.updated_mobile_no, searchTerm) : "-"}
                                </td>
                                <td className="px-3 py-2 border-b">
                                  {assignedVolunteerName && (
                                    <span className={`${assignedVolunteerName === selectedVolunteerName ? 'text-green-600' : 'text-blue-600'} font-medium text-xs`}>
                                      Assigned: <span className="font-bold">{assignedVolunteerName}</span>
                                    </span>
                                  )}
                                  {!assignedVolunteerName && (
                                    <span className="text-green-600 font-medium text-xs">
                                      ✓ Current
                                    </span>
                                  )}
                                  {!isAssignedToOtherVolunteer && !isAssignedToCurrentVolunteer && (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 border-b text-gray-400">
                                  {highlightText(person.Voter_Id || "", searchTerm)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
                {selectedPrimaryPersonIds.length > 0 && (() => {
                  const totalVoters = primaryPersons
                    .filter(person => selectedPrimaryPersonIds.includes(String(person.id)))
                    .reduce((sum, person) => sum + (person.member_count || 0), 0);
                  return (
                    <div className="mt-2 text-xs text-green-600">
                      Selected: {selectedPrimaryPersonIds.length} primary person(s) - Total: {totalVoters} voter(s)
                    </div>
                  );
                })()}
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
                <div className="mb-4 flex gap-2 items-center">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border rounded-md text-sm"
                    placeholder="Search by Name, Voter ID, House No, Mobile, Colony..."
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={exportPrimaryPersonsToExcel}
                    disabled={modalPrimaryPersons.length === 0}
                    className="px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Excel
                  </button>
                  <button
                    type="button"
                    onClick={exportPrimaryPersonsToPDF}
                    disabled={modalPrimaryPersons.length === 0}
                    className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    PDF
                  </button>
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
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Family Members Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPersons.map((person, index) => {
                            const houseNumber = person.updated_house_number || person.House_Number || "N/A";
                            const memberCount = person.member_count || 0;
                            return (
                              <tr key={person.id} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                                <td className="px-4 py-3 font-medium text-gray-900">{person.full_name || "-"}</td>
                                <td className="px-4 py-3 text-gray-500">{person.ENG_Full_name || "-"}</td>
                                <td className={`px-4 py-3 ${getVoterIdColorClass(person.inst_1_paid, person.inst_2_paid, person.inst_3_paid)}`}>{person.Voter_Id || "-"}</td>
                                <td className="px-4 py-3 text-gray-600 font-medium">{houseNumber}</td>
                                <td className="px-4 py-3 text-gray-400">{person.updated_mobile_no || "-"}</td>
                                <td className="px-4 py-3 text-gray-500">{person.colony_name || "-"}</td>
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (memberCount > 0) {
                                        loadFamilyMembers(person.Voter_Id, person.id, person.full_name || "");
                                      }
                                    }}
                                    className={`text-blue-600 hover:text-blue-800 font-medium underline ${
                                      memberCount === 0 ? "text-gray-400 cursor-not-allowed" : "cursor-pointer"
                                    }`}
                                    disabled={memberCount === 0}
                                  >
                                    {memberCount}
                                  </button>
                                </td>
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

          {/* Total Voters Modal */}
          {isTotalVotersModalOpen && (
            <Modal
              isOpen={isTotalVotersModalOpen}
              onClose={() => {
                setIsTotalVotersModalOpen(false);
                setModalTotalVoters([]);
                setSelectedVolunteerForTotalVotersModal("");
                setTotalVotersModalSearchTerm("");
              }}
              className="max-w-6xl p-6"
            >
              <div>
                <h3 className="text-lg font-semibold mb-4">Total Voters - {selectedVolunteerForTotalVotersModal}</h3>
                
                {/* Search Filter */}
                <div className="mb-4 flex gap-2 items-center">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border rounded-md text-sm"
                    placeholder="Search by Name, Voter ID, Mobile, Colony, Voting Status..."
                    value={totalVotersModalSearchTerm}
                    onChange={(e) => setTotalVotersModalSearchTerm(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={exportTotalVotersToExcel}
                    disabled={modalTotalVoters.length === 0}
                    className="px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Excel
                  </button>
                  <button
                    type="button"
                    onClick={exportTotalVotersToPDF}
                    disabled={modalTotalVoters.length === 0}
                    className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    PDF
                  </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto">
                {loadingModalTotalVoters ? (
                  <div className="text-center py-8 text-gray-500">Loading total voters...</div>
                ) : (() => {
                  // Filter voters based on search term
                  const filteredVoters = modalTotalVoters.filter(voter => {
                    if (!totalVotersModalSearchTerm.trim()) return true;
                    const searchTerm = totalVotersModalSearchTerm.toLowerCase().trim();
                    const fullName = (voter.full_name || "").toLowerCase();
                    const engName = (voter.ENG_Full_name || "").toLowerCase();
                    const voterId = (voter.Voter_Id || "").toLowerCase();
                    const mobileNo = (voter.updated_mobile_no || "").toLowerCase();
                    const colonyName = (voter.colony_name || "").toLowerCase();
                    const votingStatus = (voter.voting_status || "").toLowerCase();
                    const familyMember = (voter.family_member || "").toLowerCase();
                    
                    return (
                      fullName.includes(searchTerm) ||
                      engName.includes(searchTerm) ||
                      voterId.includes(searchTerm) ||
                      mobileNo.includes(searchTerm) ||
                      colonyName.includes(searchTerm) ||
                      votingStatus.includes(searchTerm) ||
                      familyMember.includes(searchTerm)
                    );
                  });

                  if (filteredVoters.length === 0 && modalTotalVoters.length > 0) {
                    return <div className="text-center py-8 text-gray-500">No voters found matching your search.</div>;
                  }

                  if (filteredVoters.length === 0) {
                    return <div className="text-center py-8 text-gray-500">No voters assigned to this volunteer.</div>;
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-gray-100 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Sr No</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Voter ID</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">English Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Age</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Gender</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Family Member</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Mobile</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Voting Status</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Colony</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredVoters.map((voter, index) => (
                            <tr key={voter.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                              <td className={`px-4 py-3 ${getVoterIdColorClass(voter.inst_1_paid, voter.inst_2_paid, voter.inst_3_paid)}`}>{voter.Voter_Id || "-"}</td>
                              <td className="px-4 py-3 text-gray-900">{voter.full_name || "-"}</td>
                              <td className="px-4 py-3 text-gray-600">{voter.ENG_Full_name || "-"}</td>
                              <td className="px-4 py-3 text-gray-600 text-center">{voter.Age || "-"}</td>
                              <td className="px-4 py-3 text-gray-600 text-center">{voter.Gender || "-"}</td>
                              <td className="px-4 py-3 text-gray-600">{voter.family_member || "-"}</td>
                              <td className="px-4 py-3 text-gray-600">{voter.updated_mobile_no || "-"}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  voter.voting_status === "Completed" || voter.voting_status === "Direct"
                                    ? "bg-green-100 text-green-800"
                                    : voter.voting_status === "In Transit"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}>
                                  {voter.voting_status || "Pending"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{voter.colony_name || "-"}</td>
                            </tr>
                          ))}
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
                      setIsTotalVotersModalOpen(false);
                      setModalTotalVoters([]);
                      setSelectedVolunteerForTotalVotersModal("");
                      setTotalVotersModalSearchTerm("");
                    }}
                    className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* Family Members Modal */}
          {isFamilyMembersModalOpen && (
            <Modal
              isOpen={isFamilyMembersModalOpen}
              onClose={() => {
                setIsFamilyMembersModalOpen(false);
                setFamilyMembers([]);
                setSelectedPrimaryPersonForFamilyModal(null);
              }}
              className="max-w-6xl p-6"
            >
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Family Members - {selectedPrimaryPersonForFamilyModal?.full_name} ({selectedPrimaryPersonForFamilyModal?.Voter_Id})
                </h3>
                
                <div className="max-h-[70vh] overflow-y-auto">
                  {loadingFamilyMembers ? (
                    <div className="text-center py-8 text-gray-500">Loading family members...</div>
                  ) : familyMembers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No family members found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-gray-100 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Sr No</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">English Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Voter ID</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Age</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Gender</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Contact No</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Colony</th>
                          </tr>
                        </thead>
                        <tbody>
                          {familyMembers.map((member, index) => (
                            <tr key={member.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                              <td className="px-4 py-3 font-medium text-gray-900">{member.full_name || "-"}</td>
                              <td className="px-4 py-3 text-gray-500">{member.ENG_Full_name || "-"}</td>
                              <td className={`px-4 py-3 ${getVoterIdColorClass(member.inst_1_paid, member.inst_2_paid, member.inst_3_paid)}`}>{member.Voter_Id || "-"}</td>
                              <td className="px-4 py-3 text-gray-600">{member.Age || "-"}</td>
                              <td className="px-4 py-3 text-gray-600">{member.Gender || "-"}</td>
                              <td className="px-4 py-3 text-gray-400">{member.updated_mobile_no || "-"}</td>
                              <td className="px-4 py-3 text-gray-500">{member.colony_name || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFamilyMembersModalOpen(false);
                      setFamilyMembers([]);
                      setSelectedPrimaryPersonForFamilyModal(null);
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
                                      const newVolunteerId = volunteer.user_id;
                                      setSelectedFinancialVolunteerId(newVolunteerId);
                                      setFinancialVolunteerSearchTerm("");
                                      setIsFinancialVolunteerDropdownOpen(false);
                                      // If colony is already selected, reload primary persons with new volunteer filter
                                      if (selectedFinancialColonyId) {
                                        loadFinancialPrimaryPersons(selectedFinancialColonyId, newVolunteerId);
                                        setSelectedFinancialPrimaryPersonIds([]);
                                        setFinancialMembers([]);
                                        setMemberInstallments({});
                                      }
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
                  {selectedFinancialColonyId && selectedFinancialVolunteerId && (
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
                            ) : financialPrimaryPersons.length === 0 ? (
                              <div className="p-3 text-xs text-gray-500 text-center">
                                No primary persons found for this volunteer and colony
                              </div>
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
                                return <div className="p-3 text-xs text-gray-500 text-center">No primary persons match your search</div>;
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
                              <td className={`px-4 py-3 ${getVoterIdColorClass(member.inst_1_paid, member.inst_2_paid, member.inst_3_paid)}`}>{member.Voter_Id || "-"}</td>
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
              {/* Tab D - Voting Status Summary Table */}
              <div className="border rounded-md p-4 bg-white">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                  <h3 className="font-semibold text-lg">Voting Status Summary</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Search by volunteer name, contact, or colony..."
                      value={votingStatusSearch}
                      onChange={(e) => setVotingStatusSearch(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={exportAllVotingStatusToExcel}
                      disabled={votingStatusSummary.length === 0}
                      className="px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      title="Export to Excel"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel
                    </button>
                    <button
                      type="button"
                      onClick={exportAllVotingStatusToPDF}
                      disabled={votingStatusSummary.length === 0}
                      className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      title="Export to PDF"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={loadVotingStatusSummary}
                      disabled={loadingVotingStatusSummary}
                      className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {loadingVotingStatusSummary ? "Loading..." : "Refresh"}
                    </button>
                  </div>
                </div>
                
                {loadingVotingStatusSummary ? (
                  <div className="text-center py-8 text-gray-500">Loading voting status summary...</div>
                ) : votingStatusSummary.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No data available</div>
                ) : (() => {
                  // Calculate totals from filtered data
                  const filteredData = votingStatusSummary.filter((row) => {
                    if (!votingStatusSearch.trim()) return true;
                    const searchLower = votingStatusSearch.toLowerCase();
                    return (
                      row.volunteer_name?.toLowerCase().includes(searchLower) ||
                      row.volunteer_contact?.toLowerCase().includes(searchLower) ||
                      row.assigned_colony?.toLowerCase().includes(searchLower)
                    );
                  });

                  // Calculate totals using same logic as modal (with duplicate removal)
                  const getUniqueCount = (type: "total_voters" | "in_transit" | "voting_done" | "pending") => {
                    let allMembers: FamilyMember[] = [];
                    filteredData.forEach((row) => {
                      const members = row._allMembers || [];
                      let filteredMembers: FamilyMember[] = [];
                      if (type === "total_voters") {
                        filteredMembers = members;
                      } else if (type === "in_transit") {
                        filteredMembers = members.filter((m: FamilyMember) => m.voting_status === "In Transit");
                      } else if (type === "voting_done") {
                        filteredMembers = members.filter((m: FamilyMember) => m.voting_status === "Completed" || m.voting_status === "Direct");
                      } else if (type === "pending") {
                        filteredMembers = members.filter((m: FamilyMember) => !m.voting_status || m.voting_status === "" || m.voting_status === "Pending");
                      }
                      allMembers = [...allMembers, ...filteredMembers];
                    });
                    // Remove duplicates based on id
                    const uniqueMembers = Array.from(new Map(allMembers.map(m => [m.id, m])).values());
                    return uniqueMembers.length;
                  };

                  const totals = {
                    totalVoters: getUniqueCount("total_voters"),
                    inTransit: getUniqueCount("in_transit"),
                    votingDone: getUniqueCount("voting_done"),
                    pending: getUniqueCount("pending"),
                  };

                  const overallPercentage = totals.totalVoters > 0 
                    ? Math.round((totals.votingDone / totals.totalVoters) * 100) 
                    : 0;

                  // Sorting function
                  const handleSort = (column: keyof VotingStatusSummaryRow) => {
                    if (sortColumn === column) {
                      // Toggle direction if same column
                      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                    } else {
                      // New column, default to ascending
                      setSortColumn(column);
                      setSortDirection("asc");
                    }
                  };

                  // Apply sorting to filtered data
                  const sortedData = [...filteredData].sort((a, b) => {
                    if (!sortColumn) return 0;
                    
                    // Exclude _allMembers from sorting
                    if (sortColumn === "_allMembers") return 0;
                    
                    let aValue: string | number | undefined = a[sortColumn] as string | number | undefined;
                    let bValue: string | number | undefined = b[sortColumn] as string | number | undefined;
                    
                    // Handle null/undefined values
                    if (aValue == null) aValue = "";
                    if (bValue == null) bValue = "";
                    
                    // Convert to string for comparison if needed
                    if (typeof aValue === "number" && typeof bValue === "number") {
                      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
                    }
                    
                    // String comparison
                    const aStr = String(aValue).toLowerCase();
                    const bStr = String(bValue).toLowerCase();
                    
                    if (sortDirection === "asc") {
                      return aStr.localeCompare(bStr);
                    } else {
                      return bStr.localeCompare(aStr);
                    }
                  });

                  // Helper function to render sort icon
                  const renderSortIcon = (column: keyof VotingStatusSummaryRow) => {
                    if (sortColumn !== column) {
                      return (
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      );
                    }
                    return sortDirection === "asc" ? (
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    );
                  };

                  return (
                    <>
                      {/* Overall Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                        <button
                          type="button"
                          onClick={() => openSummaryCardModal("total_voters")}
                          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-4 text-white hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-blue-100 text-sm font-medium mb-1">Total Voters</p>
                              <p className="text-2xl font-bold">{totals.totalVoters.toLocaleString()}</p>
                            </div>
                            <div className="bg-blue-400 bg-opacity-30 rounded-full p-3">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => openSummaryCardModal("in_transit")}
                          className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg shadow-md p-4 text-white hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-blue-100 text-sm font-medium mb-1">In-Transit</p>
                              <p className="text-2xl font-bold">{totals.inTransit.toLocaleString()}</p>
                            </div>
                            <div className="bg-blue-300 bg-opacity-30 rounded-full p-3">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => openSummaryCardModal("voting_done")}
                          className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-4 text-white hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-green-100 text-sm font-medium mb-1">Voting Done</p>
                              <p className="text-2xl font-bold">{totals.votingDone.toLocaleString()}</p>
                            </div>
                            <div className="bg-green-400 bg-opacity-30 rounded-full p-3">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => openSummaryCardModal("pending")}
                          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-md p-4 text-white hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-orange-100 text-sm font-medium mb-1">Pending</p>
                              <p className="text-2xl font-bold">{totals.pending.toLocaleString()}</p>
                            </div>
                            <div className="bg-orange-400 bg-opacity-30 rounded-full p-3">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                        </button>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-4 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-purple-100 text-sm font-medium mb-1">Percentage</p>
                              <p className="text-2xl font-bold">{overallPercentage}%</p>
                            </div>
                            <div className="bg-purple-400 bg-opacity-30 rounded-full p-3">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Table Section */}
                      <div className="overflow-x-auto">
                      <table className="w-full text-sm border border-gray-300">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left border border-gray-300 font-medium text-gray-700">Sr</th>
                            <th 
                              className="px-4 py-3 text-left border border-gray-300 font-medium text-gray-700 cursor-pointer hover:bg-gray-200 select-none"
                              onClick={() => handleSort("volunteer_name")}
                            >
                              <div className="flex items-center gap-2">
                                Volunteer Name
                                {renderSortIcon("volunteer_name")}
                              </div>
                            </th>
                            <th 
                              className="px-4 py-3 text-left border border-gray-300 font-medium text-gray-700 cursor-pointer hover:bg-gray-200 select-none"
                              onClick={() => handleSort("volunteer_contact")}
                            >
                              <div className="flex items-center gap-2">
                                Volunteer Contact
                                {renderSortIcon("volunteer_contact")}
                              </div>
                            </th>
                            <th 
                              className="px-4 py-3 text-left border border-gray-300 font-medium text-gray-700 cursor-pointer hover:bg-gray-200 select-none"
                              onClick={() => handleSort("assigned_colony")}
                            >
                              <div className="flex items-center gap-2">
                                Assigned Colony
                                {renderSortIcon("assigned_colony")}
                              </div>
                            </th>
                            <th 
                              className="px-4 py-3 text-center border border-gray-300 font-medium text-gray-700 cursor-pointer hover:bg-gray-200 select-none"
                              onClick={() => handleSort("total_voters")}
                            >
                              <div className="flex items-center justify-center gap-2">
                                Number of all Voters
                                {renderSortIcon("total_voters")}
                              </div>
                            </th>
                            <th 
                              className="px-4 py-3 text-center border border-gray-300 font-medium text-gray-700 cursor-pointer hover:bg-gray-200 select-none"
                              onClick={() => handleSort("in_transit_count")}
                            >
                              <div className="flex items-center justify-center gap-2">
                                In-Transit (count)
                                {renderSortIcon("in_transit_count")}
                              </div>
                            </th>
                            <th 
                              className="px-4 py-3 text-center border border-gray-300 font-medium text-gray-700 cursor-pointer hover:bg-gray-200 select-none"
                              onClick={() => handleSort("voting_done_count")}
                            >
                              <div className="flex items-center justify-center gap-2">
                                Voting Done (count)
                                {renderSortIcon("voting_done_count")}
                              </div>
                            </th>
                            <th 
                              className="px-4 py-3 text-center border border-gray-300 font-medium text-gray-700 cursor-pointer hover:bg-gray-200 select-none"
                              onClick={() => handleSort("pending_count")}
                            >
                              <div className="flex items-center justify-center gap-2">
                                Pending (count)
                                {renderSortIcon("pending_count")}
                              </div>
                            </th>
                            <th 
                              className="px-4 py-3 text-center border border-gray-300 font-medium text-gray-700 cursor-pointer hover:bg-gray-200 select-none"
                              onClick={() => handleSort("percentage")}
                            >
                              <div className="flex items-center justify-center gap-2">
                                Percentage Voters
                                {renderSortIcon("percentage")}
                              </div>
                            </th>
                            <th className="px-4 py-3 text-center border border-gray-300 font-medium text-gray-700">Export</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedData.map((row, index) => (
                            <tr key={row.volunteer_id} className="border-b border-gray-300 hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600 border border-gray-300">{index + 1}</td>
                              <td className="px-4 py-3 font-medium text-gray-900 border border-gray-300">{row.volunteer_name}</td>
                              <td className="px-4 py-3 text-gray-600 border border-gray-300">{row.volunteer_contact || "-"}</td>
                              <td className="px-4 py-3 text-gray-600 border border-gray-300">{row.assigned_colony || "-"}</td>
                              <td className="px-4 py-3 text-center text-gray-700 font-medium border border-gray-300">{row.total_voters}</td>
                              <td className="px-4 py-3 text-center border border-gray-300">
                                <button
                                  type="button"
                                  onClick={() => openStatusListModal("in_transit", row.volunteer_id, row.volunteer_name)}
                                  disabled={row.in_transit_count === 0}
                                  className={`text-blue-600 hover:text-blue-800 font-medium underline ${
                                    row.in_transit_count === 0 ? "text-gray-400 cursor-not-allowed" : "cursor-pointer"
                                  }`}
                                >
                                  {row.in_transit_count}
                                </button>
                              </td>
                              <td className="px-4 py-3 text-center border border-gray-300">
                                <button
                                  type="button"
                                  onClick={() => openStatusListModal("voting_done", row.volunteer_id, row.volunteer_name)}
                                  disabled={row.voting_done_count === 0}
                                  className={`text-green-600 hover:text-green-800 font-medium underline ${
                                    row.voting_done_count === 0 ? "text-gray-400 cursor-not-allowed" : "cursor-pointer"
                                  }`}
                                >
                                  {row.voting_done_count}
                                </button>
                              </td>
                              <td className="px-4 py-3 text-center border border-gray-300">
                                <button
                                  type="button"
                                  onClick={() => openStatusListModal("pending", row.volunteer_id, row.volunteer_name)}
                                  disabled={row.pending_count === 0}
                                  className={`text-orange-600 hover:text-orange-800 font-medium underline ${
                                    row.pending_count === 0 ? "text-gray-400 cursor-not-allowed" : "cursor-pointer"
                                  }`}
                                >
                                  {row.pending_count}
                                </button>
                              </td>
                              <td className="px-4 py-3 text-center text-gray-700 font-medium border border-gray-300">{row.percentage}%</td>
                              <td className="px-4 py-3 text-center border border-gray-300">
                                <div className="flex gap-2 justify-center items-center">
                                  <button
                                    type="button"
                                    onClick={() => exportVolunteerDataToExcel(row)}
                                    disabled={!row._allMembers || row._allMembers.length === 0}
                                    className="px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                    title="Export to Excel"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Excel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => exportVolunteerDataToPDF(row)}
                                    disabled={!row._allMembers || row._allMembers.length === 0}
                                    className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                    title="Export to PDF"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    PDF
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {/* Summary Row */}
                        <tfoot className="bg-blue-50 border-t-2 border-blue-300">
                          <tr className="font-bold">
                            <td colSpan={4} className="px-4 py-4 text-right border border-gray-300 text-gray-900">
                              <span className="text-lg">Total Summary:</span>
                            </td>
                            <td className="px-4 py-4 text-center border border-gray-300 text-blue-700 text-lg">
                              {totals.totalVoters.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-center border border-gray-300 text-blue-600 text-lg font-semibold">
                              {totals.inTransit.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-center border border-gray-300 text-green-600 text-lg font-semibold">
                              {totals.votingDone.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-center border border-gray-300 text-orange-600 text-lg font-semibold">
                              {totals.pending.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-center border border-gray-300 text-blue-700 text-lg font-bold">
                              {overallPercentage}%
                            </td>
                            <td className="px-4 py-4 text-center border border-gray-300">
                              {/* Empty cell for Export column */}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    </>
                  );
                })()}
              </div>

              {/* Tab D - Summary Card Modal */}
              {isSummaryCardModalOpen && summaryCardModalType && (
                <Modal
                  isOpen={isSummaryCardModalOpen}
                  onClose={() => {
                    setIsSummaryCardModalOpen(false);
                    setSummaryCardModalData([]);
                    setSummaryCardModalType(null);
                    setSummaryCardModalSearch("");
                  }}
                  className="max-w-6xl p-6 h-[80vh] overflow-y-auto"
                >
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">
                        {summaryCardModalType === "total_voters" ? "Total Voters" 
                          : summaryCardModalType === "in_transit" ? "In-Transit Voters" 
                          : summaryCardModalType === "voting_done" ? "Voting Done Voters" 
                          : "Pending Voters"} - All Data
                      </h3>
                      <div className="flex gap-2 absolute right-16 top-3 sm:right-20 sm:top-4">
                        <button
                          type="button"
                          onClick={exportSummaryCardModalToExcel}
                          disabled={summaryCardModalData.length === 0}
                          className="px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Excel
                        </button>
                        <button
                          type="button"
                          onClick={exportSummaryCardModalToPDF}
                          disabled={summaryCardModalData.length === 0}
                          className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          PDF
                        </button>
                      </div>
                    </div>

                    {/* Search Box */}
                    <div className="mb-4">
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Search by Voter ID, Name, English Name, Contact, Colony, Volunteer Name, Volunteer Contact..."
                        value={summaryCardModalSearch}
                        onChange={(e) => setSummaryCardModalSearch(e.target.value)}
                      />
                    </div>

                    <div className="max-h-[70vh] overflow-y-auto">
                      {summaryCardModalData.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No records found</div>
                      ) : (() => {
                        const filteredData = summaryCardModalData.filter((member: FamilyMemberWithVolunteer) => {
                          if (!summaryCardModalSearch.trim()) return true;
                          const searchLower = summaryCardModalSearch.toLowerCase();
                          return (
                            member.Voter_Id?.toLowerCase().includes(searchLower) ||
                            member.full_name?.toLowerCase().includes(searchLower) ||
                            member.ENG_Full_name?.toLowerCase().includes(searchLower) ||
                            member.updated_mobile_no?.toLowerCase().includes(searchLower) ||
                            member.colony_name?.toLowerCase().includes(searchLower) ||
                            member.volunteer_name?.toLowerCase().includes(searchLower) ||
                            member.volunteer_contact?.toLowerCase().includes(searchLower)
                          );
                        });

                        if (filteredData.length === 0) {
                          return <div className="text-center py-8 text-gray-500">No records found matching your search.</div>;
                        }

                        return (
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead className="sticky top-0 bg-gray-100 border-b">
                                <tr>
                                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Sr No</th>
                                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Voter ID</th>
                                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                                  <th className="px-4 py-3 text-left font-semibold text-gray-700">English Name</th>
                                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Age</th>
                                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Gender</th>
                                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Contact No</th>
                                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Colony</th>
                                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Volunteer Name</th>
                                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Volunteer Contact</th>
                                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Voting Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredData.map((member, index) => (
                                  <tr key={member.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                                    <td className={`px-4 py-3 ${getVoterIdColorClass(member.inst_1_paid, member.inst_2_paid, member.inst_3_paid)}`}>{member.Voter_Id || "-"}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{member.full_name || "-"}</td>
                                    <td className="px-4 py-3 text-gray-500">{member.ENG_Full_name || "-"}</td>
                                    <td className="px-4 py-3 text-gray-600">{member.Age || "-"}</td>
                                    <td className="px-4 py-3 text-gray-600">{member.Gender || "-"}</td>
                                    <td className="px-4 py-3 text-gray-400">{member.updated_mobile_no || "-"}</td>
                                    <td className="px-4 py-3 text-gray-500">{member.colony_name || "-"}</td>
                                    <td className="px-4 py-3 text-gray-700 font-medium">{member.volunteer_name || "-"}</td>
                                    <td className="px-4 py-3 text-gray-600">{member.volunteer_contact || "-"}</td>
                                    <td className="px-4 py-3 text-gray-600">{member.voting_status || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        Showing {(() => {
                          const filtered = summaryCardModalData.filter((member: FamilyMemberWithVolunteer) => {
                            if (!summaryCardModalSearch.trim()) return true;
                            const searchLower = summaryCardModalSearch.toLowerCase();
                            return (
                              member.Voter_Id?.toLowerCase().includes(searchLower) ||
                              member.full_name?.toLowerCase().includes(searchLower) ||
                              member.ENG_Full_name?.toLowerCase().includes(searchLower) ||
                              member.updated_mobile_no?.toLowerCase().includes(searchLower) ||
                              member.colony_name?.toLowerCase().includes(searchLower) ||
                              member.volunteer_name?.toLowerCase().includes(searchLower) ||
                              member.volunteer_contact?.toLowerCase().includes(searchLower)
                            );
                          });
                          return filtered.length;
                        })()} of {summaryCardModalData.length} records
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSummaryCardModalOpen(false);
                          setSummaryCardModalData([]);
                          setSummaryCardModalType(null);
                          setSummaryCardModalSearch("");
                        }}
                        className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </Modal>
              )}

              {/* Tab D - Status List Modal */}
              {isStatusListModalOpen && statusListModalType && (
                <Modal
                  isOpen={isStatusListModalOpen}
                  onClose={() => {
                    setIsStatusListModalOpen(false);
                    setStatusListData([]);
                    setStatusListModalType(null);
                    setStatusListVolunteerName("");
                  }}
                  className="max-w-6xl p-6"
                >
                  <div>
                    <div className="flex justify-between items-center mb-4 pr-40">
                      <h3 className="text-lg font-semibold">
                        {statusListModalType === "in_transit" ? "In-Transit" : statusListModalType === "voting_done" ? "Voting Done" : "Pending"} List - {statusListVolunteerName}
                      </h3>
                      <div className="flex gap-2 absolute right-16 top-3 sm:right-20 sm:top-4">
                        <button
                          type="button"
                          onClick={exportStatusListToExcel}
                          disabled={statusListData.length === 0}
                          className="px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Excel
                        </button>
                        <button
                          type="button"
                          onClick={exportStatusListToPDF}
                          disabled={statusListData.length === 0}
                          className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          PDF
                        </button>
                      </div>
                    </div>
                    
                    <div className="max-h-[70vh] overflow-y-auto">
                      {loadingStatusList ? (
                        <div className="text-center py-8 text-gray-500">Loading...</div>
                      ) : statusListData.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No records found</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="sticky top-0 bg-gray-100 border-b">
                              <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Sr No</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Voter ID</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">English Name</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Age</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Gender</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Contact No</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Colony</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Voting Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {statusListData.map((member, index) => (
                                <tr key={member.id} className="border-b hover:bg-gray-50">
                                  <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                                  <td className={`px-4 py-3 ${getVoterIdColorClass(member.inst_1_paid, member.inst_2_paid, member.inst_3_paid)}`}>{member.Voter_Id || "-"}</td>
                                  <td className="px-4 py-3 font-medium text-gray-900">{member.full_name || "-"}</td>
                                  <td className="px-4 py-3 text-gray-500">{member.ENG_Full_name || "-"}</td>
                                  <td className="px-4 py-3 text-gray-600">{member.Age || "-"}</td>
                                  <td className="px-4 py-3 text-gray-600">{member.Gender || "-"}</td>
                                  <td className="px-4 py-3 text-gray-400">{member.updated_mobile_no || "-"}</td>
                                  <td className="px-4 py-3 text-gray-500">{member.colony_name || "-"}</td>
                                  <td className="px-4 py-3 text-gray-600">{member.voting_status || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end mt-4 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => {
                          setIsStatusListModalOpen(false);
                          setStatusListData([]);
                          setStatusListModalType(null);
                          setStatusListVolunteerName("");
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
          ) : null}
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
                  category_id: null,
                });
              }}
              className="max-w-md p-6"
            >
              <div>
                <h3 className="text-lg font-semibold mb-4">Add Volunteer</h3>
                <div className="space-y-4">
                <div>
                    <Label>User Category</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={volunteerFormData.category_id || ""}
                      onChange={e => setVolunteerFormData({ ...volunteerFormData, category_id: e.target.value ? Number(e.target.value) : null })}
                      disabled={loadingCategories}
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
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
                          category_id: null,
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
                  category_id: null,
                });
              }}
              className="max-w-md p-6"
            >
              <div>
                <h3 className="text-lg font-semibold mb-4">Edit Volunteer</h3>
                <div className="space-y-4">
                <div>
                    <Label>User Category</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={volunteerFormData.category_id || ""}
                      onChange={e => setVolunteerFormData({ ...volunteerFormData, category_id: e.target.value ? Number(e.target.value) : null })}
                      disabled={loadingCategories}
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
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
                          category_id: null,
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


