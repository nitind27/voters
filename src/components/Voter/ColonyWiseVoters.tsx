"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { colonyentrydatatype, voterdayatype } from "./Votertype";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import VoterEditModal from "./VoterEditModal";
import { PencilIcon, TrashBinIcon } from "@/icons";
import VoterAddModal from "./VoterAddModal";


type Props = {
  colonyentry: colonyentrydatatype[];
  voterentry: voterdayatype[];
};

type ColonyData = {
  colony_id: number;
  colony_name: string;
  status: string;
};

type HouseData = {
  house_number: string;
  count: number;
  voters: voterdayatype[];
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
  const [activeTab, setActiveTab] = useState<'individual' | 'family'>('individual');
  const [houseData, setHouseData] = useState<HouseData[]>([]);
  const [colonyid, setcolonyid] = useState("");
  const [selectedHouseNumber, setSelectedHouseNumber] = useState<string>("");
  const [houseVoters, setHouseVoters] = useState<voterdayatype[]>([]);
  const [isHouseModalOpen, setIsHouseModalOpen] = useState(false);
  const [houseSearchTerm, setHouseSearchTerm] = useState("");
  const [houseModalSearchTerm, setHouseModalSearchTerm] = useState("");

  // NEW: transient highlight state for house cards (flash on add/update)
  const [flashHouses, setFlashHouses] = useState<Set<string>>(new Set());
  const flashTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const triggerHouseFlash = (houseNumber: string, duration = 2000) => {
    if (!houseNumber) return;
    setFlashHouses(prev => {
      const next = new Set(prev);
      next.add(houseNumber);
      return next;
    });
    if (flashTimersRef.current[houseNumber]) {
      clearTimeout(flashTimersRef.current[houseNumber]);
    }
    flashTimersRef.current[houseNumber] = setTimeout(() => {
      setFlashHouses(prev => {
        const next = new Set(prev);
        next.delete(houseNumber);
        return next;
      });
      delete flashTimersRef.current[houseNumber];
    }, duration);
  };

  useEffect(() => {
    return () => {
      Object.values(flashTimersRef.current).forEach(clearTimeout);
      flashTimersRef.current = {};
    };
  }, []);

  // NEW: edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editVoter, setEditVoter] = useState<voterdayatype | null>(null);
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

  // Filter voters based on search term and sort by house number
  const filteredColonyVoters = useMemo(() => {
    let filtered = colonyVoters;

    // Apply search filter if search term exists
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = colonyVoters.filter((voter) => {
        const fullName = (voter.full_name ||
          [voter.first_name, voter.middle_name, voter.last_name].filter(Boolean).join(" ")).toLowerCase();
        const fullNameMr = (voter.full_name_mr || "").toLowerCase();
        const houseNumber = (voter.house_number || "").toLowerCase();
        const voterNumber = (voter.voter_number || "").toLowerCase();
        const mobile = (voter.mobile || "").toLowerCase();
        const boothNumber = (voter.booth_number || "").toLowerCase();
        return fullName.includes(term) || fullNameMr.includes(term) || houseNumber.includes(term) ||
          voterNumber.includes(term) || mobile.includes(term) || boothNumber.includes(term);
      });
    }

    // Sort by house number in ascending order
    return filtered.sort((a, b) => {
      const aHouseNum = a.house_number || '';
      const bHouseNum = b.house_number || '';

      // Try to parse as numbers first
      const aNum = parseInt(aHouseNum);
      const bNum = parseInt(bHouseNum);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }

      // If not numbers, sort alphabetically
      return aHouseNum.localeCompare(bHouseNum);
    });
  }, [colonyVoters, searchTerm]);

  const filteredHouseData = useMemo(() => {
    if (!houseSearchTerm.trim()) return houseData;
    const term = houseSearchTerm.toLowerCase();
    return houseData.filter(h =>
      (h.house_number || "").toLowerCase().includes(term) ||
      h.voters.some(v => {
        const fullName = (v.full_name || [v.first_name, v.middle_name, v.last_name].filter(Boolean).join(" ")).toLowerCase();
        return fullName.includes(term) ||
          (v.mobile || "").toLowerCase().includes(term) ||
          (v.booth_number || "").toLowerCase().includes(term);
      })
    );
  }, [houseData, houseSearchTerm]);

  const filteredHouseModalVoters = useMemo(() => {
    let list = houseVoters;

    if (houseModalSearchTerm.trim()) {
      const term = houseModalSearchTerm.toLowerCase();
      list = houseVoters.filter(v => {
        const fullName = (v.full_name || [v.first_name, v.middle_name, v.last_name].filter(Boolean).join(" ")).toLowerCase();
        return fullName.includes(term) ||
          (v.voter_number || "").toLowerCase().includes(term) ||
          (v.mobile || "").toLowerCase().includes(term) ||
          (v.booth_number || "").toLowerCase().includes(term) ||
          (v.gender || "").toLowerCase().includes(term) ||
          (v.relation || "").toLowerCase().includes(term);
      });
    }

    // Sort so "Primary Person" shows first
    return [...list].sort((a, b) => {
      const aIsPrimary = (a.relation || "").toLowerCase() === "primary person";
      const bIsPrimary = (b.relation || "").toLowerCase() === "primary person";
      if (aIsPrimary && !bIsPrimary) return -1;
      if (!aIsPrimary && bIsPrimary) return 1;
      return 0;
    });
  }, [houseVoters, houseModalSearchTerm]);
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
    setcolonyid(colonyId)
    const list = votersByColonyId.get(colonyId) || [];
    setColonyVoters(list);
    setSearchTerm("");
    setActiveTab('individual');
    setHouseSearchTerm("");
    // ... existing houseData prep ...


    // Prepare house data for family tab
    const houseMap = new Map<string, voterdayatype[]>();
    list.forEach(voter => {
      const houseNum = voter.house_number || 'No House Number';
      if (!houseMap.has(houseNum)) {
        houseMap.set(houseNum, []);
      }
      houseMap.get(houseNum)!.push(voter);
    });

    const houseDataArray: HouseData[] = Array.from(houseMap.entries())
      .map(([house_number, voters]) => ({
        house_number,
        count: voters.length,
        voters
      }))
      .sort((a, b) => {
        // Sort by house number (handle numeric and non-numeric)
        const aNum = parseInt(a.house_number);
        const bNum = parseInt(b.house_number);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return a.house_number.localeCompare(b.house_number);
      });

    setHouseData(houseDataArray);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedColonyName("");
    setColonyVoters([]);
    setSearchTerm("");
    setHouseData([]);
    setHouseSearchTerm("");
    setActiveTab('individual');
  };

  const openHouseModal = (houseNumber: string, voters: voterdayatype[]) => {
    setSelectedHouseNumber(houseNumber);
    setHouseVoters(voters);
    setHouseModalSearchTerm("");
    setIsHouseModalOpen(true);
  };
  const closeHouseModal = () => {
    setIsHouseModalOpen(false);
    setSelectedHouseNumber("");
    setHouseVoters([]);
    setHouseModalSearchTerm("");
  };

  // NEW: open edit modal for a voter
  const handleOpenEdit = (v: voterdayatype) => {
    setEditVoter(v);
    setIsEditOpen(true);
  };

  // NEW: when a voter is updated, reflect in both tables if present
  // NEW: when a voter is updated, reflect in both tables if present
  // NEW: when a voter is updated, reflect everywhere and flash the card
  const handleVoterUpdated = (updated: voterdayatype) => {
    // normalize: 'edited' must be string
    const upd: voterdayatype = {
      ...(updated),
      edited: String((updated)?.edited ?? '1'),
    } as voterdayatype;

    setColonyVoters(prev =>
      prev.map(x => x.voter_id === upd.voter_id ? { ...x, ...upd } as voterdayatype : x)
    );
    setHouseVoters(prev =>
      prev.map(x => x.voter_id === upd.voter_id ? { ...x, ...upd } as voterdayatype : x)
    );

    setHouseData(prev => {
      let changed = false;
      const next = prev.map(h => {
        const voters = h.voters.map(v => {
          if (v.voter_id === upd.voter_id) {
            changed = true;
            return { ...v, ...upd } as voterdayatype;
          }
          return v;
        });
        const hadVoter = h.voters.some(v => v.voter_id === upd.voter_id);
        const isTargetHouse = h.house_number === upd.house_number;
        if (hadVoter && !isTargetHouse) {
          const removed = h.voters.filter(v => v.voter_id !== upd.voter_id);
          return { ...h, voters: removed, count: removed.length };
        }
        if (!hadVoter && isTargetHouse) {
          const added = [...h.voters, upd] as voterdayatype[];
          changed = true;
          return { ...h, voters: added, count: added.length };
        }
        return { ...h, voters, count: voters.length };
      });
      return changed ? next : prev;
    });

    triggerHouseFlash(upd.house_number || selectedHouseNumber);
  };
  // NEW: delete voter via API and update lists
  const handleDelete = async (v: voterdayatype) => {
    if (!v.voter_id) return;
    const ok = confirm("Are you sure you want to delete this voter?");
    if (!ok) return;
    try {
      const res = await fetch("/api/voterdetails", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voter_id: v.voter_id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Delete failed");
      setColonyVoters(prev => prev.filter(x => x.voter_id !== v.voter_id));
      setHouseVoters(prev => prev.filter(x => x.voter_id !== v.voter_id));
      toast.success("Voter deleted");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };
  // Filter colonies by selected id
  const visibleColonies = useMemo(() => {
    if (!selectedColonyId) return colonyList;
    return colonyList.filter(c => String(c.colony_id) === String(selectedColonyId));
  }, [colonyList, selectedColonyId]);

  // Export to Excel function - Creates one sheet per colony with detailed voter data
  const exportToExcel = async () => {
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
      visibleColonies.forEach((col) => {
        const cid = String(col.colony_id);
        const votersList = votersByColonyId.get(cid) || [];

        // Prepare detailed voter data for this colony
        const exportData = votersList.map((voter, idx) => ({
          'Sr No': idx + 1,
          'Full Name': voter.full_name || [voter.first_name, voter.middle_name, voter.last_name].filter(Boolean).join(" "),
          'Full Name (Marathi)': voter.full_name_mr || '',
          'House Number': voter.house_number || '',
          'Voter Number': voter.voter_number || '',
          'Mobile': voter.mobile || 'N/A',
          'Booth Number': voter.booth_number || '',
          'Gender': voter.gender || '',
          'Date of Birth': voter.dob || '',
          'Aadhaar Number': voter.aadhaar_number || '',
          'Relation': voter.relation || ''
        }));

        // Create worksheet for this colony
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Set column widths
        ws['!cols'] = [
          { wch: 8 },   // Sr No
          { wch: 25 },  // Full Name
          { wch: 25 },  // Full Name (Marathi)
          { wch: 15 },  // House Number
          { wch: 15 },  // Voter Number
          { wch: 15 },  // Mobile
          { wch: 15 },  // Booth Number
          { wch: 10 },  // Gender
          { wch: 15 },  // Date of Birth
          { wch: 18 },  // Aadhaar Number
          { wch: 15 }   // Relation
        ];

        // Sanitize colony name for sheet name
        const sheetName = sanitizeSheetName(col.colony_name);

        // Add worksheet to workbook with colony name as sheet name
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Save file
      const fileName = `All_Colonies_Voters_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);

      toast.success(`Excel file downloaded successfully with ${visibleColonies.length} sheets!`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };
  // Export to PDF function
  // Export to PDF function
  const exportToPDF = async () => {
    try {
      // Create a new window with the data formatted for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const tableData = visibleColonies.map((col, idx) => {
        const cid = String(col.colony_id);
        const votersList = votersByColonyId.get(cid) || [];
        const count = votersList.length || 0;
        const totalHouses = new Set(
          votersList.map(v => v.house_number || 'No House Number')
        ).size;

        return `<tr><td>${idx + 1}</td><td>${col.colony_name}</td><td>${count}</td><td>${totalHouses}</td></tr>`;
      }).join('');

      printWindow.document.write(`
        <html>
          <head><title>Colony Wise Voters Report</title></head>
          <body>
            <h1>Colony Wise Voters Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            <table border="1" style="border-collapse: collapse; width: 100%;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 8px;">Sr No</th>
                  <th style="padding: 8px;">Colony Name</th>
                  <th style="padding: 8px;">Voter Count</th>
                  <th style="padding: 8px;">Total Houses</th>
                </tr>
              </thead>
              <tbody>${tableData}</tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      //printWindow.print();
      //printWindow.close();

      toast.success('PDF print dialog opened!');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Failed to export PDF file');
    }
  };
  // Export detailed voter data to Excel
  const exportDetailedVotersToExcel = async () => {
    try {
      // Use colonyVoters instead of filteredColonyVoters to get all data
      const exportData = colonyVoters.map((voter, idx) => ({
        'Sr No': idx + 1,
        'Full Name': voter.full_name || [voter.first_name, voter.middle_name, voter.last_name].filter(Boolean).join(" "),
        'Full Name (Marathi)': voter.full_name_mr || '',
        'House Number': voter.house_number || '',
        'Voter Number': voter.voter_number || '',
        'Mobile': voter.mobile || 'N/A',
        'Booth Number': voter.booth_number || '',
        'Gender': voter.gender || '',
        'Date of Birth': voter.dob || '',
        'Aadhaar Number': voter.aadhaar_number || '',
        'Relation': voter.relation || ''
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws['!cols'] = [
        { wch: 8 },   // Sr No
        { wch: 25 },  // Full Name
        { wch: 25 },  // Full Name (Marathi)
        { wch: 15 },  // House Number
        { wch: 15 },  // Voter Number
        { wch: 15 },  // Mobile
        { wch: 15 },  // Booth Number
        { wch: 10 },  // Gender
        { wch: 15 },  // Date of Birth
        { wch: 18 },  // Aadhaar Number
        { wch: 15 }   // Relation
      ];

      XLSX.utils.book_append_sheet(wb, ws, `${selectedColonyName} Voters`);

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const fileName = `${selectedColonyName.replace(/[^a-zA-Z0-9]/g, '_')}_Voters_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);

      toast.success('Detailed voter Excel file downloaded successfully!');
    } catch (error) {
      console.error('Error exporting detailed voters to Excel:', error);
      toast.error('Failed to export detailed voter Excel file');
    }
  };

  // Export detailed voter data to PDF
  const exportDetailedVotersToPDF = async () => {
    try {
      // Create a simple HTML table for PDF
      const tableRows = colonyVoters.map((voter, idx) => `
        <tr>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${idx + 1}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.full_name || [voter.first_name, voter.middle_name, voter.last_name].filter(Boolean).join(" ")}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.full_name_mr || ''}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.house_number || ''}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.voter_number || ''}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.mobile || 'N/A'}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.booth_number || ''}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.gender || ''}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.dob || ''}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.aadhaar_number || ''}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.relation || ''}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <html>
          <head>
            <title>${selectedColonyName} - Voters Report</title>
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
            <h1>${selectedColonyName} - Voters Report</h1>
            <div class="info">
              <p>Generated on: ${new Date().toLocaleDateString()} | Total Voters: ${colonyVoters.length}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Full Name</th>
                  <th>Name (Marathi)</th>
                  <th>House No</th>
                  <th>Voter No</th>
                  <th>Mobile</th>
                  <th>Booth</th>
                  <th>Gender</th>
                  <th>DOB</th>
                  <th>Aadhaar</th>
                  <th>Relation</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
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
        setTimeout(() => {
          //printWindow.print();
          // Close window after printing
          setTimeout(() => {
            //printWindow.close();
          }, 1000);
        }, 500);

        toast.success('PDF print dialog opened!');
      } else {
        toast.error('Please allow popups to download PDF');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF file');
    }
  };

  // Export house data to Excel
  const exportHouseDataToExcel = async () => {
    try {
      const exportData = houseData.map((house, idx) => ({
        'Sr No': idx + 1,
        'House Number': house.house_number,
        'Count': house.count
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws['!cols'] = [
        { wch: 8 },   // Sr No
        { wch: 20 },  // House Number
        { wch: 10 }   // Count
      ];

      XLSX.utils.book_append_sheet(wb, ws, `${selectedColonyName} House Data`);

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const fileName = `${selectedColonyName.replace(/[^a-zA-Z0-9]/g, '_')}_House_Data_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);

      toast.success('House data Excel file downloaded successfully!');
    } catch (error) {
      console.error('Error exporting house data to Excel:', error);
      toast.error('Failed to export house data Excel file');
    }
  };

  // Export house data to PDF
  const exportHouseDataToPDF = async () => {
    try {
      const tableRows = houseData.map((house, idx) => `
        <tr>
          <td style="padding: 4px; border: 1px solid #000; font-size: 10px;">${idx + 1}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 10px;">${house.house_number}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 10px;">${house.count}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <html>
          <head>
            <title>${selectedColonyName} - House Data Report</title>
            <style>
              @page { size: A4; margin: 10mm; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
              h1 { text-align: center; margin-bottom: 10px; font-size: 18px; }
              .info { text-align: center; margin-bottom: 15px; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; font-size: 10px; }
              th { background-color: #f0f0f0; padding: 8px; border: 1px solid #000; font-weight: bold; }
              td { padding: 8px; border: 1px solid #000; }
            </style>
          </head>
          <body>
            <h1>${selectedColonyName} - House Data Report</h1>
            <div class="info">
              <p>Generated on: ${new Date().toLocaleDateString()} | Total Houses: ${houseData.length}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>House Number</th>
                  <th>Count</th>
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

        setTimeout(() => {
          //printWindow.print();
          setTimeout(() => {
            //printWindow.close();
          }, 1000);
        }, 500);

        toast.success('PDF print dialog opened!');
      } else {
        toast.error('Please allow popups to download PDF');
      }
    } catch (error) {
      console.error('Error exporting house data PDF:', error);
      toast.error('Failed to export house data PDF file');
    }
  };

  // Export house voters data to Excel
  const exportHouseVotersToExcel = async () => {
    try {
      const exportData = houseVoters.map((voter, idx) => ({
        'Sr No': idx + 1,
        'Full Name': voter.full_name || [voter.first_name, voter.middle_name, voter.last_name].filter(Boolean).join(" "),
        'Full Name (Marathi)': voter.full_name_mr || '',
        'House Number': voter.house_number || '',
        'Voter Number': voter.voter_number || '',
        'Mobile': voter.mobile || 'N/A',
        'Booth Number': voter.booth_number || '',
        'Gender': voter.gender || '',
        'Date of Birth': voter.dob || '',
        'Aadhaar Number': voter.aadhaar_number || '',
        'Relation': voter.relation || ''
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws['!cols'] = [
        { wch: 8 },   // Sr No
        { wch: 25 },  // Full Name
        { wch: 25 },  // Full Name (Marathi)
        { wch: 15 },  // House Number
        { wch: 15 },  // Voter Number
        { wch: 15 },  // Mobile
        { wch: 15 },  // Booth Number
        { wch: 10 },  // Gender
        { wch: 15 },  // Date of Birth
        { wch: 18 },  // Aadhaar Number
        { wch: 15 }   // Relation
      ];

      XLSX.utils.book_append_sheet(wb, ws, `House ${selectedHouseNumber} Voters`);

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const fileName = `House_${selectedHouseNumber.replace(/[^a-zA-Z0-9]/g, '_')}_Voters_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);

      toast.success('House voters Excel file downloaded successfully!');
    } catch (error) {
      console.error('Error exporting house voters to Excel:', error);
      toast.error('Failed to export house voters Excel file');
    }
  };

  // Export house voters data to PDF
  const exportHouseVotersToPDF = async () => {
    try {
      const tableRows = houseVoters.map((voter, idx) => `
        <tr>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${idx + 1}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.full_name || [voter.first_name, voter.middle_name, voter.last_name].filter(Boolean).join(" ")}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.full_name_mr || ''}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.house_number || ''}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.voter_number || ''}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.mobile || 'N/A'}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.booth_number || ''}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.gender || ''}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.dob || ''}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.aadhaar_number || ''}</td>
          <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.relation || ''}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <html>
          <head>
            <title>House ${selectedHouseNumber} - Voters Report</title>
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
            <h1>House ${selectedHouseNumber} - Voters Report</h1>
            <div class="info">
              <p>Generated on: ${new Date().toLocaleDateString()} | Total Voters: ${houseVoters.length}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Full Name</th>
                  <th>Name (Marathi)</th>
                  <th>House No</th>
                  <th>Voter No</th>
                  <th>Mobile</th>
                  <th>Booth</th>
                  <th>Gender</th>
                  <th>DOB</th>
                  <th>Aadhaar</th>
                  <th>Relation</th>
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

        setTimeout(() => {
          //printWindow.print();
          setTimeout(() => {
            //printWindow.close();
          }, 1000);
        }, 500);

        toast.success('PDF print dialog opened!');
      } else {
        toast.error('Please allow popups to download PDF');
      }
    } catch (error) {
      console.error('Error exporting house voters PDF:', error);
      toast.error('Failed to export house voters PDF file');
    }
  };

  const individualSearchRef = useRef<HTMLInputElement | null>(null);
  const familySearchRef = useRef<HTMLInputElement | null>(null);
  const houseModalSearchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isModalOpen) {
      if (activeTab === 'individual') {
        setTimeout(() => individualSearchRef.current?.focus(), 50);
      } else {
        setTimeout(() => familySearchRef.current?.focus(), 50);
      }
    }
  }, [isModalOpen, activeTab]);

  useEffect(() => {
    if (isHouseModalOpen) {
      setTimeout(() => houseModalSearchRef.current?.focus(), 50);
    }
  }, [isHouseModalOpen]);


  // Add modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  // const [ setAddModalColonyId] = useState<string>("");
  const [addModalColonyName, setAddModalColonyName] = useState<string>("");
  const [addModalHouseNumber, setAddModalHouseNumber] = useState<string>("");

  const handleOpenAddModal = (colonyId?: string, colonyName?: string, houseNumber?: string) => {
    // setAddModalColonyId(colonyId || selectedColonyId);
    setAddModalColonyName(colonyName || selectedColonyName);
    setAddModalHouseNumber(houseNumber || "");
    setIsAddOpen(true);
  };

  const handleVoterAdded = (newVoter: voterdayatype) => {
    // If same colony, append to Individual list
    const newCid = colonyEntryToColony.get(String(newVoter.colony_entry_id));
    if (String(newCid || "") === String(selectedColonyId || "")) {
      newVoter = { ...(newVoter), edited: String((newVoter)?.edited ?? '1') } as voterdayatype;
      setColonyVoters(prev => [...prev, newVoter]);
    }
    // If house modal open for the same house, append there too
    if (selectedHouseNumber && newVoter.house_number === selectedHouseNumber) {
      setHouseVoters(prev => [...prev, newVoter]);
    }
    // Update house cards count + voters list
    setHouseData(prev => {
      const idx = prev.findIndex(h => h.house_number === newVoter.house_number);
      if (idx < 0) return prev;
      const copy = [...prev];
      const target = copy[idx];
      copy[idx] = { ...target, count: target.count + 1, voters: [...target.voters, newVoter] };
      return copy;
    });

    // NEW: flash the house card where the voter was added
    triggerHouseFlash(newVoter.house_number || selectedHouseNumber);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border p-4">
      {/* Filter */}


      {/* Export Buttons */}
      <div className="mb-4 flex items-center gap-4 w-full">
        <div className="flex-grow min-w-0">

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

        <button
          onClick={exportToExcel}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          title="Export to Excel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Excel
        </button>

        <button
          onClick={exportToPDF}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          title="Export to PDF"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          PDF
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 border text-left">Sr</th>
              <th className="px-3 py-2 border text-left">Colony</th>
              <th className="px-3 py-2 border text-left">Total  Houses</th>
              <th className="px-3 py-2 border text-left">Total Voters</th>
              <th className="px-3 py-2 border text-left">Export</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-2 border" colSpan={4}>
                  Loading colonies...
                </td>
              </tr>
            )}
            {!loading && visibleColonies.length === 0 && (
              <tr>
                <td className="px-3 py-2 border" colSpan={4}>
                  No colonies found
                </td>
              </tr>
            )}
            {!loading &&
              visibleColonies.map((col, idx) => {
                const cid = String(col.colony_id);
                const votersList = votersByColonyId.get(cid) || [];
                const voterCount = votersList.length;
                const houseCount = new Set(
                  votersList.map(v => v.house_number || 'No House Number')
                ).size;

                return (
                  <tr key={col.colony_id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border align-top w-6">{idx + 1}</td>
                    <td className="px-3 py-2 border align-top">
                      <button
                        type="button"
                        className=" text-[16px]"
                      >
                        {col.colony_name}
                      </button>
                    </td>
                    <td className="px-3 py-2 border align-top">
                      <button
                        type="button"
                        className="text-[16px]"

                      >
                        {houseCount}
                      </button>
                    </td>
                    <td className="px-3 py-2 border align-top">
                      <button
                        type="button"
                        className="text-blue-600 underline text-[16px]"
                        onClick={() => openModalForColony(cid, col.colony_name)}
                      >
                        {voterCount}
                      </button>
                    </td>
                    {/* total house */}

                    <td className="px-3 py-2 border align-top">
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setSelectedColonyName(col.colony_name);
                            const list = votersByColonyId.get(cid) || [];
                            setColonyVoters(list);
                            exportDetailedVotersToExcel();
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
                            // Get the specific colony data directly
                            const colonyVotersData = votersByColonyId.get(cid) || [];

                            // Export PDF with correct data immediately
                            try {
                              const tableRows = colonyVotersData.map((voter, idx) => `
                                <tr>
                                  <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${idx + 1}</td>
                                  <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.full_name || [voter.first_name, voter.middle_name, voter.last_name].filter(Boolean).join(" ")}</td>
                                  <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.full_name_mr || ''}</td>
                                  <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.house_number || ''}</td>
                                  <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.voter_number || ''}</td>
                                  <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.mobile || 'N/A'}</td>
                                  <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.booth_number || ''}</td>
                                  <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.gender || ''}</td>
                                  <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.dob || ''}</td>
                                  <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.aadhaar_number || ''}</td>
                                  <td style="padding: 4px; border: 1px solid #000; font-size: 9px;">${voter.relation || ''}</td>
                                </tr>
                              `).join('');

                              const htmlContent = `
                                <html>
                                  <head>
                                    <title>${col.colony_name} - Voters Report</title>
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
                                    <h1>${col.colony_name} - Voters Report</h1>
                                    <div class="info">
                                      <p>Generated on: ${new Date().toLocaleDateString()} | Total Voters: ${colonyVotersData.length}</p>
                                    </div>
                                    <table>
                                      <thead>
                                        <tr>
                                          <th>Sr</th>
                                          <th>Full Name</th>
                                          <th>Name (Marathi)</th>
                                          <th>House No</th>
                                          <th>Voter No</th>
                                          <th>Mobile</th>
                                          <th>Booth</th>
                                          <th>Gender</th>
                                          <th>DOB</th>
                                          <th>Aadhaar</th>
                                          <th>Relation</th>
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

                                setTimeout(() => {
                                  //printWindow.print();
                                  setTimeout(() => {
                                    //printWindow.close();
                                  }, 1000);
                                }, 500);

                                toast.success('PDF print dialog opened!');
                              } else {
                                toast.error('Please allow popups to download PDF');
                              }
                            } catch (error) {
                              console.error('Error exporting PDF:', error);
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
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Main Modal with Tabs */}
      {isModalOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded shadow w-full max-w-6xl m-3 h-[600px] overflow-hidden flex flex-col">
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

            {/* Tab Navigation */}
            {/* Tab Navigation */}
            <div className="grid grid-cols-12 gap-5 border-b p-3">
              <button
                onClick={() => setActiveTab('individual')}
                className={`col-span-6 w-full py-3 text-sm font-medium transition ${activeTab === 'individual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } rounded-tl-lg`}
              >
                Individual Wise
              </button>
              <button
                onClick={() => setActiveTab('family')}
                className={`col-span-6 w-full py-3 text-sm font-medium transition ${activeTab === 'family'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } rounded-tr-lg`}
              >
                Family Wise
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'individual' && (
                <div className="h-full flex flex-col">
                  {/* Search Box */}
                  <div className="p-4 border-b">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          ref={individualSearchRef}
                          type="text"
                          placeholder="Search voters by name, house number, voter number, mobile, booth..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full h-10 px-4 pr-16 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        {searchTerm && (
                          <button
                            type="button"
                            onClick={() => setSearchTerm("")}
                            className="absolute inset-y-0 right-8 my-auto h-6 w-6 rounded-full text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                            aria-label="Clear"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      <button
                        onClick={exportDetailedVotersToExcel}
                        className="shrink-0 flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Excel
                      </button>
                      <button
                        onClick={exportDetailedVotersToPDF}
                        className="shrink-0 flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        PDF
                      </button>
                    </div>
                    {searchTerm && (
                      <p className="text-sm text-gray-600 mt-2">
                        Showing {filteredColonyVoters.length} of {colonyVoters.length} voters
                      </p>
                    )}
                  </div>

                  {/* Individual Voters Table */}
                  <div className="flex-1 overflow-auto p-4">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 border text-left">Sr</th>
                          <th className="px-3 py-2 border text-left">Full Name</th>
                          <th className="px-3 py-2 border text-left">Gender</th>
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
                          <tr
                            key={v.voter_id}
                            className={`${Number(v.edited) === 1 ? 'bg-green-50' : ''} hover:bg-gray-50`}
                          >
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
                              {v.gender}
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
                                src={`https://voterbackend.weclocks.online/uploads/voter_photos/${v.photo}`}
                                alt="Voter Photo"
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer"
                                title="Click to preview"
                                onClick={() =>
                                  setPreviewImg(`https://voterbackend.weclocks.online/uploads/voter_photos/${v.photo}`)
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
                </div>
              )}

              {activeTab === 'family' && (
                <div className="h-full flex flex-col">
                  {/* Search + Actions */}
                  <div className="p-4 border-b">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          ref={familySearchRef}
                          type="text"
                          placeholder="Search by house no, name, mobile, booth..."
                          value={houseSearchTerm}
                          onChange={(e) => setHouseSearchTerm(e.target.value)}
                          className="w-full h-10 px-4 pr-16 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {houseSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setHouseSearchTerm("")}
                            className="absolute inset-y-0 right-8 my-auto h-6 w-6 rounded-full text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                            aria-label="Clear"
                          >
                            ×
                          </button>
                        )}
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
                        {houseSearchTerm && (
                          <p className="text-sm text-gray-600 mt-2">
                            Showing {filteredHouseData.length} of {houseData.length} houses
                          </p>
                        )}
                      </div>



                      <button
                        onClick={exportHouseDataToExcel}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Excel
                      </button>
                      <button
                        onClick={exportHouseDataToPDF}
                        className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        PDF
                      </button>
                    </div>
                  </div>

                  {/* House Data Grid */}
                  <div className="flex-1 overflow-auto p-4">
                    {filteredHouseData.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No house data found
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredHouseData.map((house, i) => {
                          const primaryPerson = house.voters.find(voter =>
                            voter.relation?.toLowerCase().includes('head') ||
                            voter.relation?.toLowerCase().includes('self') ||
                            voter.relation?.toLowerCase().includes('primary')
                          ) || house.voters[0];

                          return (
                            <div
                              key={house.house_number}
                              className={`${flashHouses.has(house.house_number) ? 'bg-yellow-100 ring-2 ring-yellow-300' : (Number(primaryPerson.edited) === 1 ? 'bg-green-50' : '')} hover:bg-gray-50 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer relative`}
                              onClick={() => openHouseModal(house.house_number, house.voters)}
                            >

                              <div className="p-4">
                                {/* Header with Sr No and House Number */}
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-sm font-medium text-gray-500">{i + 1}</span>
                                  <span className="text-lg font-bold text-blue-600">
                                    House No: {house.house_number}
                                  </span>
                                </div>

                                {/* Primary Person Details */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">

                                      <img
                                        src={`https://voterbackend.weclocks.online/uploads/voter_photos/${primaryPerson.photo}`}
                                        // src={getVoterPhotoUrl(primaryPerson.photo)}
                                        alt="Voter Photo"
                                        className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/user/npimg.jpg'; }}
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {primaryPerson?.full_name ||
                                          [primaryPerson?.first_name, primaryPerson?.middle_name, primaryPerson?.last_name]
                                            .filter(Boolean)
                                            .join(" ")}
                                      </p>
                                      <p className="text-xs text-gray-500 truncate">
                                        {primaryPerson?.full_name_mr || "N/A"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span className="text-xs text-gray-600">
                                      {primaryPerson?.mobile || "N/A"}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span className="text-xs text-gray-600">
                                      Booth: {primaryPerson?.booth_number || "N/A"}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                    </svg>
                                    <span className="text-xs text-gray-600">
                                      {primaryPerson?.gender || "N/A"}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500">Total Members</span>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {house.count}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
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

      {/* House Modal */}
      {isHouseModalOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded shadow w-full max-w-4xl m-3 h-[500px] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center py-3 px-4 border-b">
              <h3 className="font-bold text-gray-800">
                House {selectedHouseNumber} - Voters ({houseVoters.length})
              </h3>
              <button
                type="button"
                onClick={closeHouseModal}
                className="size-8 inline-flex justify-center items-center rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>


            {/* Export buttons for house modal */}
            {/* Export buttons for house modal */}
            <div className="h flex flex-col">
              {/* Search Box */}
              <div className="p-4 border-b flex items-center gap-3 w-full">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative flex-1">
                    <input
                      ref={houseModalSearchRef}
                      type="text"
                      placeholder="Search by name, voter no, mobile, booth..."
                      value={houseModalSearchTerm}
                      onChange={(e) => setHouseModalSearchTerm(e.target.value)}
                      className="w-full h-10 px-4 pr-16 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {houseModalSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setHouseModalSearchTerm("")}
                        className="absolute inset-y-0 right-8 my-auto h-6 w-6 rounded-full text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                        aria-label="Clear"
                      >
                        ×
                      </button>
                    )}
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
                  {houseModalSearchTerm && (
                    <p className="text-sm text-gray-600 ml-2 whitespace-nowrap">
                      Showing {filteredHouseModalVoters.length} of {houseVoters.length} voters
                    </p>
                  )}
                </div>
                {/* Add button beside export */}
                <button
                  onClick={() => handleOpenAddModal(selectedColonyId, selectedColonyName, selectedHouseNumber)}
                  className="shrink-0 flex items-center gap-2 px-3 py-3 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                  title="Add voter to this house"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
                <button
                  onClick={exportHouseVotersToExcel}
                  className="shrink-0 flex items-center gap-2 px-3 py-3 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel
                </button>
                <button
                  onClick={exportHouseVotersToPDF}
                  className="shrink-0 flex items-center gap-2 px-3 py-3 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF
                </button>


                {/* <button
                  onClick={exportHouseVotersToExcel}
                  className="shrink-0 flex items-center gap-2 px-3 py-3 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                ></button> */}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 border text-left">Sr</th>
                    <th className="px-3 py-2 border text-left">Full Name</th>
                    <th className="px-3 py-2 border text-left">Photo</th>
                    <th className="px-3 py-2 border text-left">Relation </th>
                    <th className="px-3 py-2 border text-left">Voter No.</th>
                    <th className="px-3 py-2 border text-left">Mobile</th>
                    <th className="px-3 py-2 border text-left">Booth</th>
                    <th className="px-3 py-2 border text-left">Actions</th> {/* NEW */}
                  </tr>
                </thead>
                <tbody>
                  {filteredHouseModalVoters.length === 0 && (
                    <tr>
                      <td className="px-3 py-2 border" colSpan={8}>
                        No voters found for this house
                      </td>
                    </tr>
                  )}
                  {filteredHouseModalVoters.map((voter, i) => (
                    <tr
                      key={voter.voter_id}
                      className={`${Number(voter.edited) === 1 ? 'bg-green-50' : ''} hover:bg-gray-50`}
                    >
                      <td className="px-3 py-2 border align-top">{i + 1}</td>
                      <td className="px-3 py-2 border align-top">

                        <img
                          src={`https://voterbackend.weclocks.online/uploads/voter_photos/${voter.photo}`}
                          // src={getVoterPhotoUrl(voter.photo)}
                          alt="Voter Photo"
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer"
                          title="Click to preview"
                          onClick={() =>
                            setPreviewImg(`https://voterbackend.weclocks.online/uploads/voter_photos/${voter.photo}`)
                          }
                          onError={(e) => {
                            e.currentTarget.src = '/images/user/npimg.jpg';
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 border align-top">
                        {voter.full_name ||
                          [voter.first_name, voter.middle_name, voter.last_name]
                            .filter(Boolean)
                            .join(" ")}
                        {"   "}   {"   "}
                        ({voter.full_name_mr || "N/A"})
                        <br />
                        <span className="text-xs text-gray-600">{voter.gender}</span>
                      </td>
                      <td className="px-3 py-2 border align-top">{voter.relation || ""}</td>
                      <td className="px-3 py-2 border align-top">{voter.voter_number}</td>
                      <td className="px-3 py-2 border align-top">{voter.mobile || "N/A"}</td>
                      <td className="px-3 py-2 border align-top">{voter.booth_number}</td>

                      <td className="px-3 py-2 border align-top">
                        <div className="flex items-center gap-2">
                          <button
                            className="p-1 rounded hover:bg-blue-50 text-blue-600"
                            title="Edit"
                            onClick={() => handleOpenEdit(voter)}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            className="p-1 rounded hover:bg-red-50 text-red-600"
                            title="Delete"
                            onClick={() => handleDelete(voter)}
                          >
                            <TrashBinIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end items-center gap-x-2 py-3 px-4 border-t">
              <button
                type="button"
                onClick={closeHouseModal}
                className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
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


      {/* Edit Voter Modal */}
      <VoterEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        voter={editVoter}
        onUpdate={handleVoterUpdated}
      />

      <VoterAddModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={handleVoterAdded}
        preselectedColonyId={colonyid}
        preselectedColonyName={addModalColonyName}
        preselectedHouseNumber={addModalHouseNumber}
      />
    </div>

  );
};

export default ColonyWiseVoters;