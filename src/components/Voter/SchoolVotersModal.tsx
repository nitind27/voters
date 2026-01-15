"use client";
import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/modal';
import { getVoterRowBgClass } from '@/lib/utils';

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

                {/* Stats */}
                <div className="mb-4 text-sm text-gray-600">
                    Total Records: <span className="font-semibold text-blue-600">{totalRecords.toLocaleString()}</span>
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

