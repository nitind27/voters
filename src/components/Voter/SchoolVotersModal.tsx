"use client";
import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/modal';
import { getVoterRowBgClass } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

interface Voter {
    id: number;
    Voter_Id: string;
    full_name: string;
    ENG_Full_name?: string;
    Age?: number;
    Gender?: string;
    updated_mobile_no?: string;
    Updated_colony?: string | number | null;
    colony_name?: string | null;
    inst_1_paid?: number | string | null;
    inst_2_paid?: number | string | null;
    inst_3_paid?: number | string | null;
    voting_status?: string | null;
    Booth_Number?: string;
    House_Number?: string;
    updated_house_number?: string;
}

interface ColonyOption {
    colony_id: number;
    colony_name: string;
}

interface SchoolVotersModalProps {
    isOpen: boolean;
    onClose: () => void;
    schoolName: string;
    boothNumbers: number[];
    filterType: 'all' | 'total' | 'done' | 'pending';
    title: string;
}

const SchoolVotersModal: React.FC<SchoolVotersModalProps> = ({
    isOpen,
    onClose,
    schoolName,
    boothNumbers,
    filterType,
    title
}) => {
    const [voters, setVoters] = useState<Voter[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedColony, setSelectedColony] = useState<string>('');
    const [colonies, setColonies] = useState<ColonyOption[]>([]);
    const [loadingColonies, setLoadingColonies] = useState<boolean>(false);
    const itemsPerPage = 50;

    // Fetch colonies
    useEffect(() => {
        const fetchColonies = async () => {
            setLoadingColonies(true);
            try {
                const response = await fetch('/api/colony');
                if (!response.ok) throw new Error('Failed to fetch colonies');
                const data = await response.json();
                setColonies(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error fetching colonies:', err);
            } finally {
                setLoadingColonies(false);
            }
        };
        if (isOpen) {
            fetchColonies();
        }
    }, [isOpen]);

    // Fetch voters
    useEffect(() => {
        if (isOpen && boothNumbers.length > 0) {
            fetchVoters();
        }
    }, [isOpen, currentPage, searchTerm, selectedColony, filterType, boothNumbers.join(',')]);

    const fetchVoters = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: itemsPerPage.toString(),
                booth_numbers: boothNumbers.join(','),
                filter_type: filterType,
            });
            
            if (searchTerm.trim()) {
                params.set('search', searchTerm.trim());
            }
            
            if (selectedColony) {
                params.set('colony_id', selectedColony);
            }

            const response = await fetch(`/api/schoolwisedata/voters?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch voters');
            }
            
            const result = await response.json();
            setVoters(result.data || []);
            setTotalPages(result.pagination?.totalPages || 1);
            setTotalRecords(result.pagination?.totalRecords || 0);
        } catch (err) {
            console.error('Error fetching voters:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
            setVoters([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page on search
    };

    const handleColonyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedColony(e.target.value);
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Export to Excel
    const handleExportExcel = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                type: 'excel',
                booth_numbers: boothNumbers.join(','),
                filter_type: filterType,
            });
            
            if (searchTerm.trim()) {
                params.set('search', searchTerm.trim());
            }
            
            if (selectedColony) {
                params.set('colony_id', selectedColony);
            }

            const response = await fetch(`/api/schoolwisedata/voters/export?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch data for export');
            }
            
            const result = await response.json();
            const exportData = result.data || [];
            
            if (exportData.length === 0) {
                toast.error('No data to export');
                return;
            }

            // Prepare Excel data
            const excelData = exportData.map((voter: Voter, index: number) => ({
                'Sr No': index + 1,
                'Voter ID': voter.Voter_Id || 'N/A',
                'Full Name': voter.full_name || 'N/A',
                'English Name': voter.ENG_Full_name || 'N/A',
                'Age': voter.Age || 'N/A',
                'Gender': voter.Gender || 'N/A',
                'Mobile': voter.updated_mobile_no || 'N/A',
                'Colony': voter.colony_name || 'N/A',
                'House Number': voter.updated_house_number || voter.House_Number || 'N/A',
                'Booth Number': voter.Booth_Number || 'N/A',
                'Voting Status': voter.voting_status || 'Pending',
                'Inst 1 Paid': voter.inst_1_paid === 1 || voter.inst_1_paid === '1' ? 'Yes' : 'No',
                'Inst 2 Paid': voter.inst_2_paid === 1 || voter.inst_2_paid === '1' ? 'Yes' : 'No',
                'Inst 3 Paid': voter.inst_3_paid === 1 || voter.inst_3_paid === '1' ? 'Yes' : 'No',
            }));

            // Create workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);
            
            // Set column widths
            ws['!cols'] = [
                { wch: 8 }, { wch: 15 }, { wch: 25 }, { wch: 25 },
                { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 20 },
                { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
                { wch: 12 }, { wch: 12 }
            ];
            
            XLSX.utils.book_append_sheet(wb, ws, 'Voters Data');
            
            // Generate filename
            const timestamp = new Date().toISOString().split('T')[0];
            const fileName = `${title}_${schoolName}_${timestamp}.xlsx`.replace(/[^a-zA-Z0-9._-]/g, '_');
            
            // Save file
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(data, fileName);
            
            toast.success(`Excel file downloaded successfully! (${exportData.length} records)`);
        } catch (err) {
            console.error('Error exporting to Excel:', err);
            toast.error('Failed to export Excel file');
        } finally {
            setLoading(false);
        }
    };

    // Export to PDF
    const handleExportPDF = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                type: 'pdf',
                booth_numbers: boothNumbers.join(','),
                filter_type: filterType,
            });
            
            if (searchTerm.trim()) {
                params.set('search', searchTerm.trim());
            }
            
            if (selectedColony) {
                params.set('colony_id', selectedColony);
            }

            const response = await fetch(`/api/schoolwisedata/voters/export?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch data for export');
            }
            
            const result = await response.json();
            const exportData = result.data || [];
            
            if (exportData.length === 0) {
                toast.error('No data to export');
                return;
            }

            // Generate table rows
            const tableRows = exportData.map((voter: Voter, index: number) => {
                const inst1Paid = voter.inst_1_paid === 1 || voter.inst_1_paid === '1' ? 'Yes' : 'No';
                const bgColor = inst1Paid === 'Yes' ? '#d1fae5' : '';
                return `
                    <tr style="background-color: ${bgColor};">
                        <td style="padding: 6px; border: 1px solid #000; font-size: 9px; text-align: center;">${index + 1}</td>
                        <td style="padding: 6px; border: 1px solid #000; font-size: 9px;">${voter.Voter_Id || 'N/A'}</td>
                        <td style="padding: 6px; border: 1px solid #000; font-size: 9px;">${voter.full_name || 'N/A'}</td>
                        <td style="padding: 6px; border: 1px solid #000; font-size: 9px;">${voter.ENG_Full_name || 'N/A'}</td>
                        <td style="padding: 6px; border: 1px solid #000; font-size: 9px; text-align: center;">${voter.Age || 'N/A'}</td>
                        <td style="padding: 6px; border: 1px solid #000; font-size: 9px; text-align: center;">${voter.Gender || 'N/A'}</td>
                        <td style="padding: 6px; border: 1px solid #000; font-size: 9px;">${voter.updated_mobile_no || 'N/A'}</td>
                        <td style="padding: 6px; border: 1px solid #000; font-size: 9px;">${voter.colony_name || 'N/A'}</td>
                        <td style="padding: 6px; border: 1px solid #000; font-size: 9px;">${voter.updated_house_number || voter.House_Number || 'N/A'}</td>
                        <td style="padding: 6px; border: 1px solid #000; font-size: 9px; text-align: center;">${voter.Booth_Number || 'N/A'}</td>
                        <td style="padding: 6px; border: 1px solid #000; font-size: 9px; text-align: center;">
                            <span style="padding: 2px 6px; border-radius: 4px; font-size: 8px; ${voter.voting_status === 'Completed' || voter.voting_status === 'Direct' ? 'background-color: #d1fae5; color: #065f46;' : 'background-color: #fee2e2; color: #991b1b;'}">
                                ${voter.voting_status || 'Pending'}
                            </span>
                        </td>
                        <td style="padding: 6px; border: 1px solid #000; font-size: 9px; text-align: center;">${inst1Paid}</td>
                    </tr>
                `;
            }).join('');

            const htmlContent = `
                <html>
                    <head>
                        <title>${title} - ${schoolName}</title>
                        <style>
                            @page { 
                                size: A4 landscape; 
                                margin: 10mm; 
                            }
                            body { 
                                font-family: Arial, sans-serif; 
                                margin: 0; 
                                padding: 15px; 
                            }
                            h1 { 
                                text-align: center; 
                                margin-bottom: 10px; 
                                font-size: 18px; 
                                color: #1f2937;
                            }
                            .info { 
                                text-align: center; 
                                margin-bottom: 15px; 
                                font-size: 12px; 
                                color: #666;
                            }
                            table { 
                                width: 100%; 
                                border-collapse: collapse; 
                                font-size: 9px; 
                                margin-top: 10px;
                            }
                            th { 
                                background-color: #374151; 
                                color: white; 
                                padding: 8px; 
                                border: 1px solid #000; 
                                font-weight: bold; 
                                text-align: center;
                            }
                            td { 
                                padding: 6px; 
                                border: 1px solid #000; 
                                text-align: left;
                            }
                            tr:nth-child(even) { 
                                background-color: #f9fafb; 
                            }
                        </style>
                    </head>
                    <body>
                        <h1>${title} - ${schoolName}</h1>
                        <div class="info">
                            <p>Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} | Total Records: ${exportData.length}</p>
                            ${searchTerm ? `<p>Search: ${searchTerm}</p>` : ''}
                            ${selectedColony ? `<p>Colony Filter: Applied</p>` : ''}
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
                                    <th>Mobile</th>
                                    <th>Colony</th>
                                    <th>House No.</th>
                                    <th>Booth No.</th>
                                    <th>Voting Status</th>
                                    <th>Inst 1 Paid</th>
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
                
                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.print();
                    }, 250);
                };
                
                // Fallback
                setTimeout(() => {
                    if (printWindow && !printWindow.closed) {
                        printWindow.focus();
                        printWindow.print();
                    }
                }, 1000);
                
                toast.success(`PDF print dialog opened! (${exportData.length} records)`);
            } else {
                toast.error('Please allow popups to download PDF');
            }
        } catch (err) {
            console.error('Error exporting to PDF:', err);
            toast.error('Failed to export PDF file');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-7xl max-h-[90vh] overflow-hidden">
            <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {title} - {schoolName}
                </h2>
                
                {/* Filters */}
                <div className="mb-4 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search by name, voter ID, mobile..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="w-full h-11 rounded-lg border px-4 py-2 text-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                    </div>
                    <div className="w-full sm:w-64">
                        <select
                            value={selectedColony}
                            onChange={handleColonyChange}
                            disabled={loadingColonies}
                            className="w-full h-11 rounded-lg border px-4 py-2 text-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                        >
                            <option value="">All Colonies</option>
                            {colonies.map((colony) => (
                                <option key={colony.colony_id} value={String(colony.colony_id)}>
                                    {colony.colony_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setSelectedColony('');
                            setCurrentPage(1);
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                    >
                        Clear Filters
                    </button>
                </div>

                {/* Stats and Export Buttons */}
                <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="text-sm text-gray-600">
                        Total Records: <span className="font-semibold text-blue-600">{totalRecords.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportExcel}
                            disabled={loading || totalRecords === 0}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Export Excel
                        </button>
                        <button
                            onClick={handleExportPDF}
                            disabled={loading || totalRecords === 0}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Export PDF
                        </button>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="text-gray-600">Loading...</div>
                    </div>
                ) : error ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="text-red-600">Error: {error}</div>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto max-h-[60vh] border border-gray-300 rounded-lg">
                            <table className="min-w-full border-collapse">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-900">Sr. No.</th>
                                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-900">Voter ID</th>
                                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-900">Full Name</th>
                                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-900">English Name</th>
                                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-900">Age</th>
                                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-900">Gender</th>
                                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-900">Mobile</th>
                                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-900">Colony</th>
                                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-900">House No.</th>
                                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-900">Booth No.</th>
                                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-900">Voting Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {voters.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="px-4 py-6 text-center text-sm text-gray-500 border border-gray-300">
                                                No voters found.
                                            </td>
                                        </tr>
                                    ) : (
                                        voters.map((voter, index) => {
                                            const srNo = (currentPage - 1) * itemsPerPage + index + 1;
                                            return (
                                                <tr
                                                    key={voter.id}
                                                    className={`hover:bg-gray-50 ${getVoterRowBgClass(
                                                        voter.inst_1_paid,
                                                        voter.inst_2_paid,
                                                        voter.inst_3_paid
                                                    )}`}
                                                >
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">{srNo}</td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 font-mono">{voter.Voter_Id || '-'}</td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 font-medium">{voter.full_name || '-'}</td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">{voter.ENG_Full_name || '-'}</td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">{voter.Age || '-'}</td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">{voter.Gender || '-'}</td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700 font-mono">{voter.updated_mobile_no || '-'}</td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">{voter.colony_name || '-'}</td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">{voter.updated_house_number || voter.House_Number || '-'}</td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">{voter.Booth_Number || '-'}</td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">
                                                        <span className={`px-2 py-1 rounded text-xs ${
                                                            voter.voting_status === 'Completed' || voter.voting_status === 'Direct'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-red-100 text-red-700'
                                                        }`}>
                                                            {voter.voting_status || 'Pending'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-4 flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
};

export default SchoolVotersModal;

