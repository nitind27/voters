// app/api/boothaddresswise/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

// Get Booth_Address wise voting statistics
// Voting Done = voting_status = 'Completed' OR 'Direct'
// Voting Pending = voting_status = 'Pending' OR NULL OR empty
// Total Voters = all voters for that Booth_Address

interface BoothAddressWiseRow extends RowDataPacket {
    booth_address: string | null;
    total_voters: number | string;
    voting_done: number | string;
    voting_pending: number | string;
}

export async function GET() {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Query to count voters by Booth_Address with voting status breakdown
        const query = `
            SELECT 
                v.Booth_Address as booth_address,
                COUNT(*) as total_voters,
                SUM(CASE WHEN v.voting_status = 'Completed' OR v.voting_status = 'Direct' THEN 1 ELSE 0 END) as voting_done,
                SUM(CASE WHEN v.voting_status IS NULL OR v.voting_status = '' OR v.voting_status = 'Pending' THEN 1 ELSE 0 END) as voting_pending
            FROM tbl_voters_search v
            WHERE v.Booth_Address IS NOT NULL 
                AND v.Booth_Address != ''
            GROUP BY v.Booth_Address
            ORDER BY v.Booth_Address ASC
        `;
        
        const [rows] = await connection.query<BoothAddressWiseRow[]>(query);
        
        // Format the response
        const formattedData = rows.map((row: BoothAddressWiseRow) => ({
            booth_address: row.booth_address || 'Unknown',
            total_voters: Number(row.total_voters) || 0,
            voting_done: Number(row.voting_done) || 0,
            voting_pending: Number(row.voting_pending) || 0
        }));
        
        return NextResponse.json(formattedData);
    } catch (error) {
        console.error('Database query failed (GET):', error);
        return NextResponse.json(
            { message: 'Failed to fetch booth address wise statistics', error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    } finally {
        if (connection) connection.release();
    }
}

