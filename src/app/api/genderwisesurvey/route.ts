// app/api/genderwisesurvey/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

// Get gender wise survey data - count male and female per colony
// Gender = 'पु' → Male, Gender != 'पु' → Female
// WHERE updated_at IS NOT NULL

interface GenderWiseSurveyRow extends RowDataPacket {
    colony_id: number | null;
    colony_name: string | null;
    male_count: number | string;
    female_count: number | string;
    total_count: number | string;
}

export async function GET() {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Query to count male (Gender = 'पु') and female (Gender != 'पु') per colony
        // Matches exact database queries:
        // - Gender = 'पु' → Male (5490 total)
        // - Gender != 'पु' → Female (5190 total)
        // WHERE updated_at IS NOT NULL
        const query = `
            SELECT 
                v.Updated_colony as colony_id,
                c.colony_name,
                SUM(CASE WHEN v.Gender = 'पु' THEN 1 ELSE 0 END) as male_count,
                SUM(CASE WHEN v.Gender != 'पु' THEN 1 ELSE 0 END) as female_count,
                COUNT(*) as total_count
            FROM tbl_voters_search v
            LEFT JOIN colony c ON v.Updated_colony = c.colony_id
            WHERE v.updated_at IS NOT NULL
                AND v.Updated_colony IS NOT NULL
            GROUP BY v.Updated_colony, c.colony_name
            ORDER BY c.colony_name ASC
        `;
        
        const [rows] = await connection.query<GenderWiseSurveyRow[]>(query);
        
        // Format the response
        const formattedData = rows.map((row: GenderWiseSurveyRow) => ({
            colony_id: row.colony_id,
            colony_name: row.colony_name || `Colony ${row.colony_id}`,
            male_count: Number(row.male_count) || 0,
            female_count: Number(row.female_count) || 0,
            total_count: Number(row.total_count) || 0
        }));
        
        return NextResponse.json(formattedData);
    } catch (error) {
        console.error('Database query failed (GET):', error);
        return NextResponse.json(
            { message: 'Failed to fetch gender wise survey data', error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    } finally {
        if (connection) connection.release();
    }
}

