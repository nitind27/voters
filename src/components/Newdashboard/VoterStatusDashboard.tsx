"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Column } from "../tables/tabletype";
import { Withoutbtn } from "../tables/Withoutbtn";
import { toast } from "react-toastify";
import Loader from "@/common/Loader";

// Base interface with all fields from tbl_voters_search
interface BaseVoterData {
  id: number;
  Voter_Id: string;
  full_name: string;
  ENG_Full_name: string;
  Age: string;
  Gender: string;
  House_Number: string;
  Updated_colony: string;
  updated_mobile_no: string;
  Updated_photo: string;
  user_id: number;
  updated_house_number: string;
  family_member: string;
  status: string;
  created_at: string;
  updated_at: string;
  volunteer_name: string;
  volunteer_mobile: string;
  volunteer_status: string;
  assigned_colony_name: string;
  assigned_colony_id: string;
  assigned_volunteer_id: number;
  inst_1_paid: string;
  inst_2_paid: string;
  inst_3_paid: string;
  voting_paid: string;
  voting_in_transit: string;
  voting_status: string;
  colony_name: string;
}

// Data types for each tab (all extend BaseVoterData)
type VoterListData = BaseVoterData;
type PendingListData = BaseVoterData;
type FinanceListData = BaseVoterData;
type InTransitData = BaseVoterData;
type VotingDoneData = BaseVoterData;

type TabType = "voterlist" | "pending" | "finance" |  "intransit" | "votingdone" ;

const VoterStatusDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("voterlist");

  // State for Voter List tab
  const [voterListData, setVoterListData] = useState<VoterListData[]>([]);
  const [voterListLoading, setVoterListLoading] = useState(false);

  // State for Pending List tab
  const [pendingListData, setPendingListData] = useState<PendingListData[]>([]);
  const [pendingListLoading, setPendingListLoading] = useState(false);

  // State for Finance List tab
  const [financeListData, setFinanceListData] = useState<FinanceListData[]>([]);
  const [financeListLoading, setFinanceListLoading] = useState(false);
  const [financeVolunteerFilter, setFinanceVolunteerFilter] = useState<string>('');
  const [financePrimaryPersonFilter, setFinancePrimaryPersonFilter] = useState<string>('');
  const [financeInstallmentFilter, setFinanceInstallmentFilter] = useState<string>('');

  // State for Voting Done tab
  const [votingDoneData, setVotingDoneData] = useState<VotingDoneData[]>([]);
  const [votingDoneLoading, setVotingDoneLoading] = useState(false);
  const [votingDoneVolunteerFilter, setVotingDoneVolunteerFilter] = useState<string>('');
  const [votingDonePrimaryPersonFilter, setVotingDonePrimaryPersonFilter] = useState<string>('');

  // State for In Transit tab
  const [inTransitData, setInTransitData] = useState<InTransitData[]>([]);
  const [inTransitLoading, setInTransitLoading] = useState(false);

  // Refs to track if data has been fetched for each tab
  const fetchedRefs = useRef({
    voterlist: false,
    pending: false,
    finance: false,
    votingdone: false,
    intransit: false,
  });

  // Edit modal state for Voter List
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingVoter, setEditingVoter] = useState<VoterListData | null>(null);
  const [editFormData, setEditFormData] = useState({
    Updated_colony: "",
    updated_house_number: "",
    updated_mobile_no: "",
  });
  const [saving, setSaving] = useState(false);
  const [colonyList, setColonyList] = useState<Array<{ colony_id: number; colony_name: string }>>([]);
  const [loadingColonies, setLoadingColonies] = useState(false);

  // Assign Volunteer modal state
  const [assignVolunteerModalOpen, setAssignVolunteerModalOpen] = useState(false);
  const [volunteers, setVolunteers] = useState<Array<{ volunteer_name: string; volunteer_mobile: string; colony_id: string }>>([]);
  const [primaryPersons, setPrimaryPersons] = useState<Array<{ Voter_Id: string; full_name: string; ENG_Full_name: string; Updated_colony: string }>>([]);
  const [assignFormData, setAssignFormData] = useState({
    volunteer_name: "",
    volunteer_mobile: "",
    primary_person_id: "",
  });
  const [assigning, setAssigning] = useState(false);
  const [assignedList, setAssignedList] = useState<Array<{ volunteer_name: string; primary_person: string; count: number }>>([]);

  // Finance Add modal state
  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [financeFormData, setFinanceFormData] = useState({
    volunteer_name: "",
    primary_person_id: "",
    installment: "inst_1_paid",
  });
  const [addingFinance, setAddingFinance] = useState(false);
  const [volunteerSearchTerm, setVolunteerSearchTerm] = useState("");
  const [primaryPersonSearchTerm, setPrimaryPersonSearchTerm] = useState("");
  const [volunteerDropdownOpen, setVolunteerDropdownOpen] = useState(false);
  const [primaryPersonDropdownOpen, setPrimaryPersonDropdownOpen] = useState(false);
  const volunteerDropdownRef = useRef<HTMLDivElement>(null);
  const primaryPersonDropdownRef = useRef<HTMLDivElement>(null);
  const [installmentStatus, setInstallmentStatus] = useState<{
    inst_1_paid: boolean;
    inst_2_paid: boolean;
    inst_3_paid: boolean;
  } | null>(null);
  const [loadingInstallmentStatus, setLoadingInstallmentStatus] = useState(false);

  // Voting Done modal state
  const [votingDoneModalOpen, setVotingDoneModalOpen] = useState(false);
  const [votingDoneFormData, setVotingDoneFormData] = useState({
    volunteer_name: "",
    primary_person_id: "",
  });
  const [familyMembers, setFamilyMembers] = useState<Array<{ Voter_Id: string; full_name: string; voting_status: string }>>([]);
  const [selectedVoters, setSelectedVoters] = useState<Set<string>>(new Set());
  const [loadingFamilyMembers, setLoadingFamilyMembers] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);

  // Fetch Voter List data
  const fetchVoterList = useCallback(async () => {
    setVoterListLoading(true);
    try {
      const response = await fetch('/api/voterstatus/voterlist?limit=10000&page=1');
      if (!response.ok) throw new Error('Failed to fetch voter list');
      const result = await response.json();
      setVoterListData(result.data || []);
    } catch (error) {
      console.error('Error fetching voter list:', error);
      toast.error('Failed to load voter list');
      setVoterListData([]);
    } finally {
      setVoterListLoading(false);
    }
  }, []);

  // Fetch Pending List data
  const fetchPendingList = useCallback(async () => {
    setPendingListLoading(true);
    try {
      const response = await fetch('/api/voterstatus/pending?limit=10000&page=1');
      if (!response.ok) throw new Error('Failed to fetch pending list');
      const result = await response.json();
      setPendingListData(result.data || []);
    } catch (error) {
      console.error('Error fetching pending list:', error);
      toast.error('Failed to load pending list');
      setPendingListData([]);
    } finally {
      setPendingListLoading(false);
    }
  }, []);

  // Fetch Finance List data
  const fetchFinanceList = useCallback(async () => {
    setFinanceListLoading(true);
    try {
      const response = await fetch('/api/voterstatus/finance?limit=10000&page=1');
      if (!response.ok) throw new Error('Failed to fetch finance list');
      const result = await response.json();
      setFinanceListData(result.data || []);
    } catch (error) {
      console.error('Error fetching finance list:', error);
      toast.error('Failed to load finance list');
      setFinanceListData([]);
    } finally {
      setFinanceListLoading(false);
    }
  }, []);

  // Fetch Voting Done data
  const fetchVotingDone = useCallback(async () => {
    setVotingDoneLoading(true);
    try {
      const response = await fetch('/api/voterstatus/votingdone?limit=10000&page=1');
      if (!response.ok) throw new Error('Failed to fetch voting done list');
      const result = await response.json();
      setVotingDoneData(result.data || []);
    } catch (error) {
      console.error('Error fetching voting done list:', error);
      toast.error('Failed to load voting done list');
      setVotingDoneData([]);
    } finally {
      setVotingDoneLoading(false);
    }
  }, []);

  // Fetch In Transit data
  const fetchInTransit = useCallback(async () => {
    setInTransitLoading(true);
    try {
      const response = await fetch('/api/voterstatus/intransit?limit=10000&page=1');
      if (!response.ok) throw new Error('Failed to fetch in transit list');
      const result = await response.json();
      setInTransitData(result.data || []);
    } catch (error) {
      console.error('Error fetching in transit list:', error);
      toast.error('Failed to load in transit list');
      setInTransitData([]);
    } finally {
      setInTransitLoading(false);
    }
  }, []);

  // Fetch colony list
  const fetchColonies = useCallback(async () => {
    setLoadingColonies(true);
    try {
      const response = await fetch('/api/colony');
      if (!response.ok) throw new Error('Failed to fetch colonies');
      const colonies = await response.json();
      setColonyList(colonies);
    } catch (error) {
      console.error('Error fetching colonies:', error);
      toast.error('Failed to load colony list');
    } finally {
      setLoadingColonies(false);
    }
  }, []);

  // Fetch volunteers list
  const fetchVolunteers = useCallback(async () => {
    try {
      const response = await fetch('/api/voterstatus/volunteers');
      if (!response.ok) throw new Error('Failed to fetch volunteers');
      const data = await response.json();
      setVolunteers(data);
    } catch (error) {
      console.error('Error fetching volunteers:', error);
      toast.error('Failed to load volunteers');
    }
  }, []);

  // Fetch primary persons list
  const fetchPrimaryPersons = useCallback(async () => {
    try {
      const response = await fetch('/api/voterstatus/primarypersons');
      if (!response.ok) throw new Error('Failed to fetch primary persons');
      const data = await response.json();
      setPrimaryPersons(data);
    } catch (error) {
      console.error('Error fetching primary persons:', error);
      toast.error('Failed to load primary persons');
    }
  }, []);

  // Fetch assigned list (for display)
  const fetchAssignedList = useCallback(async () => {
    try {
      // Get distinct volunteer-primary person assignments
      const response = await fetch('/api/voterstatus/voterlist?limit=10000&page=1');
      if (!response.ok) throw new Error('Failed to fetch assigned list');
      const result = await response.json();
      const data = result.data || [];
      
      // Group by volunteer_name and primary person
      const grouped: Record<string, { volunteer_name: string; primary_person: string; count: number }> = {};
      data.forEach((voter: BaseVoterData) => {
        if (voter.volunteer_name && voter.family_member) {
          const key = `${voter.volunteer_name}_${voter.family_member}`;
          if (!grouped[key]) {
            grouped[key] = {
              volunteer_name: voter.volunteer_name,
              primary_person: voter.family_member,
              count: 0,
            };
          }
          grouped[key].count++;
        }
      });
      setAssignedList(Object.values(grouped));
    } catch (error) {
      console.error('Error fetching assigned list:', error);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    fetchColonies();
    fetchVolunteers();
    fetchPrimaryPersons();
  }, [fetchColonies, fetchVolunteers, fetchPrimaryPersons]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (volunteerDropdownRef.current && !volunteerDropdownRef.current.contains(event.target as Node)) {
        setVolunteerDropdownOpen(false);
      }
      if (primaryPersonDropdownRef.current && !primaryPersonDropdownRef.current.contains(event.target as Node)) {
        setPrimaryPersonDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  // Refresh handlers that reset the fetched flag
  const handleRefreshVoterList = useCallback(() => {
    fetchedRefs.current.voterlist = false;
    fetchVoterList();
  }, [fetchVoterList]);

  const handleRefreshPendingList = useCallback(() => {
    fetchedRefs.current.pending = false;
    fetchPendingList();
  }, [fetchPendingList]);

  const handleRefreshFinanceList = useCallback(() => {
    fetchedRefs.current.finance = false;
    fetchFinanceList();
  }, [fetchFinanceList]);

  const handleRefreshVotingDone = useCallback(() => {
    fetchedRefs.current.votingdone = false;
    fetchVotingDone();
  }, [fetchVotingDone]);

  const handleRefreshInTransit = useCallback(() => {
    fetchedRefs.current.intransit = false;
    fetchInTransit();
  }, [fetchInTransit]);

  // Edit modal handlers
  const openEditModal = (voter: VoterListData) => {
    setEditingVoter(voter);
    setEditFormData({
      Updated_colony: voter.Updated_colony || "",
      updated_house_number: voter.updated_house_number || "",
      updated_mobile_no: voter.updated_mobile_no || "",
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingVoter(null);
    setEditFormData({
      Updated_colony: "",
      updated_house_number: "",
      updated_mobile_no: "",
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveVoter = async () => {
    if (!editingVoter) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/voterdetailsdata/Voterdetailslist/${editingVoter.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
      handleRefreshVoterList();
    } catch (error) {
      console.error("Error updating voter:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update voter");
    } finally {
      setSaving(false);
    }
  };

  // Assign Volunteer handlers
  const openAssignVolunteerModal = () => {
    setAssignVolunteerModalOpen(true);
    fetchAssignedList();
  };

  const closeAssignVolunteerModal = () => {
    setAssignVolunteerModalOpen(false);
    setAssignFormData({
      volunteer_name: "",
      volunteer_mobile: "",
      primary_person_id: "",
    });
  };

  const handleAssignVolunteerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'volunteer_name') {
      const volunteer = volunteers.find(v => v.volunteer_name === value);
      setAssignFormData(prev => ({
        ...prev,
        volunteer_name: value,
        volunteer_mobile: volunteer?.volunteer_mobile || "",
      }));
    } else {
      setAssignFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAssignVolunteer = async () => {
    if (!assignFormData.volunteer_name || !assignFormData.primary_person_id) {
      toast.error('Please select volunteer and primary person');
      return;
    }
    setAssigning(true);
    try {
      const res = await fetch('/api/voterstatus/assignvolunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignFormData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to assign volunteer');
      }
      const result = await res.json();
      toast.success(result.message || 'Volunteer assigned successfully!');
      closeAssignVolunteerModal();
      handleRefreshPendingList();
      fetchAssignedList();
    } catch (error) {
      console.error('Error assigning volunteer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to assign volunteer');
    } finally {
      setAssigning(false);
    }
  };

  // Finance handlers
  const openFinanceModal = () => {
    setFinanceModalOpen(true);
  };

  const closeFinanceModal = () => {
    setFinanceModalOpen(false);
    setFinanceFormData({
      volunteer_name: "",
      primary_person_id: "",
      installment: "inst_1_paid",
    });
    setVolunteerSearchTerm("");
    setPrimaryPersonSearchTerm("");
    setVolunteerDropdownOpen(false);
    setPrimaryPersonDropdownOpen(false);
    setInstallmentStatus(null);
  };

  // Fetch installment status for primary person
  const fetchInstallmentStatus = useCallback(async (primaryPersonId: string) => {
    if (!primaryPersonId) {
      setInstallmentStatus(null);
      return;
    }
    setLoadingInstallmentStatus(true);
    try {
      const response = await fetch(`/api/voterstatus/installmentstatus?primary_person_id=${primaryPersonId}`);
      if (!response.ok) throw new Error('Failed to fetch installment status');
      const data = await response.json();
      setInstallmentStatus(data);
    } catch (error) {
      console.error('Error fetching installment status:', error);
      setInstallmentStatus(null);
    } finally {
      setLoadingInstallmentStatus(false);
    }
  }, []);

  const handleFinanceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFinanceFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      // Reset primary_person_id and installment status when volunteer changes
      if (name === 'volunteer_name') {
        newData.primary_person_id = '';
        newData.installment = 'inst_1_paid';
        setInstallmentStatus(null);
      }
      return newData;
    });
  };

  const handleAddFinance = async () => {
    if (!financeFormData.volunteer_name || !financeFormData.primary_person_id || !financeFormData.installment) {
      toast.error('Please select volunteer, primary person, and installment');
      return;
    }
    
    // Check if selected installment is available
    if (availableInstallments.length > 0 && !availableInstallments.find(inst => inst.value === financeFormData.installment)) {
      toast.error('Selected installment is already paid. Please select another installment.');
      return;
    }
    
    setAddingFinance(true);
    try {
      const res = await fetch('/api/voterstatus/addfinance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(financeFormData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add finance');
      }
      const result = await res.json();
      toast.success(result.message || 'Finance added successfully!');
      
      // Refresh installment status after successful submission
      if (financeFormData.primary_person_id) {
        await fetchInstallmentStatus(financeFormData.primary_person_id);
      }
      
      closeFinanceModal();
      handleRefreshFinanceList();
      // Auto-filter to show the newly added finance entry
      setFinanceVolunteerFilter(financeFormData.volunteer_name);
      setFinancePrimaryPersonFilter(financeFormData.primary_person_id);
    } catch (error) {
      console.error('Error adding finance:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add finance');
    } finally {
      setAddingFinance(false);
    }
  };

  // Voting Done handlers
  const openVotingDoneModal = () => {
    setVotingDoneModalOpen(true);
    setSelectedVoters(new Set());
    setFamilyMembers([]);
  };

  const closeVotingDoneModal = () => {
    setVotingDoneModalOpen(false);
    setVotingDoneFormData({
      volunteer_name: "",
      primary_person_id: "",
    });
    setFamilyMembers([]);
    setSelectedVoters(new Set());
  };

  const handleVotingDoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setVotingDoneFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (name === 'primary_person_id' && value) {
      fetchFamilyMembersForVoting(value);
    }
  };

  const fetchFamilyMembersForVoting = async (primaryPersonId: string) => {
    setLoadingFamilyMembers(true);
    try {
      const response = await fetch(`/api/voterstatus/familymembers?primary_person_id=${primaryPersonId}`);
      if (!response.ok) throw new Error('Failed to fetch family members');
      const data = await response.json();
      setFamilyMembers(data);
    } catch (error) {
      console.error('Error fetching family members:', error);
      toast.error('Failed to load family members');
      setFamilyMembers([]);
    } finally {
      setLoadingFamilyMembers(false);
    }
  };

  const handleVoterCheckboxChange = (voterId: string) => {
    setSelectedVoters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(voterId)) {
        newSet.delete(voterId);
      } else {
        newSet.add(voterId);
      }
      return newSet;
    });
  };

  const handleMarkVotingDone = async () => {
    if (selectedVoters.size === 0) {
      toast.error('Please select at least one voter');
      return;
    }
    setMarkingDone(true);
    try {
      const res = await fetch('/api/voterstatus/markvotingdone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_ids: Array.from(selectedVoters) }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to mark voting done');
      }
      const result = await res.json();
      toast.success(result.message || 'Voting marked as done successfully!');
      closeVotingDoneModal();
      handleRefreshVotingDone();
    } catch (error) {
      console.error('Error marking voting done:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to mark voting done');
    } finally {
      setMarkingDone(false);
    }
  };

  // Load data when tab changes (only once per tab)
  useEffect(() => {
    if (activeTab === "voterlist" && !fetchedRefs.current.voterlist && !voterListLoading) {
      fetchedRefs.current.voterlist = true;
      fetchVoterList();
    }
    if (activeTab === "pending" && !fetchedRefs.current.pending && !pendingListLoading) {
      fetchedRefs.current.pending = true;
      fetchPendingList();
    }
    if (activeTab === "finance" && !fetchedRefs.current.finance && !financeListLoading) {
      fetchedRefs.current.finance = true;
      fetchFinanceList();
    }
    if (activeTab === "votingdone" && !fetchedRefs.current.votingdone && !votingDoneLoading) {
      fetchedRefs.current.votingdone = true;
      fetchVotingDone();
    }
    if (activeTab === "intransit" && !fetchedRefs.current.intransit && !inTransitLoading) {
      fetchedRefs.current.intransit = true;
      fetchInTransit();
    }
  }, [activeTab, voterListLoading, pendingListLoading, financeListLoading, votingDoneLoading, inTransitLoading, fetchVoterList, fetchPendingList, fetchFinanceList, fetchVotingDone, fetchInTransit]);

  // Columns for Voter List tab
  const voterListColumns: Column<VoterListData>[] = useMemo(() => [
    {
      key: 'family_member',
      label: 'Family',
      accessor: 'family_member',
      render: (data) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{data.family_member || data.Voter_Id || 'N/A'}</span>
          {data.full_name && <span className="text-xs text-gray-500">{data.full_name}</span>}
        </div>
      ),
    },
    {
      key: 'colony_name',
      label: 'Colony',
      accessor: 'colony_name',
      render: (data) => (
        <span className="text-sm">{data.colony_name || data.assigned_colony_name || data.Updated_colony || 'N/A'}</span>
      ),
    },
    {
      key: 'updated_mobile_no',
      label: 'Mobile No',
      accessor: 'updated_mobile_no',
      render: (data) => (
        <span className="font-mono text-sm">{data.updated_mobile_no || 'N/A'}</span>
      ),
    },
    {
      key: 'remarks',
      label: 'Remarks',
      accessor: 'voting_status',
      render: (data) => {
        const remarks = [];
        if (data.voting_status) remarks.push(`Voting: ${data.voting_status}`);
        if (data.volunteer_status) remarks.push(`Volunteer: ${data.volunteer_status}`);
        if (data.inst_1_paid === 'Yes' || data.inst_2_paid === 'Yes' || data.inst_3_paid === 'Yes') {
          remarks.push('Paid');
        }
        return (
          <span className="text-sm">{remarks.length > 0 ? remarks.join(', ') : 'N/A'}</span>
        );
      },
    },
    {
      key: 'action',
      label: 'Action',
      render: (data) => (
        <button
          onClick={() => openEditModal(data)}
          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
      ),
    },
  ], []);

  // Columns for Pending List tab
  const pendingListColumns: Column<PendingListData>[] = useMemo(() => [
    {
      key: 'family_voter',
      label: 'Family/Voter',
      accessor: 'family_member',
      render: (data) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{data.family_member || data.Voter_Id || 'N/A'}</span>
          {data.full_name && <span className="text-xs text-gray-500">{data.full_name}</span>}
          {data.ENG_Full_name && <span className="text-xs text-gray-400">({data.ENG_Full_name})</span>}
        </div>
      ),
    },
    {
      key: 'colony_name',
      label: 'Colony',
      accessor: 'colony_name',
      render: (data) => (
        <span className="text-sm">{data.colony_name || data.assigned_colony_name || data.Updated_colony || 'N/A'}</span>
      ),
    },
    {
      key: 'updated_mobile_no',
      label: 'Mobile No',
      accessor: 'updated_mobile_no',
      render: (data) => (
        <span className="font-mono text-sm">{data.updated_mobile_no || 'N/A'}</span>
      ),
    },
  ], []);

  // Filtered Finance List data
  const filteredFinanceListData = useMemo(() => {
    let filtered = financeListData;

    if (financeVolunteerFilter) {
      filtered = filtered.filter(item => item.volunteer_name === financeVolunteerFilter);
    }

    if (financePrimaryPersonFilter) {
      filtered = filtered.filter(item => item.family_member === financePrimaryPersonFilter);
    }

    if (financeInstallmentFilter) {
      filtered = filtered.filter(item => {
        if (financeInstallmentFilter === 'inst_1_paid') {
          const value = String(item.inst_1_paid || '');
          return value === 'Yes' || value === '1' || value === 'true';
        }
        if (financeInstallmentFilter === 'inst_2_paid') {
          const value = String(item.inst_2_paid || '');
          return value === 'Yes' || value === '1' || value === 'true';
        }
        if (financeInstallmentFilter === 'inst_3_paid') {
          const value = String(item.inst_3_paid || '');
          return value === 'Yes' || value === '1' || value === 'true';
        }
        if (financeInstallmentFilter === 'voting_paid') {
          const value = String(item.voting_paid || '');
          return value === 'Yes' || value === '1' || value === 'true';
        }
        return true;
      });
    }

    return filtered;
  }, [financeListData, financeVolunteerFilter, financePrimaryPersonFilter, financeInstallmentFilter]);

  // Get unique volunteers and primary persons from finance data for filters
  const financeVolunteers = useMemo(() => {
    const unique = new Set<string>();
    financeListData.forEach(item => {
      if (item.volunteer_name) unique.add(item.volunteer_name);
    });
    return Array.from(unique).sort();
  }, [financeListData]);

  const financePrimaryPersons = useMemo(() => {
    const unique = new Map<string, string>();
    financeListData.forEach(item => {
      if (item.family_member && !unique.has(item.family_member)) {
        unique.set(item.family_member, item.full_name || item.family_member);
      }
    });
    return Array.from(unique.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [financeListData]);

  // Filter primary persons based on selected volunteer's colony_id
  const filteredPrimaryPersonsForFinance = useMemo(() => {
    if (!financeFormData.volunteer_name) {
      return primaryPersons;
    }

    const selectedVolunteer = volunteers.find(v => v.volunteer_name === financeFormData.volunteer_name);
    if (!selectedVolunteer || !selectedVolunteer.colony_id) {
      return primaryPersons;
    }

    // Split comma-separated colony_id (e.g., "1,2,3" -> [1, 2, 3])
    const volunteerColonyIds = selectedVolunteer.colony_id
      .split(',')
      .map(id => id.trim())
      .filter(id => id !== '');

    // Filter primary persons whose Updated_colony matches any of the volunteer's colony_ids
    return primaryPersons.filter(pp => {
      if (!pp.Updated_colony) return false;
      return volunteerColonyIds.includes(pp.Updated_colony.toString());
    });
  }, [financeFormData.volunteer_name, volunteers, primaryPersons]);

  // Filtered volunteers based on search term
  const filteredVolunteersForFinance = useMemo(() => {
    if (!volunteerSearchTerm) return volunteers;
    const search = volunteerSearchTerm.toLowerCase();
    return volunteers.filter(v => 
      v.volunteer_name.toLowerCase().includes(search) ||
      (v.volunteer_mobile && v.volunteer_mobile.includes(search))
    );
  }, [volunteers, volunteerSearchTerm]);

  // Filtered primary persons based on search term
  const searchedPrimaryPersonsForFinance = useMemo(() => {
    if (!primaryPersonSearchTerm) return filteredPrimaryPersonsForFinance;
    const search = primaryPersonSearchTerm.toLowerCase();
    return filteredPrimaryPersonsForFinance.filter(p => 
      p.full_name?.toLowerCase().includes(search) ||
      p.Voter_Id.toLowerCase().includes(search) ||
      (p.ENG_Full_name && p.ENG_Full_name.toLowerCase().includes(search))
    );
  }, [filteredPrimaryPersonsForFinance, primaryPersonSearchTerm]);

  // Available installments (only unpaid ones)
  const availableInstallments = useMemo(() => {
    const allInstallments = [
      { value: 'inst_1_paid', label: 'Installment 1' },
      { value: 'inst_2_paid', label: 'Installment 2' },
      { value: 'inst_3_paid', label: 'Installment 3' },
    ];

    if (!installmentStatus) {
      return allInstallments;
    }

    // Filter out paid installments
    return allInstallments.filter(inst => {
      if (inst.value === 'inst_1_paid') return !installmentStatus.inst_1_paid;
      if (inst.value === 'inst_2_paid') return !installmentStatus.inst_2_paid;
      if (inst.value === 'inst_3_paid') return !installmentStatus.inst_3_paid;
      return true;
    });
  }, [installmentStatus]);

  // Columns for Finance List tab
  const financeListColumns: Column<FinanceListData>[] = useMemo(() => [
    {
      key: 'volunteer_name',
      label: 'Volunteer',
      accessor: 'volunteer_name',
      render: (data) => (
        <span className="text-sm font-medium text-indigo-600">{data.volunteer_name || 'N/A'}</span>
      ),
    },
    {
      key: 'family_voter',
      label: 'Family/Voter',
      accessor: 'family_member',
      render: (data) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{data.family_member || data.Voter_Id || 'N/A'}</span>
          {data.full_name && <span className="text-xs text-gray-500">{data.full_name}</span>}
        </div>
      ),
    },
    {
      key: 'colony_name',
      label: 'Colony',
      accessor: 'colony_name',
      render: (data) => (
        <span className="text-sm">{data.colony_name || data.assigned_colony_name || data.Updated_colony || 'N/A'}</span>
      ),
    },
    {
      key: 'updated_mobile_no',
      label: 'Mobile No',
      accessor: 'updated_mobile_no',
      render: (data) => (
        <span className="font-mono text-sm">{data.updated_mobile_no || 'N/A'}</span>
      ),
    },
    {
      key: 'installments',
      label: 'Installments Paid',
      accessor: 'inst_1_paid',
      render: (data) => (
        <div className="flex gap-1 flex-wrap">
          {data.inst_1_paid === 'Yes' && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">Inst 1</span>}
          {data.inst_2_paid === 'Yes' && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">Inst 2</span>}
          {data.inst_3_paid === 'Yes' && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">Inst 3</span>}
          {data.voting_paid === 'Yes' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">Voting</span>}
          {data.inst_1_paid !== 'Yes' && data.inst_2_paid !== 'Yes' && data.inst_3_paid !== 'Yes' && data.voting_paid !== 'Yes' && (
            <span className="text-xs text-gray-400">None</span>
          )}
        </div>
      ),
    },
  ], []);

  // Filtered Voting Done data
  const filteredVotingDoneData = useMemo(() => {
    let filtered = votingDoneData;

    if (votingDoneVolunteerFilter) {
      filtered = filtered.filter(item => item.volunteer_name === votingDoneVolunteerFilter);
    }

    if (votingDonePrimaryPersonFilter) {
      filtered = filtered.filter(item => item.family_member === votingDonePrimaryPersonFilter);
    }

    return filtered;
  }, [votingDoneData, votingDoneVolunteerFilter, votingDonePrimaryPersonFilter]);

  // Get unique volunteers and primary persons from voting done data for filters
  const votingDoneVolunteers = useMemo(() => {
    const unique = new Set<string>();
    votingDoneData.forEach(item => {
      if (item.volunteer_name) unique.add(item.volunteer_name);
    });
    return Array.from(unique).sort();
  }, [votingDoneData]);

  const votingDonePrimaryPersons = useMemo(() => {
    const unique = new Map<string, string>();
    votingDoneData.forEach(item => {
      if (item.family_member && !unique.has(item.family_member)) {
        unique.set(item.family_member, item.full_name || item.family_member);
      }
    });
    return Array.from(unique.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [votingDoneData]);

  // Columns for Voting Done tab
  const votingDoneColumns: Column<VotingDoneData>[] = useMemo(() => [
    {
      key: 'volunteer_name',
      label: 'Volunteer',
      accessor: 'volunteer_name',
      render: (data) => (
        <span className="text-sm font-medium text-indigo-600">{data.volunteer_name || 'N/A'}</span>
      ),
    },
    {
      key: 'family_voter',
      label: 'Family/Voter',
      accessor: 'family_member',
      render: (data) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{data.family_member || data.Voter_Id || 'N/A'}</span>
          {data.full_name && <span className="text-xs text-gray-500">{data.full_name}</span>}
        </div>
      ),
    },
    {
      key: 'colony_name',
      label: 'Colony',
      accessor: 'colony_name',
      render: (data) => (
        <div className="flex flex-col">
          <span className="text-sm">{data.colony_name || data.assigned_colony_name || data.Updated_colony || 'N/A'}</span>
          {data.voting_status && (
            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block w-fit ${
              data.voting_status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {data.voting_status}
            </span>
          )}
        </div>
      ),
    },
  ], []);

  

  // Columns for In Transit tab
  const inTransitColumns: Column<InTransitData>[] = useMemo(() => [
    {
      key: 'family_member',
      label: 'Family',
      accessor: 'family_member',
      render: (data) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{data.family_member || data.Voter_Id || 'N/A'}</span>
          {data.full_name && <span className="text-xs text-gray-500">{data.full_name}</span>}
        </div>
      ),
    },
    {
      key: 'colony_name',
      label: 'Colony',
      accessor: 'colony_name',
      render: (data) => (
        <div className="flex flex-col">
          <span className="text-sm">{data.colony_name || data.assigned_colony_name || data.Updated_colony || 'N/A'}</span>
          {data.voting_in_transit === 'Yes' && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full mt-1 inline-block w-fit">
              In Transit
            </span>
          )}
        </div>
      ),
    },
  ], []);

  return (
    <div className="">
      {/* Tab Buttons */}
      <div className="grid grid-cols-5 gap-3 mb-5" role="tablist" aria-label="Voter status tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "voterlist"}
          onClick={() => setActiveTab("voterlist")}
          className={`h-11 rounded-lg text-sm font-medium transition-colors
            ${activeTab === "voterlist"
              ? "bg-blue-600 text-white shadow"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}
        >
          Voter List
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "pending"}
          onClick={() => setActiveTab("pending")}
          className={`h-11 rounded-lg text-sm font-medium transition-colors
            ${activeTab === "pending"
              ? "bg-orange-600 text-white shadow"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}
        >
          Pending List
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "finance"}
          onClick={() => setActiveTab("finance")}
          className={`h-11 rounded-lg text-sm font-medium transition-colors
            ${activeTab === "finance"
              ? "bg-green-600 text-white shadow"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}
        >
          Finance List
        </button>
        
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "intransit"}
          onClick={() => setActiveTab("intransit")}
          className={`h-11 rounded-lg text-sm font-medium transition-colors
            ${activeTab === "intransit"
              ? "bg-yellow-600 text-white shadow"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}
        >
          In Transit
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "votingdone"}
          onClick={() => setActiveTab("votingdone")}
          className={`h-11 rounded-lg text-sm font-medium transition-colors
            ${activeTab === "votingdone"
              ? "bg-purple-600 text-white shadow"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}
        >
          Voting Done
        </button>
      </div>

      {/* Voter List Tab Panel */}
      <div
        id="tab-panel-voterlist"
        role="tabpanel"
        hidden={activeTab !== "voterlist"}
        className="focus:outline-none"
      >
        {activeTab === "voterlist" && (
          <div className="">
            {voterListLoading && <Loader />}
            <Withoutbtn
              data={voterListData}
              columns={voterListColumns}
              title="Voter List"
              filterOptions={[]}
              searchKey="full_name"
              inputfiled={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRefreshVoterList}
                    disabled={voterListLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {voterListLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  <span className="text-sm text-gray-600">
                    Total: <span className="font-semibold text-blue-600">{voterListData.length}</span>
                  </span>
                </div>
              }
            />
          </div>
        )}
      </div>

      {/* Pending List Tab Panel */}
      <div
        id="tab-panel-pending"
        role="tabpanel"
        hidden={activeTab !== "pending"}
        className="focus:outline-none"
      >
        {activeTab === "pending" && (
          <div className="">
            {pendingListLoading && <Loader />}
            <Withoutbtn
              data={pendingListData}
              columns={pendingListColumns}
              title="Pending List Details"
              filterOptions={[]}
              searchKey="full_name"
              inputfiled={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openAssignVolunteerModal}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    Assign Volunteer
                  </button>
                  <button
                    type="button"
                    onClick={handleRefreshPendingList}
                    disabled={pendingListLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-orange-600 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pendingListLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  <span className="text-sm text-gray-600">
                    Total: <span className="font-semibold text-orange-600">{pendingListData.length}</span>
                  </span>
                </div>
              }
            />
          </div>
        )}
      </div>

      {/* Finance List Tab Panel */}
      <div
        id="tab-panel-finance"
        role="tabpanel"
        hidden={activeTab !== "finance"}
        className="focus:outline-none"
      >
        {activeTab === "finance" && (
          <div className="">
            {financeListLoading && <Loader />}
            <Withoutbtn
              data={filteredFinanceListData}
              columns={financeListColumns}
              title="Finance Details"
              filterOptions={[]}
              searchKey="full_name"
              inputfiled={
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={openFinanceModal}
                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    Add
                  </button>
                  
                  {/* Volunteer Filter */}
                  <select
                    value={financeVolunteerFilter}
                    onChange={(e) => setFinanceVolunteerFilter(e.target.value)}
                    className="h-11 w-full md:w-48 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  >
                    <option value="">All Volunteers</option>
                    {financeVolunteers.map((volunteer) => (
                      <option key={volunteer} value={volunteer}>{volunteer}</option>
                    ))}
                  </select>

                  {/* Primary Person Filter */}
                  <select
                    value={financePrimaryPersonFilter}
                    onChange={(e) => setFinancePrimaryPersonFilter(e.target.value)}
                    className="h-11 w-full md:w-48 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  >
                    <option value="">All Primary Persons</option>
                    {financePrimaryPersons.map(([id, name]) => (
                      <option key={id} value={id}>{name} ({id})</option>
                    ))}
                  </select>

                  {/* Installment Filter */}
                  <select
                    value={financeInstallmentFilter}
                    onChange={(e) => setFinanceInstallmentFilter(e.target.value)}
                    className="h-11 w-full md:w-48 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  >
                    <option value="">All Installments</option>
                    <option value="inst_1_paid">Installment 1</option>
                    <option value="inst_2_paid">Installment 2</option>
                    <option value="inst_3_paid">Installment 3</option>
                    <option value="voting_paid">Voting Paid</option>
                  </select>

                  {/* Clear Filters Button */}
                  {(financeVolunteerFilter || financePrimaryPersonFilter || financeInstallmentFilter) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFinanceVolunteerFilter('');
                        setFinancePrimaryPersonFilter('');
                        setFinanceInstallmentFilter('');
                      }}
                      className="px-4 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                    >
                      Clear Filters
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleRefreshFinanceList}
                    disabled={financeListLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {financeListLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  
                  {/* <span className="text-sm text-gray-600">
                    Showing: <span className="font-semibold text-green-600">{filteredFinanceListData.length}</span> of <span className="font-semibold text-gray-600">{financeListData.length}</span>
                  </span> */}
                </div>
              }
            />
          </div>
        )}
      </div>

      {/* Voting Done Tab Panel */}
      <div
        id="tab-panel-votingdone"
        role="tabpanel"
        hidden={activeTab !== "votingdone"}
        className="focus:outline-none"
      >
        {activeTab === "votingdone" && (
          <div className="">
            {votingDoneLoading && <Loader />}
            <Withoutbtn
              data={filteredVotingDoneData}
              columns={votingDoneColumns}
              title="Voting Done List"
              filterOptions={[]}
              searchKey="full_name"
              inputfiled={
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={openVotingDoneModal}
                    className="px-4 py-2 text-sm font-medium text-white bg-pink-600 border border-pink-600 rounded-lg hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    Mark Voting Done
                  </button>
                  
                  {/* Volunteer Filter */}
                  <select
                    value={votingDoneVolunteerFilter}
                    onChange={(e) => setVotingDoneVolunteerFilter(e.target.value)}
                    className="h-11 w-full md:w-48 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="">All Volunteers</option>
                    {votingDoneVolunteers.map((volunteer) => (
                      <option key={volunteer} value={volunteer}>{volunteer}</option>
                    ))}
                  </select>

                  {/* Primary Person Filter */}
                  <select
                    value={votingDonePrimaryPersonFilter}
                    onChange={(e) => setVotingDonePrimaryPersonFilter(e.target.value)}
                    className="h-11 w-full md:w-48 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="">All Primary Persons</option>
                    {votingDonePrimaryPersons.map(([id, name]) => (
                      <option key={id} value={id}>{name} ({id})</option>
                    ))}
                  </select>

                  {/* Clear Filters Button */}
                  {(votingDoneVolunteerFilter || votingDonePrimaryPersonFilter) && (
                    <button
                      type="button"
                      onClick={() => {
                        setVotingDoneVolunteerFilter('');
                        setVotingDonePrimaryPersonFilter('');
                      }}
                      className="px-4 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                    >
                      Clear Filters
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleRefreshVotingDone}
                    disabled={votingDoneLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {votingDoneLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    Showing: <span className="font-semibold text-purple-600">{filteredVotingDoneData.length}</span> of <span className="font-semibold text-gray-600">{votingDoneData.length}</span>
                  </span>
                </div>
              }
            />
          </div>
        )}
      </div>

      {/* In Transit Tab Panel */}
      <div
        id="tab-panel-intransit"
        role="tabpanel"
        hidden={activeTab !== "intransit"}
        className="focus:outline-none"
      >
        {activeTab === "intransit" && (
          <div className="">
            {inTransitLoading && <Loader />}
            <Withoutbtn
              data={inTransitData}
              columns={inTransitColumns}
              title="In Transit List"
              filterOptions={[]}
              searchKey="full_name"
              inputfiled={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRefreshInTransit}
                    disabled={inTransitLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-yellow-600 rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {inTransitLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  <span className="text-sm text-gray-600">
                    Total: <span className="font-semibold text-yellow-600">{inTransitData.length}</span>
                  </span>
                </div>
              }
            />
          </div>
        )}
      </div>

      {/* Edit Modal for Voter List */}
      {editModalOpen && editingVoter && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50" onClick={closeEditModal}>
          <div className="relative w-[95vw] max-w-md max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Edit Voter Details</h3>
                <p className="text-sm text-gray-500 mt-0.5">{editingVoter.full_name} ({editingVoter.Voter_Id})</p>
              </div>
              <button type="button" className="p-2 rounded-lg hover:bg-gray-200 transition-colors" onClick={closeEditModal}>
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Colony <span className="text-red-500">*</span></label>
                  <select name="Updated_colony" value={editFormData.Updated_colony} onChange={handleInputChange} disabled={loadingColonies} className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm">
                    <option value="">{loadingColonies ? 'Loading colonies...' : 'Select Colony'}</option>
                    {colonyList.map((colony) => (
                      <option key={colony.colony_id} value={String(colony.colony_id)}>{colony.colony_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">House Number <span className="text-red-500">*</span></label>
                  <input type="text" name="updated_house_number" value={editFormData.updated_house_number} onChange={handleInputChange} className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm" placeholder="Enter House Number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                  <input type="text" name="updated_mobile_no" value={editFormData.updated_mobile_no} onChange={handleInputChange} className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm" placeholder="Enter Mobile Number" maxLength={10} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button type="button" onClick={closeEditModal} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleSaveVoter} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving ? <> <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Saving... </> : <> <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> Save Changes </>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Volunteer Modal */}
      {assignVolunteerModalOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50" onClick={closeAssignVolunteerModal}>
          <div className="relative w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">Assign Volunteer</h3>
              <button type="button" className="p-2 rounded-lg hover:bg-gray-200 transition-colors" onClick={closeAssignVolunteerModal}>
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Volunteer <span className="text-red-500">*</span></label>
                  <select name="volunteer_name" value={assignFormData.volunteer_name} onChange={handleAssignVolunteerChange} className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm">
                    <option value="">Select Volunteer</option>
                    {volunteers.map((v, idx) => (
                      <option key={idx} value={v.volunteer_name}>{v.volunteer_name} {v.volunteer_mobile && `(${v.volunteer_mobile})`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Primary Person <span className="text-red-500">*</span></label>
                  <select name="primary_person_id" value={assignFormData.primary_person_id} onChange={handleAssignVolunteerChange} className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm">
                    <option value="">Select Primary Person</option>
                    {primaryPersons.map((p) => (
                      <option key={p.Voter_Id} value={p.Voter_Id}>{p.full_name} {p.ENG_Full_name && `(${p.ENG_Full_name})`} - {p.Voter_Id}</option>
                    ))}
                  </select>
                </div>
                <button type="button" onClick={handleAssignVolunteer} disabled={assigning} className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {assigning ? 'Assigning...' : 'Submit'}
                </button>
              </div>
              {assignedList.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Assigned List</h4>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 border text-left">Volunteer</th>
                          <th className="px-3 py-2 border text-left">Primary Person</th>
                          <th className="px-3 py-2 border text-left">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignedList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 border">{item.volunteer_name}</td>
                            <td className="px-3 py-2 border">{item.primary_person}</td>
                            <td className="px-3 py-2 border">{item.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Finance Add Modal */}
      {financeModalOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50" onClick={closeFinanceModal}>
          <div className="relative w-[95vw] max-w-md max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">Add Finance</h3>
              <button type="button" className="p-2 rounded-lg hover:bg-gray-200 transition-colors" onClick={closeFinanceModal}>
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Volunteer <span className="text-red-500">*</span></label>
                  <div className="relative" ref={volunteerDropdownRef}>
                    <div className="relative">
                      <input
                        type="text"
                        value={financeFormData.volunteer_name ? 
                          (volunteers.find(v => v.volunteer_name === financeFormData.volunteer_name)?.volunteer_name || "") 
                          : volunteerSearchTerm}
                        onChange={(e) => {
                          setVolunteerSearchTerm(e.target.value);
                          setVolunteerDropdownOpen(true);
                          if (!e.target.value) {
                            setFinanceFormData(prev => ({ ...prev, volunteer_name: "", primary_person_id: "" }));
                          }
                        }}
                        onFocus={() => {
                          setVolunteerDropdownOpen(true);
                          if (financeFormData.volunteer_name) {
                            setVolunteerSearchTerm("");
                          }
                        }}
                        placeholder="Search volunteer..."
                        className="w-full h-11 px-4 pr-10 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setVolunteerDropdownOpen(!volunteerDropdownOpen)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    {volunteerDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {filteredVolunteersForFinance.length > 0 ? (
                          filteredVolunteersForFinance.map((v, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                setFinanceFormData(prev => ({ ...prev, volunteer_name: v.volunteer_name }));
                                setVolunteerSearchTerm("");
                                setVolunteerDropdownOpen(false);
                              }}
                              className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${
                                financeFormData.volunteer_name === v.volunteer_name ? 'bg-blue-100' : ''
                              }`}
                            >
                              <div className="text-sm font-medium text-gray-800">{v.volunteer_name}</div>
                              {v.volunteer_mobile && (
                                <div className="text-xs text-gray-500">{v.volunteer_mobile}</div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">No volunteers found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Primary Person <span className="text-red-500">*</span></label>
                  <div className="relative" ref={primaryPersonDropdownRef}>
                    <div className="relative">
                      <input
                        type="text"
                        value={financeFormData.primary_person_id ? 
                          (filteredPrimaryPersonsForFinance.find(p => p.Voter_Id === financeFormData.primary_person_id)?.full_name || "") 
                          : primaryPersonSearchTerm}
                        onChange={(e) => {
                          setPrimaryPersonSearchTerm(e.target.value);
                          setPrimaryPersonDropdownOpen(true);
                          if (!e.target.value) {
                            setFinanceFormData(prev => ({ ...prev, primary_person_id: "" }));
                          }
                        }}
                        onFocus={() => {
                          if (financeFormData.volunteer_name) {
                            setPrimaryPersonDropdownOpen(true);
                            if (financeFormData.primary_person_id) {
                              setPrimaryPersonSearchTerm("");
                            }
                          }
                        }}
                        placeholder={financeFormData.volunteer_name ? "Search primary person..." : "Please select volunteer first"}
                        disabled={!financeFormData.volunteer_name}
                        className="w-full h-11 px-4 pr-10 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => financeFormData.volunteer_name && setPrimaryPersonDropdownOpen(!primaryPersonDropdownOpen)}
                        disabled={!financeFormData.volunteer_name}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    {primaryPersonDropdownOpen && financeFormData.volunteer_name && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {searchedPrimaryPersonsForFinance.length > 0 ? (
                          searchedPrimaryPersonsForFinance.map((p) => (
                            <div
                              key={p.Voter_Id}
                              onClick={() => {
                                setFinanceFormData(prev => ({ ...prev, primary_person_id: p.Voter_Id }));
                                setPrimaryPersonSearchTerm("");
                                setPrimaryPersonDropdownOpen(false);
                                fetchInstallmentStatus(p.Voter_Id);
                              }}
                              className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${
                                financeFormData.primary_person_id === p.Voter_Id ? 'bg-blue-100' : ''
                              }`}
                            >
                              <div className="text-sm font-medium text-gray-800">{p.full_name}</div>
                              <div className="text-xs text-gray-500">ID: {p.Voter_Id}</div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            {filteredPrimaryPersonsForFinance.length === 0 
                              ? "No primary persons found for this volunteer's colonies"
                              : "No primary persons found"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Installment <span className="text-red-500">*</span></label>
                  {loadingInstallmentStatus ? (
                    <div className="w-full h-11 px-4 rounded-lg border border-gray-300 flex items-center text-sm text-gray-500">
                      Loading installment status...
                    </div>
                  ) : availableInstallments.length > 0 ? (
                    <select 
                      name="installment" 
                      value={financeFormData.installment} 
                      onChange={handleFinanceChange} 
                      className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
                      disabled={!financeFormData.primary_person_id}
                    >
                      {availableInstallments.map((inst) => (
                        <option key={inst.value} value={inst.value}>{inst.label}</option>
                      ))}
                    </select>
                  ) : financeFormData.primary_person_id ? (
                    <div className="w-full h-11 px-4 rounded-lg border border-gray-300 flex items-center text-sm text-gray-500 bg-gray-50">
                      All installments are already paid
                    </div>
                  ) : (
                    <select 
                      name="installment" 
                      value={financeFormData.installment} 
                      onChange={handleFinanceChange} 
                      className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
                      disabled
                    >
                      <option value="">Please select primary person first</option>
                    </select>
                  )}
                </div>
                <button type="button" onClick={handleAddFinance} disabled={addingFinance} className="w-full px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50">
                  {addingFinance ? 'Adding...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voting Done Modal */}
      {votingDoneModalOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50" onClick={closeVotingDoneModal}>
          <div className="relative w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">Mark Voting Done</h3>
              <button type="button" className="p-2 rounded-lg hover:bg-gray-200 transition-colors" onClick={closeVotingDoneModal}>
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Volunteer <span className="text-red-500">*</span></label>
                  <select name="volunteer_name" value={votingDoneFormData.volunteer_name} onChange={handleVotingDoneChange} className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm">
                    <option value="">Select Volunteer</option>
                    {volunteers.map((v, idx) => (
                      <option key={idx} value={v.volunteer_name}>{v.volunteer_name} {v.volunteer_mobile && `(${v.volunteer_mobile})`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Primary Person <span className="text-red-500">*</span></label>
                  <select name="primary_person_id" value={votingDoneFormData.primary_person_id} onChange={handleVotingDoneChange} className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm">
                    <option value="">Select Primary Person</option>
                    {primaryPersons.map((p) => (
                      <option key={p.Voter_Id} value={p.Voter_Id}>{p.full_name} - {p.Voter_Id}</option>
                    ))}
                  </select>
                </div>
              </div>
              {loadingFamilyMembers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
                </div>
              ) : familyMembers.length > 0 ? (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Select Voters to Mark as Done</h4>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 border text-left w-12">
                            <input type="checkbox" checked={selectedVoters.size === familyMembers.length} onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVoters(new Set(familyMembers.map(m => m.Voter_Id)));
                              } else {
                                setSelectedVoters(new Set());
                              }
                            }} className="rounded" />
                          </th>
                          <th className="px-3 py-2 border text-left">Voter ID</th>
                          <th className="px-3 py-2 border text-left">Full Name</th>
                          <th className="px-3 py-2 border text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {familyMembers.map((member) => (
                          <tr key={member.Voter_Id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 border">
                              <input type="checkbox" checked={selectedVoters.has(member.Voter_Id)} onChange={() => handleVoterCheckboxChange(member.Voter_Id)} className="rounded" />
                            </td>
                            <td className="px-3 py-2 border font-mono text-blue-600">{member.Voter_Id}</td>
                            <td className="px-3 py-2 border">{member.full_name}</td>
                            <td className="px-3 py-2 border">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${member.voting_status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                {member.voting_status || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-3">
                    <span className="text-sm text-gray-600">Selected: {selectedVoters.size} of {familyMembers.length}</span>
                    <button type="button" onClick={handleMarkVotingDone} disabled={markingDone || selectedVoters.size === 0} className="px-4 py-2 text-sm font-medium text-white bg-pink-600 rounded-lg hover:bg-pink-700 disabled:opacity-50">
                      {markingDone ? 'Marking...' : 'Submit'}
                    </button>
                  </div>
                </div>
              ) : votingDoneFormData.primary_person_id ? (
                <div className="text-center py-12 text-gray-500">No family members found</div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoterStatusDashboard;

