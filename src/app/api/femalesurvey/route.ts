// app/api/femalesurvey/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

// -------------------- GET Method - Only Female Voters (Gender = 'F' or 'स्त्री' or 'Female') where updated_at = 1 --------------------
export async function GET() {
    let connection;
    try {
        connection = await pool.getConnection();
        
        const query = `
            SELECT 
                v.id,
                v.Voter_Id,
                v.Ref_id,
                v.full_name,
                v.Father_name,
                v.Husband_name,
                v.Mother_name,
                v.Age,
                v.Gender,
                v.House_Number,
                v.Section_No_Name,
                v.Part_No,
                v.Updated_colony,
                v.updated_mobile_no,
                v.Updated_photo,
                v.updated_house_number,
                c.colony_name,
                COALESCE(v.female_survey, 'No') as female_survey
            FROM tbl_voters_search v
            LEFT JOIN colony c ON v.Updated_colony = c.colony_id
           
            ORDER BY v.id DESC
        `;
        
        const [rows] = await connection.query<RowDataPacket[]>(query);

        // Process the data to ensure female_survey is always a number
        const processedRows = rows.map(row => ({
            ...row,
            female_survey: row.female_survey || 'No' // Default to 'No' if null
        }));

        return NextResponse.json(processedRows);
    } catch (error) {
        console.error('Database query failed (GET):', error);
        return NextResponse.json(
            { message: 'Failed to fetch female voter data' },
            { status: 500 }
        );
    } finally {
        if (connection) connection.release();
    }
}

