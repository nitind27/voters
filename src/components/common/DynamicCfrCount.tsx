"use client";
import React, { useState, useEffect, useCallback } from 'react';

type TabType = "allvoterdetails" | "voterwisedetails" | "femalevoters" | "familywisesurvey" | "voterstatus";

interface DynamicCfrCountProps {
  title: string;
  tabType?: TabType;
  refreshInterval?: number; // in milliseconds, default 3000 (3 seconds)
}

const DynamicCfrCount: React.FC<DynamicCfrCountProps> = ({ 
  title, 
  tabType = "allvoterdetails",
  refreshInterval = 3000 
}) => {
  const [count, setCount] = useState<number>(0);

  const fetchCount = useCallback(async () => {
    try {
      let apiUrl = '';
      
      // Determine API endpoint based on tab type
      switch (tabType) {
        case "allvoterdetails":
          apiUrl = '/api/voterdetailsdata/Voterdetailscounte';
          break;
        case "voterwisedetails":
          // For colony wise, we need to count all voters
          apiUrl = '/api/voterdetailsdata/Voterdetailscounte';
          break;
        case "femalevoters":
          apiUrl = '/api/femalesurvey';
          break;
        case "familywisesurvey":
          apiUrl = '/api/familywisesurvey';
          break;
        case "voterstatus":
          // For voter status, we can use a general count or skip
          apiUrl = '/api/voterdetailsdata/Voterdetailscounte';
          break;
        default:
          apiUrl = '/api/voterdetailsdata/Voterdetailscounte';
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${baseUrl}${apiUrl}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch count');
      }
      
      const data = await response.json();
      
      // Handle different response formats
      if (tabType === "allvoterdetails" || tabType === "voterwisedetails") {
        setCount(data.total ?? 0);
      } else if (tabType === "femalevoters" || tabType === "familywisesurvey") {
        // For these endpoints, check if data has pagination structure or is an array
        if (data.pagination && typeof data.pagination.totalRecords === 'number') {
          setCount(data.pagination.totalRecords);
        } else if (Array.isArray(data)) {
          setCount(data.length);
        } else if (Array.isArray(data.data)) {
          setCount(data.data.length);
        } else {
          setCount(0);
        }
      } else {
        setCount(data.total ?? data.count ?? 0);
      }
    } catch (err) {
      console.error('Error fetching count:', err);
      // Keep previous count on error
    }
  }, [tabType]);

  useEffect(() => {
    // Initial fetch
    fetchCount();

    // Set up interval for auto-refresh
    const interval = setInterval(fetchCount, refreshInterval);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [refreshInterval, fetchCount]);

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
          {title}: <span className="animate-pulse">{count.toLocaleString()}</span>
        </h1>
      </div>
    </div>
  );
};

export default DynamicCfrCount;
