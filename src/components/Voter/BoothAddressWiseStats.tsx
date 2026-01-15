"use client";
import React, { useEffect, useState } from 'react';
import SchoolWiseData from './SchoolWiseData';

interface BoothAddressStats {
    booth_address: string;
    total_voters: number;
    voting_done: number;
    voting_pending: number;
}

const BoothAddressWiseStats: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'booth' | 'school'>('booth');
    const [data, setData] = useState<BoothAddressStats[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (activeTab === 'booth') {
            fetchData();
        }
    }, [activeTab]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/boothaddresswise');
            
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            
            const result = await response.json();
            setData(result);
        } catch (err) {
            console.error('Error fetching booth address wise statistics:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    // Calculate totals
    const totals = React.useMemo(() => {
        const totalVoters = data.reduce((sum, item) => sum + item.total_voters, 0);
        const totalVotingDone = data.reduce((sum, item) => sum + item.voting_done, 0);
        const totalVotingPending = data.reduce((sum, item) => sum + item.voting_pending, 0);
        
        const votingDonePercent = totalVoters > 0 ? Math.round((totalVotingDone / totalVoters) * 100) : 0;
        const votingPendingPercent = totalVoters > 0 ? Math.round((totalVotingPending / totalVoters) * 100) : 0;
        
        return {
            totalVoters,
            totalVotingDone,
            totalVotingPending,
            votingDonePercent,
            votingPendingPercent
        };
    }, [data]);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Voting Statistics</h2>
            
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('booth')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'booth'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Booth Address Wise
                    </button>
                    <button
                        onClick={() => setActiveTab('school')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'school'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        School Wise Data
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'booth' ? (
                <>
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="text-gray-600">Loading...</div>
                        </div>
                    ) : error ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="text-red-600">Error: {error}</div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="border border-gray-300 px-4 py-3 text-center text-sm font-bold text-gray-900">Sr. No.</th>
                                        <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold text-gray-900">Schools</th>
                                        <th className="border border-gray-300 px-4 py-3 text-right text-sm font-bold text-gray-900">Total Voters</th>
                                        <th className="border border-gray-300 px-4 py-3 text-right text-sm font-bold text-gray-900">Voting Done</th>
                                        <th className="border border-gray-300 px-4 py-3 text-right text-sm font-bold text-gray-900">Voting Pending</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {data.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500 border border-gray-300">
                                                No data available.
                                            </td>
                                        </tr>
                                    ) : (
                                        <>
                                            {data.map((row, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="border border-gray-300 px-4 py-3 text-sm text-center text-gray-900">
                                                        {index + 1}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                                                        {row.booth_address || 'Unknown'}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-3 text-sm text-right text-gray-900">
                                                        {row.total_voters.toLocaleString()}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-3 text-sm text-right text-gray-900">
                                                        {row.voting_done.toLocaleString()}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-3 text-sm text-right text-red-600 font-medium">
                                                        {row.voting_pending.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            
                                            {/* Total Row */}
                                            <tr className="bg-gray-50 font-semibold">
                                                <td className="border border-gray-300 px-4 py-3 text-sm text-center font-bold text-gray-900" colSpan={2}>Total</td>
                                                <td className="border border-gray-300 px-4 py-3 text-sm text-right font-bold text-gray-900">
                                                    {totals.totalVoters.toLocaleString()}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-3 text-sm text-right font-bold text-gray-900">
                                                    {totals.totalVotingDone.toLocaleString()}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-3 text-sm text-right font-bold text-red-600">
                                                    {totals.totalVotingPending.toLocaleString()}
                                                </td>
                                            </tr>
                                            
                                            {/* Total (%) Row */}
                                            <tr className="bg-gray-50">
                                                <td className="border border-gray-300 px-4 py-3 text-sm text-center font-bold text-gray-900" colSpan={2}>Total (%)</td>
                                                <td className="border border-gray-300 px-4 py-3 text-sm text-right text-gray-900">100%</td>
                                                <td className="border border-gray-300 px-4 py-3 text-sm text-right text-gray-900">
                                                    {totals.votingDonePercent}%
                                                </td>
                                                <td className="border border-gray-300 px-4 py-3 text-sm text-right text-red-600 font-medium">
                                                    {totals.votingPendingPercent}%
                                                </td>
                                            </tr>
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : (
                <SchoolWiseData />
            )}
        </div>
    );
};

export default BoothAddressWiseStats;

