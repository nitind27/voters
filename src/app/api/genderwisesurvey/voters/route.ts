// app/api/genderwisesurvey/voters/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

// Get voters by colony and gender for Gender Wise Survey modal
// Gender = 'पु' → Male, Gender != 'पु' → Female
// WHERE updated_at = 1
export async function GET(request: NextRequest) {
    let connection;
    try {
        const { searchParams } = new URL(request.url);
        const colonyId = searchParams.get('colony_id');
        const gender = searchParams.get('gender'); // 'male' or 'female'
        
        if (!colonyId) {
            return NextResponse.json(
                { error: 'colony_id is required' },
                { status: 400 }
            );
        }
        
        if (!gender || (gender !== 'male' && gender !== 'female')) {
            return NextResponse.json(
                { error: 'gender must be "male" or "female"' },
                { status: 400 }
            );
        }
        
        connection = await pool.getConnection();
        
        // Build gender condition
        const genderCondition = gender === 'male' 
            ? "v.Gender = 'पु'" 
            : "v.Gender != 'पु'";
        
        // Query to get voters by colony and gender
        const query = `
            SELECT 
                v.id,
                v.Voter_Id,
                v.full_name,
                v.ENG_Full_name,
                v.Age,
                v.Gender,
                v.House_Number,
                v.updated_house_number,
                v.updated_mobile_no,
                v.Updated_colony,
                c.colony_name
            FROM tbl_voters_search v
            LEFT JOIN colony c ON v.Updated_colony = c.colony_id
            WHERE v.updated_at = 1
                AND v.Updated_colony = ?
                AND ${genderCondition}
            ORDER BY v.full_name ASC
        `;
        
        const [rows] = await connection.query<RowDataPacket[]>(query, [colonyId]);
        
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Database query failed (GET):', error);
        return NextResponse.json(
            { message: 'Failed to fetch voters data', error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    } finally {
        if (connection) connection.release();
    }
}

