"use client";
import React, { useEffect, useState } from 'react';

interface SchoolStats {
    school_number: number;
    school_name: string;
    total_voters: number;
    voting_done: number;
    voting_pending: number;
}

const SchoolWiseData: React.FC = () => {
    const [data, setData] = useState<SchoolStats[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/schoolwisedata');
            
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            
            const result = await response.json();
            setData(result);
        } catch (err) {
            console.error('Error fetching school wise data:', err);
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

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="text-red-600">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Voting Statistics</h2>
            
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                    <thead>
                        <tr className="bg-gradient-to-r from-blue-600 to-blue-700">
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-bold text-white">Sr. No.</th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold text-white">Schools</th>
                            <th className="border border-gray-300 px-4 py-3 text-right text-sm font-bold text-white">Total Voters</th>
                            <th className="border border-gray-300 px-4 py-3 text-right text-sm font-bold text-white">Voting Done</th>
                            <th className="border border-gray-300 px-4 py-3 text-right text-sm font-bold text-white">Voting Pending</th>
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
                                    <tr key={index} className="hover:bg-blue-50 transition-colors">
                                        <td className="border border-gray-300 px-4 py-3 text-sm text-center text-gray-700 font-medium">
                                            {index + 1}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-800 font-medium">
                                            {row.school_name || 'Unknown'}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-4 text-right">
                                            <span className="text-xl font-bold text-blue-600">
                                                {row.total_voters.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="border border-gray-300 px-4 py-4 text-right bg-green-50">
                                            <span className="text-xl font-bold text-green-600">
                                                {row.voting_done.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="border border-gray-300 px-4 py-4 text-right bg-red-50">
                                            <span className="text-xl font-bold text-red-600">
                                                {row.voting_pending.toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                
                                {/* Total Row */}
                                <tr className="bg-gradient-to-r from-gray-100 to-gray-200 font-semibold border-t-2 border-gray-400">
                                    <td className="border border-gray-300 px-4 py-4 text-center font-bold text-gray-900 text-base" colSpan={2}>Total</td>
                                    <td className="border border-gray-300 px-4 py-4 text-right">
                                        <span className="text-2xl font-bold text-blue-700">
                                            {totals.totalVoters.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="border border-gray-300 px-4 py-4 text-right bg-green-100">
                                        <span className="text-2xl font-bold text-green-700">
                                            {totals.totalVotingDone.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="border border-gray-300 px-4 py-4 text-right bg-red-100">
                                        <span className="text-2xl font-bold text-red-700">
                                            {totals.totalVotingPending.toLocaleString()}
                                        </span>
                                    </td>
                                </tr>
                                
                                {/* Total (%) Row */}
                                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-300">
                                    <td className="border border-gray-300 px-4 py-3 text-center font-bold text-gray-900 text-base" colSpan={2}>Total (%)</td>
                                    <td className="border border-gray-300 px-4 py-3 text-right">
                                        <span className="text-lg font-bold text-blue-600">100%</span>
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3 text-right bg-green-50">
                                        <span className="text-lg font-bold text-green-600">
                                            {totals.votingDonePercent}%
                                        </span>
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3 text-right bg-red-50">
                                        <span className="text-lg font-bold text-red-600">
                                            {totals.votingPendingPercent}%
                                        </span>
                                    </td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SchoolWiseData;

