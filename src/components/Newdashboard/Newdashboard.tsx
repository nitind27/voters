"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
// import { formatDate } from "@/lib/utils";
import { Column } from "../tables/tabletype";
import { Withoutbtn } from "../tables/Withoutbtn";
import { toast } from "react-toastify";
import Loader from "@/common/Loader";
import DynamicCfrCount from "@/components/common/DynamicCfrCount";
import VoterStatusDashboard from "./VoterStatusDashboard";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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

// Family wise survey colony grouped data
interface FamilyWiseColonyData {
  colony_id: string;
  colony_name: string;
  primaryPersons: FamilyWiseSurveyData[];
  primaryPersonCount: number;
  totalVoterCount: number; // Primary persons + all family members
}

// Female voter data type (from tbl_voters_search table)
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

// Family wise survey data type
interface FamilyWiseSurveyData {
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
  colony_name: string;
  user_name: string;
  family_member_count?: number;
}

// Family member detail type (for modal)
interface FamilyMemberDetail extends FamilyWiseSurveyData {
  family_member_count?: number;
}

// User data type
interface UserData {
  user_id: number;
  name: string;
  username: string;
  status: string;
}

const Newdashboard: React.FC = () => {
  const [active, setActive] = useState<"voterwisedetails" | "allvoterdetails" | "femalevoters" | "familywisesurvey" | "voterstatus">("allvoterdetails");

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

  // State for Family Wise Survey tab
  const [familyWiseSurveyData, setFamilyWiseSurveyData] = useState<FamilyWiseSurveyData[]>([]);
  const [filteredFamilyWiseData, setFilteredFamilyWiseData] = useState<FamilyWiseSurveyData[]>([]);
  const [familyWiseLoading, setFamilyWiseLoading] = useState(false);
  const [userList, setUserList] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(''); // '' means all users
  // Cache for family wise survey data (pre-fetched for performance)
  // const [isPreFetchingFamilyWise, setIsPreFetchingFamilyWise] = useState(false);

  // Family member modal state
  const [familyMemberModalOpen, setFamilyMemberModalOpen] = useState(false);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string>('');
  const [primaryPersonName, setPrimaryPersonName] = useState<string>('');
  const [familyMemberDetails, setFamilyMemberDetails] = useState<FamilyMemberDetail[]>([]);

  // Family wise colony voter modal state
  const [familyWiseColonyModalOpen, setFamilyWiseColonyModalOpen] = useState(false);
  const [selectedFamilyWiseColonyData, setSelectedFamilyWiseColonyData] = useState<FamilyWiseColonyData | null>(null);
  const [familyWiseColonyVoters, setFamilyWiseColonyVoters] = useState<FamilyWiseSurveyData[]>([]);
  const [loadingFamilyWiseColonyVoters, setLoadingFamilyWiseColonyVoters] = useState(false);
  const [familyWiseColonySearchTerm, setFamilyWiseColonySearchTerm] = useState("");

  // Primary persons modal state
  const [primaryPersonsModalOpen, setPrimaryPersonsModalOpen] = useState(false);
  const [selectedPrimaryPersonsColonyData, setSelectedPrimaryPersonsColonyData] = useState<FamilyWiseColonyData | null>(null);
  const [primaryPersonsSearchTerm, setPrimaryPersonsSearchTerm] = useState("");

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

  // Fetch user list
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const users = await response.json();
      setUserList(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load user list');
    } finally {
      setLoadingUsers(false);
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
      // First get total count
      const countRes = await fetch(`/api/voterdetailsdata/Voterdetailscounte`);
      const countData = await countRes.json();
      const totalRecords = countData.total || 0;
      
      // Fetch all data - use total count + some buffer to ensure we get all records
      const limit = Math.max(totalRecords + 100, 10000);
      const res = await fetch(`/api/voterdetailsdata/Voterdetailslist?limit=${limit}&page=1`);
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

  // Pre-fetch family wise survey data (called when component mounts or on other tabs)
  // const preFetchFamilyWiseSurveyData = async () => {
  //   // Only pre-fetch if cache is empty and not already fetching
  //   if (familyWiseSurveyData.length > 0 || isPreFetchingFamilyWise || familyWiseLoading) {
  //     return;
  //   }
    
  //   setIsPreFetchingFamilyWise(true);
  //   try {
  //     console.log("[Family Wise Survey] Pre-fetching data...");
  //     const startTime = performance.now();
      
  //     // Fetch all records in a single request with high limit
  //     const response = await fetch(`/api/familywisesurvey?page=1&limit=50000`);
  //     if (response.ok) {
  //       const result = await response.json();
  //       const data = Array.isArray(result) ? result : (result.data || []);
        
  //       // If there are more pages, fetch them
  //       if (result.pagination && result.pagination.totalPages > 1) {
  //         let allData = [...data];
  //         for (let page = 2; page <= result.pagination.totalPages; page++) {
  //           const pageResponse = await fetch(`/api/familywisesurvey?page=${page}&limit=50000`);
  //           if (pageResponse.ok) {
  //             const pageResult = await pageResponse.json();
  //             const pageData = Array.isArray(pageResult) ? pageResult : (pageResult.data || []);
  //             allData = [...allData, ...pageData];
  //           }
  //         }
  //         setFamilyWiseSurveyData(allData);
  //         setFilteredFamilyWiseData(allData);
  //         console.log(`[Family Wise Survey] Pre-fetched ${allData.length} records in ${(performance.now() - startTime).toFixed(2)}ms`);
  //       } else {
  //         setFamilyWiseSurveyData(data);
  //         setFilteredFamilyWiseData(data);
  //         console.log(`[Family Wise Survey] Pre-fetched ${data.length} records in ${(performance.now() - startTime).toFixed(2)}ms`);
  //       }
  //     }
  //   } catch (e) {
  //     console.error("[Family Wise Survey] Error pre-fetching data:", e);
  //   } finally {
  //     setIsPreFetchingFamilyWise(false);
  //   }
  // };

  // Fetch family wise survey data from the API
  const fetchFamilyWiseSurveyData = useCallback(async () => {
    const startTime = performance.now();
    console.log("[Family Wise Survey] Starting to load data...");
    setFamilyWiseLoading(true);
    try {
      // Use cached data if available, otherwise fetch
      if (familyWiseSurveyData.length > 0) {
        console.log(`[Family Wise Survey] Using cached data (${familyWiseSurveyData.length} records)`);
        setFamilyWiseLoading(false);
        return;
      }
      
      // Fetch all records by using a high limit
      let allData: FamilyWiseSurveyData[] = [];
      let currentPage = 1;
      let hasMore = true;
      
      while (hasMore) {
        const pageStart = performance.now();
        const response = await fetch(`/api/familywisesurvey?page=${currentPage}&limit=50000`);
        if (!response.ok) throw new Error('Failed to fetch family wise survey data');
        const result = await response.json();
        
        // Handle new response structure with pagination
        const pageData = Array.isArray(result) ? result : (result.data || []);
        allData = [...allData, ...pageData];
        console.log(`[Family Wise Survey] Page ${currentPage} loaded in ${(performance.now() - pageStart).toFixed(2)}ms (${pageData.length} records)`);
        
        // Check if there are more pages
        if (result.pagination) {
          hasMore = currentPage < result.pagination.totalPages;
          currentPage++;
        } else {
          // If no pagination info, assume single page
          hasMore = false;
        }
      }
      
      const totalTime = performance.now() - startTime;
      console.log(`[Family Wise Survey] Total loading time: ${totalTime.toFixed(2)}ms (${allData.length} records)`);
      setFamilyWiseSurveyData(allData);
      setFilteredFamilyWiseData(allData);
    } catch {
      toast.error('Failed to load family wise survey data');
      setFamilyWiseSurveyData([]);
      setFilteredFamilyWiseData([]);
    } finally {
      setFamilyWiseLoading(false);
    }
  }, [familyWiseSurveyData.length]);



  // Close family member modal
  const closeFamilyMemberModal = () => {
    setFamilyMemberModalOpen(false);
    setSelectedFamilyMemberId('');
    setPrimaryPersonName('');
    setFamilyMemberDetails([]);
  };

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

  // Filter family wise survey by user
  useEffect(() => {
    let filtered = familyWiseSurveyData;

    if (selectedUserId !== '') {
      filtered = filtered.filter(item => String(item.user_id) === selectedUserId);
    }

    setFilteredFamilyWiseData(filtered);
  }, [selectedUserId, familyWiseSurveyData]);

  // Group family wise survey data by colony
  const familyWiseColonyGroupedData = useMemo(() => {
    if (!filteredFamilyWiseData || filteredFamilyWiseData.length === 0) {
      return [];
    }

    const colonyMap = new Map<string, FamilyWiseSurveyData[]>();

    // Group primary persons by colony
    filteredFamilyWiseData.forEach(primaryPerson => {
      const colonyId = primaryPerson.Updated_colony || "0";
      if (!colonyMap.has(colonyId)) {
        colonyMap.set(colonyId, []);
      }
      colonyMap.get(colonyId)!.push(primaryPerson);
    });

    const result: FamilyWiseColonyData[] = [];

    colonyMap.forEach((primaryPersons, colonyId) => {
      const colony = colonyList.find(c => String(c.colony_id) === colonyId);
      const colonyName = colony?.colony_name || (colonyId === "0" ? "Not Assigned" : `Colony ID: ${colonyId}`);
      
      // Calculate total voter count: primary persons + their family members
      const totalVoterCount = primaryPersons.reduce((sum, person) => {
        const familyCount = person.family_member_count || 0;
        return sum + 1 + familyCount; // 1 for primary person + family members
      }, 0);

      result.push({
        colony_id: colonyId,
        colony_name: colonyName,
        primaryPersons: primaryPersons,
        primaryPersonCount: primaryPersons.length,
        totalVoterCount: totalVoterCount,
      });
    });

    // Sort by colony name
    return result.sort((a, b) => a.colony_name.localeCompare(b.colony_name));
  }, [filteredFamilyWiseData, colonyList]);

  // Initial load - Fetch all 3 tab APIs in parallel for fast loading
  useEffect(() => {
    // Fetch all essential data in parallel
    const loadAllData = async () => {
      try {
        // Start all API calls in parallel
        await Promise.all([
          fetchTotalCount(),
          fetchColonies(),
          fetchUsers(),
          // Fetch voter data (for Voter Details and Colony wise Voter details tabs)
          fetchVoterData(),
          // Fetch family wise survey data (for Family Wise Survey tab)
          fetchFamilyWiseSurveyData()
        ]);
        console.log("All initial data loaded successfully");
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };
    
    loadAllData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load voter data when tab is active (fallback if not loaded initially)
  useEffect(() => {
    if (active === "allvoterdetails" || active === "voterwisedetails") {
      if (voterData.length === 0 && !loading) {
        fetchVoterData();
      }
    }
    if (active === "femalevoters" && femaleVoterData.length === 0 && !femaleLoading) {
      fetchFemaleVoterData();
    }
    if (active === "familywisesurvey" && familyWiseSurveyData.length === 0 && !familyWiseLoading) {
      fetchFamilyWiseSurveyData();
    }
  }, [active, fetchVoterData, voterData.length, loading, fetchFemaleVoterData, femaleVoterData.length, femaleLoading, fetchFamilyWiseSurveyData, familyWiseSurveyData.length, familyWiseLoading]);

  // Group voters by colony
  const colonyWiseGroupedData = useMemo(() => {
    if (!voterData || voterData.length === 0) {
      return [];
    }

    const colonyMap = new Map<string, VoterDetailsData[]>();

    // Use all voter data (API already filters by updated_at IS NOT NULL)
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
      
      // Calculate unique houses - check both updated_house_number and House_Number
      // Filter out empty strings, null, undefined, and "No House"
      const houseNumbers = voters
        .map(v => {
          const houseNum = v.updated_house_number || v.House_Number;
          // Check if houseNum exists and is not empty
          if (houseNum && typeof houseNum === 'string' && houseNum.trim() !== "" && houseNum.trim() !== "No House") {
            return houseNum.trim();
          }
          return null;
        })
        .filter((houseNum): houseNum is string => houseNum !== null);
      
      const uniqueHouses = new Set(houseNumbers);

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

  // Export colony wise data to Excel
  const exportColonyWiseToExcel = async () => {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Helper function to sanitize sheet name (Excel sheet names have restrictions)
      const sanitizeSheetName = (name: string): string => {
        // Excel sheet name restrictions:
        // - Max 31 characters
        // - Cannot contain: [ ] : * ? / \
        const sanitized = name
          .replace(/[\[\]:*?\/\\]/g, '') // Remove invalid characters
          .substring(0, 31); // Limit to 31 characters
        return sanitized || 'Sheet'; // Fallback if empty
      };

      // Create one sheet per colony with detailed voter data
      colonyWiseGroupedData.forEach((colony) => {
        // Prepare detailed voter data for this colony
        const exportData = colony.voters.map((voter, idx) => ({
          'Sr No': idx + 1,
          'Full Name': voter.full_name || "N/A",
          'Father Name': voter.Father_name || "N/A",
          'Age': voter.Age || "N/A",
          'Gender': voter.Gender || "N/A",
          'House Number': voter.updated_house_number || voter.House_Number || "N/A",
          'Colony': colony.colony_name,
          'Mobile': voter.updated_mobile_no || "N/A",
          'Voter ID': voter.Voter_Id || "N/A",
          'Part No': voter.Part_No || "N/A",
          'Page No': voter.Page_NO || "N/A",
          'Publication Date': voter.Publication_Date || "N/A"
        }));

        // Create worksheet for this colony
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Set column widths
        ws['!cols'] = [
          { wch: 8 },   // Sr No
          { wch: 25 },  // Full Name
          { wch: 20 },  // Father Name
          { wch: 8 },   // Age
          { wch: 10 },  // Gender
          { wch: 15 },  // House Number
          { wch: 20 },  // Colony
          { wch: 15 },  // Mobile
          { wch: 15 },  // Voter ID
          { wch: 10 },  // Part No
          { wch: 10 },  // Page No
          { wch: 15 }   // Publication Date
        ];

        // Sanitize colony name for sheet name
        const sheetName = sanitizeSheetName(colony.colony_name);

        // Add worksheet to workbook with colony name as sheet name
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Save file
      const fileName = `Colony_Wise_Voters_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);

      toast.success(`Excel file downloaded successfully with ${colonyWiseGroupedData.length} sheets!`);
    } catch (error) {
      console.error('Error exporting colony wise data to Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  // Export colony wise data to PDF
  const exportColonyWiseToPDF = async () => {
    try {
      // Calculate totals
      const totalHouses = colonyWiseGroupedData.reduce((sum, c) => sum + c.totalHouses, 0);
      const totalVoters = colonyWiseGroupedData.reduce((sum, c) => sum + c.totalVoters, 0);

      // Create summary table rows
      const tableRows = colonyWiseGroupedData.map((colony, index) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-size: 12px; text-align: center;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 12px;">${colony.colony_name}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 12px; text-align: center;">${colony.totalHouses}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 12px; text-align: center;">${colony.totalVoters}</td>
        </tr>
      `).join('');

      // Add total row
      const totalRow = `
        <tr style="background-color: #f0f0f0; font-weight: bold;">
          <td style="padding: 8px; border: 1px solid #000; font-size: 12px; text-align: center;" colspan="2">Total</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 12px; text-align: center;">${totalHouses}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 12px; text-align: center;">${totalVoters}</td>
        </tr>
      `;

      const htmlContent = `
        <html>
          <head>
            <title>Colony Wise Voter Summary Report</title>
            <style>
              @page { size: A4 portrait; margin: 15mm; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              h1 { text-align: center; margin-bottom: 10px; font-size: 20px; font-weight: bold; }
              .info { text-align: center; margin-bottom: 20px; font-size: 14px; color: #666; }
              table { width: 100%; border-collapse: collapse; margin: 0 auto; font-size: 12px; }
              th { background-color: #4a5568; color: white; padding: 12px; border: 1px solid #000; font-weight: bold; text-align: center; }
              td { padding: 8px; border: 1px solid #000; }
              .summary-table { margin-top: 20px; }
            </style>
          </head>
          <body>
            <h1>Colony Wise Voter Summary Report</h1>
            <div class="info">
              <p>Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <p>Total Colonies: ${colonyWiseGroupedData.length}</p>
            </div>
            <table class="summary-table">
              <thead>
                <tr>
                  <th style="width: 10%;">Sr No</th>
                  <th style="width: 50%;">Colony Name</th>
                  <th style="width: 20%;">Total Houses</th>
                  <th style="width: 20%;">Total Voters</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
                ${totalRow}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Open in new window and trigger print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Wait for content to load then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };

        // Fallback: if onload doesn't fire, use setTimeout
        setTimeout(() => {
          if (printWindow && !printWindow.closed) {
            printWindow.focus();
            printWindow.print();
          }
        }, 1000);

        toast.success('PDF print dialog opened! Click print to save as PDF.');
      } else {
        toast.error('Please allow popups to download PDF');
      }
    } catch (error) {
      console.error('Error exporting colony wise data to PDF:', error);
      toast.error('Failed to export PDF file');
    }
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
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${String(data.female_survey).toLowerCase() === 'yes'
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
          }`}>
          {String(data.female_survey).toLowerCase() === 'yes' ? 'Yes' : 'No'}
        </span>
      ),
    },
  ], []);

  // Define columns for family wise survey table
  // const familyWiseColumns: Column<FamilyWiseSurveyData>[] = useMemo(() => [
  //   {
  //     key: 'user_name',
  //     label: 'User Name',
  //     accessor: 'user_name',
  //     render: (data) => (
  //       <span className="text-sm font-medium text-purple-600">{data.user_name || 'N/A'}</span>
  //     ),
  //   },
  //   {
  //     key: 'colony_name',
  //     label: 'Colony Name',
  //     accessor: 'colony_name',
  //     render: (data) => (
  //       <span className="text-sm">{data.colony_name || 'Not Assigned'}</span>
  //     ),
  //   },
  //   {
  //     key: 'House_Number',
  //     label: 'House No',
  //     accessor: 'House_Number',
  //     render: (data) => (
  //       <span className="text-sm">{data.updated_house_number || data.House_Number || 'N/A'}</span>
  //     ),
  //   },
  //   {
  //     key: 'full_name',
  //     label: 'Full Name',
  //     accessor: 'full_name',
  //     render: (data) => (
  //       <div className="flex flex-col">
  //         <span className="font-medium">{data.full_name || 'N/A'}</span>
  //         {data.ENG_Full_name && <span className="text-xs text-gray-500">English: {data.ENG_Full_name}</span>}
  //       </div>
  //     ),
  //   },
  //   {
  //     key: 'updated_mobile_no',
  //     label: 'Mobile',
  //     accessor: 'updated_mobile_no',
  //     render: (data) => (
  //       <span className="font-mono">{data.updated_mobile_no || 'N/A'}</span>
  //     ),
  //   },
  //   {
  //     key: 'Updated_photo',
  //     label: 'Photo',
  //     accessor: 'Updated_photo',
  //     render: (data) => (
  //       <div className="flex items-center">
  //         {data.Updated_photo ? (
  //           <img
  //             src={`https://voterbackend.weclocks.online/uploads/voter_photos/${data.Updated_photo}`}
  //             alt="Voter Photo"
  //             className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer"
  //             title="Click to preview"
  //             onClick={() =>
  //               setPreviewImg(`https://voterbackend.weclocks.online/uploads/voter_photos/${data.Updated_photo}`)
  //             }
  //             onError={(e) => {
  //               e.currentTarget.src = '/images/user/npimg.jpg';
  //             }}
  //           />
  //         ) : (
  //           <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
  //             <img
  //               src={`/images/user/npimg.jpg`}
  //               alt="No Photo"
  //               className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
  //             />
  //           </div>
  //         )}
  //       </div>
  //     ),
  //   },
  //   {
  //     key: 'Gender',
  //     label: 'Gender',
  //     accessor: 'Gender',
  //     render: (data) => (
  //       <span className="px-2 py-1 text-xs font-medium bg-pink-100 text-pink-700 rounded-full">
  //         {data.Gender === 'F' || data.Gender === 'Female' || data.Gender === 'female' ? 'स्त्री' : data.Gender}
  //       </span>
  //     ),
  //   },
  //   {
  //     key: 'Age',
  //     label: 'Age',
  //     accessor: 'Age',
  //     render: (data) => (
  //       <span className="text-sm">{data.Age || 'N/A'}</span>
  //     ),
  //   },
  //   {
  //     key: 'Voter_Id',
  //     label: 'Voter ID',
  //     accessor: 'Voter_Id',
  //     render: (data) => (
  //       <span className="font-mono text-blue-600 text-sm">{data.Voter_Id || 'N/A'}</span>
  //     ),
  //   },
  //   {
  //     key: 'family_member_count',
  //     label: 'Family Members',
  //     accessor: 'family_member_count',
  //     render: (data) => {
  //       const count = data.family_member_count || 0;
  //       return (
  //         <button
  //           onClick={() => openFamilyMemberModal(data.Voter_Id, data.full_name || data.ENG_Full_name || data.Voter_Id)}
  //           className={`px-3 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors ${count > 0
  //               ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
  //               : 'bg-gray-100 text-gray-500'
  //             }`}
  //           title="Click to view family members"
  //         >
  //           {count} {count === 1 ? 'Member' : 'Members'}
  //         </button>
  //       );
  //     },
  //   },
  //   {
  //     key: 'family_member',
  //     label: 'Family Member ID',
  //     accessor: 'family_member',
  //     render: (data) => (
  //       <span className="font-mono text-sm">{data.family_member || 'N/A'}</span>
  //     ),
  //   },
  // ], [openFamilyMemberModal]);

  // Calculate survey counts per user
  const userSurveyCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    familyWiseSurveyData.forEach((item) => {
      if (item.user_id) {
        counts[item.user_id] = (counts[item.user_id] || 0) + 1;
      }
    });
    return counts;
  }, [familyWiseSurveyData]);

  // Fetch all family members for a colony (primary persons + their family members)
  const fetchAllFamilyMembersForColony = useCallback(async (colonyId: string): Promise<FamilyWiseSurveyData[]> => {
    try {
      const colonyData = familyWiseColonyGroupedData.find(c => c.colony_id === colonyId);
      if (!colonyData) return [];

      const allMembers: FamilyWiseSurveyData[] = [];
      
      // For each primary person, fetch their family members
      for (const primaryPerson of colonyData.primaryPersons) {
        // Add primary person
        allMembers.push(primaryPerson);
        
        // Fetch family members
        try {
          const response = await fetch(`/api/familywisesurvey?family_member_id=${primaryPerson.Voter_Id}`);
          if (response.ok) {
            const familyMembers = await response.json();
            allMembers.push(...familyMembers);
          }
        } catch (error) {
          console.error(`Error fetching family members for ${primaryPerson.Voter_Id}:`, error);
        }
      }
      
      return allMembers;
    } catch (error) {
      console.error('Error fetching all family members for colony:', error);
      return [];
    }
  }, [familyWiseColonyGroupedData]);

  // Print family members for a specific primary person
  const printFamilyMembers = async (person: FamilyWiseSurveyData) => {
    try {
      setLoading(true);
      
      // Fetch family members for this primary person
      const response = await fetch(`/api/familywisesurvey?family_member_id=${person.Voter_Id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch family members');
      }
      
      const familyMembers: FamilyWiseSurveyData[] = await response.json();
      
      // Create list items including primary person first (bold), then family members
      const primaryPersonName = person.full_name || "Primary Person";
      const primaryPersonItem = `<p><strong>1. ${primaryPersonName}</strong></p>`;
      
      const familyListItems = familyMembers
        .filter(member => member.full_name) // Only include members with Marathi name
        .map((member, idx) => `<p>${idx + 2}. ${member.full_name}</p>`).join('');
      
      const allListItems = primaryPersonItem + familyListItems;

      const htmlContent = `
        <html>
          <head>
            <title>Family Members - ${primaryPersonName}</title>
            <style>
              @page { size: A4; margin: 20mm; orientation: portrait; }
              * { margin: 0; padding: 0; box-sizing: border-box; border: none; outline: none; text-decoration: none; }
              body { font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 40px 20px; }
              .family-list-container { display: flex; flex-direction: column; align-items: flex-start; width: 100%; max-width: 600px; }
              .family-list-container p { margin: 0; padding: 8px 0; font-size: 20px; line-height: 1.6; color: #1f2937; text-align: left; }
              .family-list-container p strong { font-weight: bold; }
              @media print {
                body { min-height: auto; padding: 20px; }
                .family-list-container p { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="family-list-container">
              ${allListItems || '<p style="color: #6b7280;">No family members found</p>'}
            </div>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // printWindow.onload = () => {
        //   setTimeout(() => {
        //     printWindow.print();
        //   }, 250);
        // };

        // setTimeout(() => {
        //   if (printWindow && !printWindow.closed) {
        //     printWindow.focus();
        //     printWindow.print();
        //   }
        // }, 1000);

        toast.success('Family members print dialog opened!');
      } else {
        toast.error('Please allow popups to print');
      }
    } catch (error) {
      console.error('Error printing family members:', error);
      toast.error('Failed to load family members for printing');
    } finally {
      setLoading(false);
    }
  };

  // Export family wise survey colony data to Excel
  const exportFamilyWiseColonyToExcel = async (colonyData: FamilyWiseColonyData) => {
    try {
      const allMembers = await fetchAllFamilyMembersForColony(colonyData.colony_id);
      
      const exportData = allMembers.map((member, idx) => ({
        'Sr No': idx + 1,
        'Voter ID': member.Voter_Id || "N/A",
        'Full Name': member.full_name || "N/A",
        'English Name': member.ENG_Full_name || "N/A",
        'Age': member.Age || "N/A",
        'Gender': member.Gender || "N/A",
        'House Number': member.updated_house_number || member.House_Number || "N/A",
        'Mobile': member.updated_mobile_no || "N/A",
        'Colony': colonyData.colony_name,
        'Primary Person ID': member.family_member || member.Voter_Id || "N/A",
        'User Name': member.user_name || "N/A",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      ws['!cols'] = [
        { wch: 8 },   // Sr No
        { wch: 15 },  // Voter ID
        { wch: 25 },  // Full Name
        { wch: 25 },  // English Name
        { wch: 8 },   // Age
        { wch: 10 },  // Gender
        { wch: 15 },  // House Number
        { wch: 15 },  // Mobile
        { wch: 20 },  // Colony
        { wch: 18 },  // Primary Person ID
        { wch: 15 },  // User Name
      ];

      const sheetName = colonyData.colony_name.replace(/[\[\]:*?\/\\]/g, '').substring(0, 31) || 'Sheet';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const fileName = `${colonyData.colony_name.replace(/[^a-zA-Z0-9]/g, '_')}_FamilyWiseSurvey_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);

      toast.success(`${colonyData.colony_name} Excel file downloaded successfully!`);
    } catch (error) {
      console.error('Error exporting family wise survey colony to Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  // Open family wise colony voter modal
  const openFamilyWiseColonyModal = async (colonyData: FamilyWiseColonyData) => {
    setSelectedFamilyWiseColonyData(colonyData);
    setFamilyWiseColonySearchTerm("");
    setFamilyWiseColonyModalOpen(true);
    setLoadingFamilyWiseColonyVoters(true);
    
    try {
      const allMembers = await fetchAllFamilyMembersForColony(colonyData.colony_id);
      setFamilyWiseColonyVoters(allMembers);
    } catch (error) {
      console.error('Error loading colony voters:', error);
      toast.error('Failed to load colony voters');
      setFamilyWiseColonyVoters([]);
    } finally {
      setLoadingFamilyWiseColonyVoters(false);
    }
  };

  // Close family wise colony voter modal
  const closeFamilyWiseColonyModal = () => {
    setFamilyWiseColonyModalOpen(false);
    setSelectedFamilyWiseColonyData(null);
    setFamilyWiseColonySearchTerm("");
    setFamilyWiseColonyVoters([]);
  };

  // Open primary persons modal
  const openPrimaryPersonsModal = (colonyData: FamilyWiseColonyData) => {
    setSelectedPrimaryPersonsColonyData(colonyData);
    setPrimaryPersonsSearchTerm("");
    setPrimaryPersonsModalOpen(true);
  };

  // Close primary persons modal
  const closePrimaryPersonsModal = () => {
    setPrimaryPersonsModalOpen(false);
    setSelectedPrimaryPersonsColonyData(null);
    setPrimaryPersonsSearchTerm("");
  };

  // Filtered primary persons in modal
  const filteredPrimaryPersons = useMemo(() => {
    if (!selectedPrimaryPersonsColonyData) return [];
    const primaryPersons = selectedPrimaryPersonsColonyData.primaryPersons;
    if (!primaryPersonsSearchTerm.trim()) return primaryPersons;

    const term = primaryPersonsSearchTerm.toLowerCase();
    return primaryPersons.filter(person => {
      return (
        (person.full_name || "").toLowerCase().includes(term) ||
        (person.Voter_Id || "").toLowerCase().includes(term) ||
        (person.updated_house_number || "").toLowerCase().includes(term) ||
        (person.updated_mobile_no || "").toLowerCase().includes(term) ||
        (person.family_member || "").toLowerCase().includes(term)
      );
    });
  }, [selectedPrimaryPersonsColonyData, primaryPersonsSearchTerm]);

  // Filtered voters in family wise colony modal
  const filteredFamilyWiseColonyVoters = useMemo(() => {
    if (!familyWiseColonyVoters || familyWiseColonyVoters.length === 0) return [];
    if (!familyWiseColonySearchTerm.trim()) return familyWiseColonyVoters;

    const term = familyWiseColonySearchTerm.toLowerCase();
    return familyWiseColonyVoters.filter(voter => {
      return (
        (voter.full_name || "").toLowerCase().includes(term) ||
        (voter.Voter_Id || "").toLowerCase().includes(term) ||
        (voter.updated_house_number || "").toLowerCase().includes(term) ||
        (voter.updated_mobile_no || "").toLowerCase().includes(term) ||
        (voter.family_member || "").toLowerCase().includes(term)
      );
    });
  }, [familyWiseColonyVoters, familyWiseColonySearchTerm]);

  // Export all family wise survey data to Excel
  const exportAllFamilyWiseToExcel = async () => {
    try {
      const wb = XLSX.utils.book_new();

      // Helper function to sanitize sheet name
      const sanitizeSheetName = (name: string): string => {
        const sanitized = name
          .replace(/[\[\]:*?\/\\]/g, '')
          .substring(0, 31);
        return sanitized || 'Sheet';
      };

      // Create one sheet per colony
      for (const colony of familyWiseColonyGroupedData) {
        const allMembers = await fetchAllFamilyMembersForColony(colony.colony_id);
        
        const exportData = allMembers.map((member, idx) => ({
          'Sr No': idx + 1,
          'Voter ID': member.Voter_Id || "N/A",
          'Full Name': member.full_name || "N/A",
          'English Name': member.ENG_Full_name || "N/A",
          'Age': member.Age || "N/A",
          'Gender': member.Gender || "N/A",
          'House Number': member.updated_house_number || member.House_Number || "N/A",
          'Mobile': member.updated_mobile_no || "N/A",
          'Colony': colony.colony_name,
          'Primary Person ID': member.family_member || member.Voter_Id || "N/A",
          'User Name': member.user_name || "N/A",
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);

        ws['!cols'] = [
          { wch: 8 }, { wch: 15 }, { wch: 25 }, { wch: 25 },
          { wch: 8 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
          { wch: 20 }, { wch: 18 }, { wch: 15 },
        ];

        const sheetName = sanitizeSheetName(colony.colony_name);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Save file
      const fileName = `All_FamilyWiseSurvey_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);

      toast.success(`Excel file downloaded successfully with ${familyWiseColonyGroupedData.length} sheets!`);
    } catch (error) {
      console.error('Error exporting all family wise survey data to Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  // Export all family wise survey data to PDF
  const exportAllFamilyWiseToPDF = async () => {
    try {
      // Calculate totals
      const totalPrimaryPersons = familyWiseColonyGroupedData.reduce((sum, c) => sum + c.primaryPersonCount, 0);
      const totalVoters = familyWiseColonyGroupedData.reduce((sum, c) => sum + c.totalVoterCount, 0);

      // Create summary table rows
      const tableRows = familyWiseColonyGroupedData.map((colony, index) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-size: 12px; text-align: center;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 12px;">${colony.colony_name}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 12px; text-align: center;">${colony.primaryPersonCount}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 12px; text-align: center;">${colony.totalVoterCount}</td>
        </tr>
      `).join('');

      // Add total row
      const totalRow = `
        <tr style="background-color: #f0f0f0; font-weight: bold;">
          <td style="padding: 8px; border: 1px solid #000; font-size: 12px; text-align: center;" colspan="2">Total</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 12px; text-align: center;">${totalPrimaryPersons}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 12px; text-align: center;">${totalVoters}</td>
        </tr>
      `;

      const htmlContent = `
        <html>
          <head>
            <title>Family Wise Survey Summary Report</title>
            <style>
              @page { size: A4 portrait; margin: 15mm; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              h1 { text-align: center; margin-bottom: 10px; font-size: 20px; font-weight: bold; }
              .info { text-align: center; margin-bottom: 20px; font-size: 14px; color: #666; }
              table { width: 100%; border-collapse: collapse; margin: 0 auto; font-size: 12px; }
              th { background-color: #4a5568; color: white; padding: 12px; border: 1px solid #000; font-weight: bold; text-align: center; }
              td { padding: 8px; border: 1px solid #000; }
              .summary-table { margin-top: 20px; }
            </style>
          </head>
          <body>
            <h1>Family Wise Survey Summary Report</h1>
            <div class="info">
              <p>Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <p>Total Colonies: ${familyWiseColonyGroupedData.length}</p>
            </div>
            <table class="summary-table">
              <thead>
                <tr>
                  <th style="width: 10%;">Sr No</th>
                  <th style="width: 50%;">Colony Name</th>
                  <th style="width: 20%;">Primary Person Count</th>
                  <th style="width: 20%;">Total Voter Count</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
                ${totalRow}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Open in new window and trigger print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Wait for content to load then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };

        // Fallback: if onload doesn't fire, use setTimeout
        setTimeout(() => {
          if (printWindow && !printWindow.closed) {
            printWindow.focus();
            printWindow.print();
          }
        }, 1000);

        toast.success('PDF print dialog opened! Click print to save as PDF.');
      } else {
        toast.error('Please allow popups to download PDF');
      }
    } catch (error) {
      console.error('Error exporting all family wise survey data to PDF:', error);
      toast.error('Failed to export PDF file');
    }
  };

  // Export family wise survey colony data to PDF
  const exportFamilyWiseColonyToPDF = async (colonyData: FamilyWiseColonyData) => {
    try {
      const allMembers = await fetchAllFamilyMembersForColony(colonyData.colony_id);
      
      const tableRows = allMembers.map((member, idx) => `
        <tr>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px; text-align: center;">${idx + 1}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${member.Voter_Id || "N/A"}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${member.full_name || "N/A"}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${member.ENG_Full_name || "N/A"}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px; text-align: center;">${member.Age || "N/A"}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px; text-align: center;">${member.Gender || "N/A"}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${member.updated_house_number || member.House_Number || "N/A"}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${member.updated_mobile_no || "N/A"}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${member.family_member || member.Voter_Id || "N/A"}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <html>
          <head>
            <title>${colonyData.colony_name} - Family Wise Survey Report</title>
            <style>
              @page { size: A4 landscape; margin: 10mm; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
              h1 { text-align: center; margin-bottom: 10px; font-size: 16px; }
              .info { text-align: center; margin-bottom: 15px; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; font-size: 8px; }
              th { background-color: #f0f0f0; padding: 4px; border: 1px solid #000; font-weight: bold; text-align: center; }
              td { padding: 4px; border: 1px solid #000; }
            </style>
          </head>
          <body>
            <h1>${colonyData.colony_name} - Family Wise Survey Report</h1>
            <div class="info">
              <p>Generated on: ${new Date().toLocaleDateString()} | Primary Persons: ${colonyData.primaryPersonCount} | Total Voters: ${colonyData.totalVoterCount}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Voter ID</th>
                  <th>Full Name</th>
                  <th>English Name</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>House No</th>
                  <th>Mobile</th>
                  <th>Primary Person ID</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
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

        setTimeout(() => {
          if (printWindow && !printWindow.closed) {
            printWindow.focus();
            printWindow.print();
          }
        }, 1000);

        toast.success(`${colonyData.colony_name} PDF print dialog opened! Click print to save as PDF.`);
      } else {
        toast.error('Please allow popups to download PDF');
      }
    } catch (error) {
      console.error('Error exporting family wise survey colony to PDF:', error);
      toast.error('Failed to export PDF file');
    }
  };

  // Sort users by survey count (descending) for dropdown
  const sortedUserList = useMemo(() => {
    return [...userList].sort((a, b) => {
      const countA = userSurveyCounts[a.user_id] || 0;
      const countB = userSurveyCounts[b.user_id] || 0;
      return countB - countA; // Descending order
    });
  }, [userList, userSurveyCounts]);

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

  // Get title based on active tab
  const getTabTitle = () => {
    switch (active) {
      case "allvoterdetails":
        return "Voter Details";
      case "voterwisedetails":
        return "Colony Wise Voter Details";
      case "femalevoters":
        return "Male Female Voters";
      case "familywisesurvey":
        return "Family Wise Survey";
      // case "voterstatus":
      //   return "Voter Status";
      default:
        return "Total Voters";
    }
  };

  return (
    <div className="">
      {/* Dynamic Count Display */}
      <div className="mb-5">
        <DynamicCfrCount
          title={getTabTitle()}
          tabType={active === "voterstatus" ? undefined : active}
          refreshInterval={3000}
        />
      </div>

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
        {/* <button
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
        </button> */}
        <button
          type="button"
          role="tab"
          aria-selected={active === "familywisesurvey"}
          aria-controls="tab-panel-familywisesurvey"
          onClick={() => setActive("familywisesurvey")}
          className={`h-11 rounded-lg text-sm font-medium transition-colors
            ${active === "familywisesurvey"
              ? "bg-blue-600 text-white shadow"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}
        >
          Family Wise Survey
        </button>
        {/* <button
          type="button"
          role="tab"
          aria-selected={active === "voterstatus"}
          aria-controls="tab-panel-voterstatus"
          onClick={() => setActive("voterstatus")}
          className={`h-11 rounded-lg text-sm font-medium transition-colors
            ${active === "voterstatus"
              ? "bg-indigo-600 text-white shadow"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}
        >
          Voter Status
        </button> */}

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
                  onClick={exportColonyWiseToExcel}
                  disabled={loading || colonyWiseGroupedData.length === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Export to Excel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel
                </button>
                <button
                  onClick={exportColonyWiseToPDF}
                  disabled={loading || colonyWiseGroupedData.length === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Export to PDF"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF
                </button>
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
                      <th className="px-3 py-2 border text-left">Export</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colonyWiseGroupedData.length === 0 ? (
                      <tr>
                        <td className="px-3 py-2 border" colSpan={5}>
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
                          <td className="px-3 py-2 border">
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  try {
                                    const exportData = colony.voters.map((voter, idx) => ({
                                      'Sr No': idx + 1,
                                      'Full Name': voter.full_name || "N/A",
                                      'Father Name': voter.Father_name || "N/A",
                                      'Age': voter.Age || "N/A",
                                      'Gender': voter.Gender || "N/A",
                                      'House Number': voter.updated_house_number || voter.House_Number || "N/A",
                                      'Mobile': voter.updated_mobile_no || "N/A",
                                      'Voter ID': voter.Voter_Id || "N/A",
                                      'Part No': voter.Part_No || "N/A",
                                      'Page No': voter.Page_NO || "N/A"
                                    }));

                                    const wb = XLSX.utils.book_new();
                                    const ws = XLSX.utils.json_to_sheet(exportData);

                                    ws['!cols'] = [
                                      { wch: 8 }, { wch: 25 }, { wch: 20 }, { wch: 8 },
                                      { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
                                      { wch: 10 }, { wch: 10 }
                                    ];

                                    const sheetName = colony.colony_name.replace(/[\[\]:*?\/\\]/g, '').substring(0, 31) || 'Sheet';
                                    XLSX.utils.book_append_sheet(wb, ws, sheetName);

                                    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                                    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

                                    const fileName = `${colony.colony_name.replace(/[^a-zA-Z0-9]/g, '_')}_Voters_${new Date().toISOString().split('T')[0]}.xlsx`;
                                    saveAs(data, fileName);

                                    toast.success(`${colony.colony_name} Excel file downloaded successfully!`);
                                  } catch (error) {
                                    console.error('Error exporting colony to Excel:', error);
                                    toast.error('Failed to export Excel file');
                                  }
                                }}
                                className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                                title="Export to Excel"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  try {
                                    // Create HTML content for single colony
                                    const tableRows = colony.voters.map((voter, idx) => `
                                      <tr>
                                        <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${idx + 1}</td>
                                        <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.full_name || "N/A"}</td>
                                        <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.Father_name || "N/A"}</td>
                                        <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.Age || "N/A"}</td>
                                        <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.Gender || "N/A"}</td>
                                        <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.updated_house_number || voter.House_Number || "N/A"}</td>
                                        <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.updated_mobile_no || "N/A"}</td>
                                        <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.Voter_Id || "N/A"}</td>
                                      </tr>
                                    `).join('');

                                    const htmlContent = `
                                      <html>
                                        <head>
                                          <title>${colony.colony_name} - Voters Report</title>
                                          <style>
                                            @page { size: A4 landscape; margin: 10mm; }
                                            body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
                                            h1 { text-align: center; margin-bottom: 10px; font-size: 16px; }
                                            .info { text-align: center; margin-bottom: 15px; font-size: 12px; }
                                            table { width: 100%; border-collapse: collapse; font-size: 8px; }
                                            th { background-color: #f0f0f0; padding: 4px; border: 1px solid #000; font-weight: bold; }
                                            td { padding: 4px; border: 1px solid #000; }
                                          </style>
                                        </head>
                                        <body>
                                          <h1>${colony.colony_name} - Voters Report</h1>
                                          <div class="info">
                                            <p>Generated on: ${new Date().toLocaleDateString()} | Total Voters: ${colony.totalVoters}</p>
                                          </div>
                                          <table>
                                            <thead>
                                              <tr>
                                                <th>Sr</th>
                                                <th>Full Name</th>
                                                <th>Father Name</th>
                                                <th>Age</th>
                                                <th>Gender</th>
                                                <th>House No</th>
                                                <th>Mobile</th>
                                                <th>Voter ID</th>
                                              </tr>
                                            </thead>
                                            <tbody>${tableRows}</tbody>
                                          </table>
                                        </body>
                                      </html>
                                    `;

                                    const printWindow = window.open('', '_blank');
                                    if (printWindow) {
                                      printWindow.document.write(htmlContent);
                                      printWindow.document.close();

                                      // Wait for content to load then print
                                      printWindow.onload = () => {
                                        setTimeout(() => {
                                          printWindow.print();
                                        }, 250);
                                      };

                                      // Fallback: if onload doesn't fire, use setTimeout
                                      setTimeout(() => {
                                        if (printWindow && !printWindow.closed) {
                                          printWindow.focus();
                                          printWindow.print();
                                        }
                                      }, 1000);

                                      toast.success(`${colony.colony_name} PDF print dialog opened! Click print to save as PDF.`);
                                    } else {
                                      toast.error('Please allow popups to download PDF');
                                    }
                                  } catch (error) {
                                    console.error('Error exporting colony to PDF:', error);
                                    toast.error('Failed to export PDF file');
                                  }
                                }}
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                title="Export to PDF"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
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
                        <td className="px-3 py-2 border"></td>
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

      {/* Family Wise Survey Tab Panel */}
      <div
        id="tab-panel-familywisesurvey"
        role="tabpanel"
        hidden={active !== "familywisesurvey"}
        className="focus:outline-none"
      >
        {active === "familywisesurvey" && (
          <div className="bg-white rounded-2xl shadow-md border p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Family Wise Survey - Colony Wise
              </h2>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2">
                  <select
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                    disabled={loadingUsers}
                    className="h-11 w-full md:w-64 rounded-lg border px-4 py-2 text-sm"
                  >
                    <option value="">
                      {loadingUsers ? 'Loading users...' : 'All Users'}
                    </option>
                    {sortedUserList.map((user) => (
                      <option key={user.user_id} value={String(user.user_id)}>
                        {user.name} ({userSurveyCounts[user.user_id] || 0} surveys)
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-nowrap"
                    onClick={() => setSelectedUserId('')}
                    disabled={loadingUsers}
                  >
                    Clear Filter
                  </button>
                </div>
                <button
                  onClick={exportAllFamilyWiseToExcel}
                  disabled={familyWiseLoading || familyWiseColonyGroupedData.length === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Export All to Excel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel All
                </button>
                <button
                  onClick={exportAllFamilyWiseToPDF}
                  disabled={familyWiseLoading || familyWiseColonyGroupedData.length === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Export All to PDF"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF All
                </button>
                <button
                  onClick={fetchFamilyWiseSurveyData}
                  disabled={familyWiseLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {familyWiseLoading ? "Loading..." : "Refresh"}
                </button>
                {familyWiseColonyGroupedData.length > 0 && (
                  <span className="text-sm text-gray-600">
                    Total Colonies: <span className="font-semibold text-purple-600">{familyWiseColonyGroupedData.length}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Table */}
            {familyWiseLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 border text-left">Sr</th>
                      <th className="px-3 py-2 border text-left">Colony</th>
                      <th className="px-3 py-2 border text-left">Primary Person Count</th>
                      <th className="px-3 py-2 border text-left">Total Voter Count</th>
                      <th className="px-3 py-2 border text-left">Export</th>
                    </tr>
                  </thead>
                  <tbody>
                    {familyWiseColonyGroupedData.length === 0 ? (
                      <tr>
                        <td className="px-3 py-2 border" colSpan={5}>
                          No data found
                        </td>
                      </tr>
                    ) : (
                      familyWiseColonyGroupedData.map((colony, idx) => (
                        <tr key={colony.colony_id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 border">{idx + 1}</td>
                          <td className="px-3 py-2 border font-medium">{colony.colony_name}</td>
                          <td className="px-3 py-2 border text-center">
                            <button
                              onClick={() => openPrimaryPersonsModal(colony)}
                              className="font-semibold text-blue-600 underline hover:text-blue-800 cursor-pointer"
                              title="Click to view primary persons"
                            >
                              {colony.primaryPersonCount}
                            </button>
                          </td>
                          <td className="px-3 py-2 border text-center">
                            <button
                              onClick={() => openFamilyWiseColonyModal(colony)}
                              className="font-semibold text-purple-600 underline hover:text-purple-800 cursor-pointer"
                              title="Click to view all voters"
                            >
                              {colony.totalVoterCount}
                            </button>
                          </td>
                          <td className="px-3 py-2 border">
                            <div className="flex gap-1">
                              <button
                                onClick={() => exportFamilyWiseColonyToExcel(colony)}
                                className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                                title="Export to Excel"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => exportFamilyWiseColonyToPDF(colony)}
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                title="Export to PDF"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {familyWiseColonyGroupedData.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-100 font-semibold">
                        <td className="px-3 py-2 border" colSpan={2}>Total</td>
                        <td className="px-3 py-2 border text-center">
                          {familyWiseColonyGroupedData.reduce((sum, c) => sum + c.primaryPersonCount, 0)}
                        </td>
                        <td className="px-3 py-2 border text-center">
                          {familyWiseColonyGroupedData.reduce((sum, c) => sum + c.totalVoterCount, 0)}
                        </td>
                        <td className="px-3 py-2 border"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Voter Status Tab Panel */}
      <div
        id="tab-panel-voterstatus"
        role="tabpanel"
        hidden={active !== "voterstatus"}
        className="focus:outline-none"
      >
        {active === "voterstatus" && (
          <div className="">
            <VoterStatusDashboard />
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

      {/* Family Member Details Modal */}
      {familyMemberModalOpen && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={closeFamilyMemberModal}
        >
          <div
            className="relative w-[95vw] max-w-6xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Family Members of {primaryPersonName || selectedFamilyMemberId}
                </h3>
                <p className="text-sm text-gray-500">
                  Primary Person ID: {selectedFamilyMemberId} | Total Family Members: {familyMemberDetails.length}
                </p>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                onClick={closeFamilyMemberModal}
                aria-label="Close"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 border text-left">Sr</th>
                      <th className="px-3 py-2 border text-left">Photo</th>
                      <th className="px-3 py-2 border text-left">Voter ID</th>
                      <th className="px-3 py-2 border text-left">Full Name</th>
                      <th className="px-3 py-2 border text-left">English Name</th>
                      <th className="px-3 py-2 border text-left">Age</th>
                      <th className="px-3 py-2 border text-left">Gender</th>
                      <th className="px-3 py-2 border text-left">House No</th>
                      <th className="px-3 py-2 border text-left">Mobile</th>
                      <th className="px-3 py-2 border text-left">Colony</th>
                      <th className="px-3 py-2 border text-left">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {familyMemberDetails.length === 0 ? (
                      <tr>
                        <td className="px-3 py-2 border text-center" colSpan={11}>
                          No family members found
                        </td>
                      </tr>
                    ) : (
                      familyMemberDetails.map((member, idx) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 border">{idx + 1}</td>
                          <td className="px-3 py-2 border">
                            {member.Updated_photo ? (
                              <img
                                src={`https://voterbackend.weclocks.online/uploads/voter_photos/${member.Updated_photo}`}
                                alt="Voter Photo"
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer"
                                onClick={() =>
                                  setPreviewImg(`https://voterbackend.weclocks.online/uploads/voter_photos/${member.Updated_photo}`)
                                }
                                onError={(e) => {
                                  e.currentTarget.src = '/images/user/npimg.jpg';
                                }}
                              />
                            ) : (
                              <img
                                src="/images/user/npimg.jpg"
                                alt="No Photo"
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2 border font-mono text-blue-600">{member.Voter_Id || "N/A"}</td>
                          <td className="px-3 py-2 border font-medium">{member.full_name || "N/A"}</td>
                          <td className="px-3 py-2 border">{member.ENG_Full_name || "N/A"}</td>
                          <td className="px-3 py-2 border">{member.Age || "N/A"}</td>
                          <td className="px-3 py-2 border">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${member.Gender === "M" || member.Gender === "Male"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-pink-100 text-pink-700"
                              }`}>
                              {member.Gender || "N/A"}
                            </span>
                          </td>
                          <td className="px-3 py-2 border">{member.updated_house_number || member.House_Number || "N/A"}</td>
                          <td className="px-3 py-2 border font-mono">{member.updated_mobile_no || "N/A"}</td>
                          <td className="px-3 py-2 border">{member.colony_name || "N/A"}</td>
                          <td className="px-3 py-2 border text-purple-600">{member.user_name || "N/A"}</td>
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
                onClick={closeFamilyMemberModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Family Wise Colony Voters Modal */}
      {familyWiseColonyModalOpen && selectedFamilyWiseColonyData && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={closeFamilyWiseColonyModal}
        >
          <div
            className="relative w-[95vw] max-w-6xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {selectedFamilyWiseColonyData.colony_name} - All Voters
                </h3>
                <p className="text-sm text-gray-500">
                  Primary Persons: {selectedFamilyWiseColonyData.primaryPersonCount} | Total Voters: {selectedFamilyWiseColonyData.totalVoterCount}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportFamilyWiseColonyToExcel(selectedFamilyWiseColonyData)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                  title="Export to Excel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel
                </button>
                <button
                  onClick={() => exportFamilyWiseColonyToPDF(selectedFamilyWiseColonyData)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                  title="Export to PDF"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF
                </button>
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={closeFamilyWiseColonyModal}
                  aria-label="Close"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search Box */}
            <div className="px-6 py-3 border-b">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, voter ID, house number, mobile, primary person ID..."
                  value={familyWiseColonySearchTerm}
                  onChange={(e) => setFamilyWiseColonySearchTerm(e.target.value)}
                  className="w-full h-10 px-4 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {familyWiseColonySearchTerm && (
                <p className="text-sm text-gray-600 mt-2">
                  Showing {filteredFamilyWiseColonyVoters.length} of {selectedFamilyWiseColonyData.totalVoterCount} voters
                </p>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {loadingFamilyWiseColonyVoters ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 border text-left">Sr</th>
                      <th className="px-3 py-2 border text-left">Photo</th>
                      <th className="px-3 py-2 border text-left">Voter ID</th>
                      <th className="px-3 py-2 border text-left">Full Name</th>
                      <th className="px-3 py-2 border text-left">English Name</th>
                      <th className="px-3 py-2 border text-left">Age</th>
                      <th className="px-3 py-2 border text-left">Gender</th>
                      <th className="px-3 py-2 border text-left">House No</th>
                      <th className="px-3 py-2 border text-left">Mobile</th>
                      <th className="px-3 py-2 border text-left">Primary Person ID</th>
                      <th className="px-3 py-2 border text-left">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFamilyWiseColonyVoters.length === 0 ? (
                      <tr>
                        <td className="px-3 py-2 border text-center" colSpan={11}>
                          {familyWiseColonySearchTerm ? "No voters found matching your search" : "No voters found"}
                        </td>
                      </tr>
                    ) : (
                      filteredFamilyWiseColonyVoters.map((voter, idx) => (
                        <tr key={voter.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 border">{idx + 1}</td>
                          <td className="px-3 py-2 border">
                            {voter.Updated_photo ? (
                              <img
                                src={`https://voterbackend.weclocks.online/uploads/voter_photos/${voter.Updated_photo}`}
                                alt="Voter Photo"
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer"
                                onClick={() =>
                                  setPreviewImg(`https://voterbackend.weclocks.online/uploads/voter_photos/${voter.Updated_photo}`)
                                }
                                onError={(e) => {
                                  e.currentTarget.src = '/images/user/npimg.jpg';
                                }}
                              />
                            ) : (
                              <img
                                src="/images/user/npimg.jpg"
                                alt="No Photo"
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2 border font-mono text-blue-600">{voter.Voter_Id || "N/A"}</td>
                          <td className="px-3 py-2 border font-medium">{voter.full_name || "N/A"}</td>
                          <td className="px-3 py-2 border">{voter.ENG_Full_name || "N/A"}</td>
                          <td className="px-3 py-2 border">{voter.Age || "N/A"}</td>
                          <td className="px-3 py-2 border">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${voter.Gender === "M" || voter.Gender === "Male"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-pink-100 text-pink-700"
                              }`}>
                              {voter.Gender || "N/A"}
                            </span>
                          </td>
                          <td className="px-3 py-2 border">{voter.updated_house_number || voter.House_Number || "N/A"}</td>
                          <td className="px-3 py-2 border font-mono">{voter.updated_mobile_no || "N/A"}</td>
                          <td className="px-3 py-2 border font-mono text-purple-600">{voter.family_member || voter.Voter_Id || "N/A"}</td>
                          <td className="px-3 py-2 border text-purple-600">{voter.user_name || "N/A"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={closeFamilyWiseColonyModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Persons Modal */}
      {primaryPersonsModalOpen && selectedPrimaryPersonsColonyData && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={closePrimaryPersonsModal}
        >
          <div
            className="relative w-[95vw] max-w-6xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {selectedPrimaryPersonsColonyData.colony_name} - Primary Persons
                </h3>
                <p className="text-sm text-gray-500">
                  Total Primary Persons: {selectedPrimaryPersonsColonyData.primaryPersonCount}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    try {
                      const exportData = selectedPrimaryPersonsColonyData.primaryPersons.map((person, idx) => ({
                        'Sr No': idx + 1,
                        'Voter ID': person.Voter_Id || "N/A",
                        'Full Name': person.full_name || "N/A",
                        'English Name': person.ENG_Full_name || "N/A",
                        'Age': person.Age || "N/A",
                        'Gender': person.Gender || "N/A",
                        'House Number': person.updated_house_number || person.House_Number || "N/A",
                        'Mobile': person.updated_mobile_no || "N/A",
                        'Colony': selectedPrimaryPersonsColonyData.colony_name,
                        'Family Member Count': person.family_member_count || 0,
                        'User Name': person.user_name || "N/A",
                      }));

                      const wb = XLSX.utils.book_new();
                      const ws = XLSX.utils.json_to_sheet(exportData);

                      ws['!cols'] = [
                        { wch: 8 }, { wch: 15 }, { wch: 25 }, { wch: 25 },
                        { wch: 8 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
                        { wch: 20 }, { wch: 18 }, { wch: 15 },
                      ];

                      const sheetName = selectedPrimaryPersonsColonyData.colony_name.replace(/[\[\]:*?\/\\]/g, '').substring(0, 31) || 'Sheet';
                      XLSX.utils.book_append_sheet(wb, ws, sheetName);

                      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

                      const fileName = `${selectedPrimaryPersonsColonyData.colony_name.replace(/[^a-zA-Z0-9]/g, '_')}_PrimaryPersons_${new Date().toISOString().split('T')[0]}.xlsx`;
                      saveAs(data, fileName);

                      toast.success(`${selectedPrimaryPersonsColonyData.colony_name} Primary Persons Excel file downloaded successfully!`);
                    } catch (error) {
                      console.error('Error exporting primary persons to Excel:', error);
                      toast.error('Failed to export Excel file');
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                  title="Export to Excel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel
                </button>
                <button
                  onClick={() => {
                    try {
                      const tableRows = selectedPrimaryPersonsColonyData.primaryPersons.map((person, idx) => `
                        <tr>
                          <td style="padding: 4px; border: 1px solid #000; font-size: 9px; text-align: center;">${idx + 1}</td>
                          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${person.Voter_Id || "N/A"}</td>
                          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${person.full_name || "N/A"}</td>
                          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${person.ENG_Full_name || "N/A"}</td>
                          <td style="padding: 4px; border: 1px solid #000; font-size: 9px; text-align: center;">${person.Age || "N/A"}</td>
                          <td style="padding: 4px; border: 1px solid #000; font-size: 9px; text-align: center;">${person.Gender || "N/A"}</td>
                          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${person.updated_house_number || person.House_Number || "N/A"}</td>
                          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${person.updated_mobile_no || "N/A"}</td>
                          <td style="padding: 4px; border: 1px solid #000; font-size: 9px; text-align: center;">${person.family_member_count || 0}</td>
                        </tr>
                      `).join('');

                      const htmlContent = `
                        <html>
                          <head>
                            <title>${selectedPrimaryPersonsColonyData.colony_name} - Primary Persons Report</title>
                            <style>
                              @page { size: A4 landscape; margin: 10mm; }
                              body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
                              h1 { text-align: center; margin-bottom: 10px; font-size: 16px; }
                              .info { text-align: center; margin-bottom: 15px; font-size: 12px; }
                              table { width: 100%; border-collapse: collapse; font-size: 8px; }
                              th { background-color: #f0f0f0; padding: 4px; border: 1px solid #000; font-weight: bold; text-align: center; }
                              td { padding: 4px; border: 1px solid #000; }
                            </style>
                          </head>
                          <body>
                            <h1>${selectedPrimaryPersonsColonyData.colony_name} - Primary Persons Report</h1>
                            <div class="info">
                              <p>Generated on: ${new Date().toLocaleDateString()} | Total Primary Persons: ${selectedPrimaryPersonsColonyData.primaryPersonCount}</p>
                            </div>
                            <table>
                              <thead>
                                <tr>
                                  <th>Sr</th>
                                  <th>Voter ID</th>
                                  <th>Full Name</th>
                                  <th>English Name</th>
                                  <th>Age</th>
                                  <th>Gender</th>
                                  <th>House No</th>
                                  <th>Mobile</th>
                                  <th>Family Members</th>
                                </tr>
                              </thead>
                              <tbody>${tableRows}</tbody>
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

                        setTimeout(() => {
                          if (printWindow && !printWindow.closed) {
                            printWindow.focus();
                            printWindow.print();
                          }
                        }, 1000);

                        toast.success(`${selectedPrimaryPersonsColonyData.colony_name} PDF print dialog opened! Click print to save as PDF.`);
                      } else {
                        toast.error('Please allow popups to download PDF');
                      }
                    } catch (error) {
                      console.error('Error exporting primary persons to PDF:', error);
                      toast.error('Failed to export PDF file');
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                  title="Export to PDF"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF
                </button>
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={closePrimaryPersonsModal}
                  aria-label="Close"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search Box */}
            <div className="px-6 py-3 border-b">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, voter ID, house number, mobile, primary person ID..."
                  value={primaryPersonsSearchTerm}
                  onChange={(e) => setPrimaryPersonsSearchTerm(e.target.value)}
                  className="w-full h-10 px-4 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {primaryPersonsSearchTerm && (
                <p className="text-sm text-gray-600 mt-2">
                  Showing {filteredPrimaryPersons.length} of {selectedPrimaryPersonsColonyData.primaryPersonCount} primary persons
                </p>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 border text-left">Sr</th>
                    <th className="px-3 py-2 border text-left">Photo</th>
                    <th className="px-3 py-2 border text-left">Voter ID</th>
                    <th className="px-3 py-2 border text-left">Full Name</th>
                    <th className="px-3 py-2 border text-left">English Name</th>
                    <th className="px-3 py-2 border text-left">Age</th>
                    <th className="px-3 py-2 border text-left">Gender</th>
                    <th className="px-3 py-2 border text-left">House No</th>
                    <th className="px-3 py-2 border text-left">Mobile</th>
                    <th className="px-3 py-2 border text-left">Family Members</th>
                    <th className="px-3 py-2 border text-left">User</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrimaryPersons.length === 0 ? (
                    <tr>
                      <td className="px-3 py-2 border text-center" colSpan={11}>
                        {primaryPersonsSearchTerm ? "No primary persons found matching your search" : "No primary persons found"}
                      </td>
                    </tr>
                  ) : (
                    filteredPrimaryPersons.map((person, idx) => (
                      <tr key={person.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 border">{idx + 1}</td>
                        <td className="px-3 py-2 border">
                          {person.Updated_photo ? (
                            <img
                              src={`https://voterbackend.weclocks.online/uploads/voter_photos/${person.Updated_photo}`}
                              alt="Voter Photo"
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer"
                              onClick={() =>
                                setPreviewImg(`https://voterbackend.weclocks.online/uploads/voter_photos/${person.Updated_photo}`)
                              }
                              onError={(e) => {
                                e.currentTarget.src = '/images/user/npimg.jpg';
                              }}
                            />
                          ) : (
                            <img
                              src="/images/user/npimg.jpg"
                              alt="No Photo"
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2 border font-mono text-blue-600">{person.Voter_Id || "N/A"}</td>
                        <td className="px-3 py-2 border font-medium">{person.full_name || "N/A"}</td>
                        <td className="px-3 py-2 border">{person.ENG_Full_name || "N/A"}</td>
                        <td className="px-3 py-2 border">{person.Age || "N/A"}</td>
                        <td className="px-3 py-2 border">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${person.Gender === "M" || person.Gender === "Male"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-pink-100 text-pink-700"
                            }`}>
                            {person.Gender || "N/A"}
                          </span>
                        </td>
                        <td className="px-3 py-2 border">{person.updated_house_number || person.House_Number || "N/A"}</td>
                        <td className="px-3 py-2 border font-mono">{person.updated_mobile_no || "N/A"}</td>
                        <td className="px-3 py-2 border">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full whitespace-nowrap">
                              {person.family_member_count || 0}
                            </span>
                            {(person.family_member_count || 0) > 0 && (
                              <button
                                onClick={() => printFamilyMembers(person)}
                                disabled={loading}
                                className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Print Family Members"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 border text-blue-600">{person.user_name || "N/A"}</td>
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
                onClick={closePrimaryPersonsModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
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
