// app/api/schoolwisedata/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

// Get School Wise Data from volunteer_master table
// Filter by category_id = 6
// assign_booth_number contains comma-separated values like "1,2,3,4,5"
// school_name contains the school names

interface SchoolWiseRow extends RowDataPacket {
    user_id: number;
    volunteer_name: string;
    assign_booth_number: string | null;
    school_name: string | null;
    category_id: number | null;
}

interface SchoolData {
    school_number: number;
    school_name: string;
    total_voters: number;
    voting_done: number;
    voting_pending: number;
}

export async function GET() {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Fetch volunteers with category_id = 6
        const [rows] = await connection.query<SchoolWiseRow[]>(
            `SELECT 
                user_id,
                volunteer_name,
                assign_booth_number,
                school_name,
                category_id
            FROM volunteer_master
            WHERE category_id = 6
                AND assign_booth_number IS NOT NULL
                AND assign_booth_number != ''
                AND school_name IS NOT NULL
                AND school_name != ''
            ORDER BY assign_booth_number ASC
            `
        );
        
        // Process the data to create school-wise statistics
        // Group by school_name and aggregate booth numbers from assign_booth_number
        const schoolDataMap = new Map<string, { boothNumbers: number[]; minBooth: number }>();
        
        // Parse assign_booth_number and school_name from each row
        rows.forEach((row) => {
            if (!row.assign_booth_number || !row.school_name) return;
            
            const schoolName = row.school_name.trim();
            
            // Split comma-separated booth numbers
            const boothNumbers = row.assign_booth_number
                .split(',')
                .map(bn => parseInt(bn.trim(), 10))
                .filter(bn => !isNaN(bn));
            
            if (boothNumbers.length === 0) return;
            
            // Aggregate booth numbers for this school
            if (!schoolDataMap.has(schoolName)) {
                schoolDataMap.set(schoolName, { boothNumbers: [], minBooth: Math.min(...boothNumbers) });
            }
            
            const schoolData = schoolDataMap.get(schoolName);
            if (schoolData) {
                boothNumbers.forEach(bn => {
                    if (!schoolData.boothNumbers.includes(bn)) {
                        schoolData.boothNumbers.push(bn);
                    }
                });
                schoolData.minBooth = Math.min(schoolData.minBooth, ...boothNumbers);
            }
        });
        
        // Get voting statistics for each school based on booth numbers
        const schoolStats: SchoolData[] = [];
        
        for (const [schoolName, schoolInfo] of schoolDataMap.entries()) {
            // Sort booth numbers
            schoolInfo.boothNumbers.sort((a, b) => a - b);
            
            const boothNumbers = schoolInfo.boothNumbers.map(bn => String(bn));
            const placeholders = boothNumbers.map(() => '?').join(',');
            
            // Get total voters, voting done, and voting pending for these booth numbers
            const [statsRows] = await connection.query<RowDataPacket[]>(
                `SELECT 
                    COUNT(*) as total_voters,
                    SUM(CASE WHEN voting_status = 'Completed' OR voting_status = 'Direct' THEN 1 ELSE 0 END) as voting_done,
                    SUM(CASE WHEN voting_status IS NULL OR voting_status = '' OR voting_status = 'Pending' THEN 1 ELSE 0 END) as voting_pending
                FROM tbl_voters_search
                WHERE Booth_Number IN (${placeholders})
                    AND Booth_Number IS NOT NULL
                    AND Booth_Number != ''
                `,
                boothNumbers
            );
            
            const stats = statsRows[0] || { total_voters: 0, voting_done: 0, voting_pending: 0 };
            
            // Use the minimum booth number as school number for display
            schoolStats.push({
                school_number: schoolInfo.minBooth,
                school_name: schoolName,
                total_voters: Number(stats.total_voters) || 0,
                voting_done: Number(stats.voting_done) || 0,
                voting_pending: Number(stats.voting_pending) || 0
            });
        }
        
        // Sort by school number
        schoolStats.sort((a, b) => a.school_number - b.school_number);
        
        return NextResponse.json(schoolStats);
    } catch (error) {
        console.error('Database query failed (GET):', error);
        return NextResponse.json(
            { message: 'Failed to fetch school wise data', error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    } finally {
        if (connection) connection.release();
    }
}

