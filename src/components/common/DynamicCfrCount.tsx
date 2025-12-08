"use client";
import React, { useState, useEffect } from 'react';

interface DynamicCfrCountProps {
  title: string;
  refreshInterval?: number; // in milliseconds, default 30000 (30 seconds)
}

const DynamicCfrCount: React.FC<DynamicCfrCountProps> = ({ 
  title, 
  refreshInterval = 30000 
}) => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVoterCount = async () => {
    try {
      setError(null);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/voterdetailsdata/Voterdetailscounte`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch voter count');
      }
      
      const data = await response.json();
      setCount(data.total ?? 0);
    } catch (err) {
      console.error('Error fetching voter count:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchVoterCount();

    // Set up interval for auto-refresh
    const interval = setInterval(fetchVoterCount, refreshInterval);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return (
    <div className="bg-[#EA7929] rounded-lg w-full mx-auto border">
      <div className="flex items-center mt-1">
        <img
          width={80}
          height={80}
          src="./images/login/img.jpeg"
          alt="Logo"
          className="object-contain"
        />
        <h1 className="flex-1 text-3xl font-bold text-white text-center ml-4">
          {title}: {loading ? (
            <span className="animate-pulse">Loading...</span>
          ) : error ? (
            <span className="text-red-200">Error</span>
          ) : (
            // <span className="animate-pulse">{count}</span>
            <span className="animate-pulse">{count}</span>
          )}
        </h1>
      </div>
    </div>
  );
};

export default DynamicCfrCount;
