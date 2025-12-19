// app/ecommerce/page.tsx
import type { Metadata } from "next";

import { Suspense } from "react";
import Loader from "@/common/Loader";


import DistrictMap from "@/components/ecommerce/DistrictMap";

export const metadata: Metadata = {
    title: "MDM",
    description:
        "Scheme Monitoring & Tracking System",
};

// Force dynamic rendering to prevent build-time fetching
export const dynamic = 'force-dynamic';

// Helper function to add timeout to fetch requests
async function fetchWithTimeout(url: string, timeoutMs: number = 30000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        const response = await fetch(url, {
            cache: 'no-store',
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
        }
        throw error;
    }
}

async function fetchFarmersData() {
    try {
        // Fetch all data with timeout (30 seconds per request)
        const [usersRes, schemesRes, farmersRes, schemescrudRes, schemessubcategoryRes, yearmasterRes, documentsRes, talukaRes, villagesRes] = await Promise.all([
            fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_URL}/api/usercategorycrud`, 30000),
            fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_URL}/api/schemescrud`, 30000),
            fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_URL}/api/farmers`, 30000),
            fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_URL}/api/schemescategory`, 30000),
            fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_URL}/api/schemessubcategory`, 30000),
            fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_URL}/api/yearmaster`, 30000),
            fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_URL}/api/documents`, 30000),
            fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_URL}/api/taluka`, 30000),
            fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_URL}/api/villages`, 30000),
        ]);

        // Parse all responses
        const [users, schemes, farmers, schemescrud, schemessubcategory, yearmaster, documents, taluka, villages] = await Promise.all([
            usersRes.json(),
            schemesRes.json(),
            farmersRes.json(),
            schemescrudRes.json(),
            schemessubcategoryRes.json(),
            yearmasterRes.json(),
            documentsRes.json(),
            talukaRes.json(),
            villagesRes.json()
        ]);

        return { users, schemes, farmers, schemescrud, schemessubcategory, yearmaster, documents, taluka, villages };
    } catch (error) {
        console.error('Error fetching farmers data:', error);
        return {
            users: [],
            schemes: [],
            farmers: [],
            schemescrud: [],
            schemessubcategory: [],
            yearmaster: [],
            documents: [],
            taluka: [],
            villages: [],
        };
    }
}


export default async function Ecommerce() {

    const farmersData = await fetchFarmersData();

    return (
        <div className="grid grid-cols-6 gap-4 md:gap-6">
            <div className="col-span-12 space-y-5 xl:col-span-7 ">
                {/* <Loader /> */}
                <Suspense fallback={<Loader />}>
                    <DistrictMap farmersData={farmersData} />
                </Suspense>
            </div>
        </div>
    );
}
