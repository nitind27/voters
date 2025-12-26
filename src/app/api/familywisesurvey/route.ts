// app/api/familywisesurvey/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

// GET Method - Family Wise Survey - Get primary persons (Voter_Id = family_member) with family member counts
export async function GET(request: Request) {
    let connection;
    try {
        const { searchParams } = new URL(request.url);
        const familyMemberId = searchParams.get('family_member_id');
        
        connection = await pool.getConnection();
        
        // If family_member_id is provided, return all family members with that family_member value (excluding primary person)
        if (familyMemberId) {
            const query = `
                SELECT 
                    v.id,
                    v.Voter_Id,
                    v.full_name,
                    v.ENG_Full_name,
                    v.Age,
                    v.Gender,
                    v.House_Number,
                    v.Updated_colony,
                    v.updated_mobile_no,
                    v.Updated_photo,
                    v.user_id,
                    v.updated_house_number,
                    v.family_member,
                    v.status,
                    v.created_at,
                    v.updated_at,
                    c.colony_name,
                    u.name as user_name
                FROM tbl_voters_search v
                LEFT JOIN colony c ON v.Updated_colony = c.colony_id
                LEFT JOIN users u ON v.user_id = u.user_id
                WHERE v.family_member = ?
                    AND v.Voter_Id != ?
                ORDER BY v.id DESC
            `;
            
            const [rows] = await connection.query<RowDataPacket[]>(query, [familyMemberId, familyMemberId]);
            return NextResponse.json(rows);
        }
        
        // Get primary persons (where Voter_Id = family_member) with family member counts
        // Use pagination to avoid timeout
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const validPage = Math.max(1, page);
        // Allow up to 50000 records per page to handle large datasets
        const validLimit = Math.min(Math.max(1, limit), 50000); // Max 50000 per page
        const offset = (validPage - 1) * validLimit;
        
        // Optimized query using LEFT JOIN with GROUP BY instead of correlated subquery for better performance
        const query = `
            SELECT 
                v.id,
                v.Voter_Id,
                v.full_name,
                v.ENG_Full_name,
                v.Age,
                v.Gender,
                v.House_Number,
                v.Updated_colony,
                v.updated_mobile_no,
                v.Updated_photo,
                v.user_id,
                v.updated_house_number,
                v.family_member,
                v.status,
                v.created_at,
                v.updated_at,
                c.colony_name,
                u.name as user_name,
                COALESCE(fm_counts.family_member_count, 0) as family_member_count
            FROM tbl_voters_search v
            LEFT JOIN colony c ON v.Updated_colony = c.colony_id
            LEFT JOIN users u ON v.user_id = u.user_id
            LEFT JOIN (
                SELECT family_member, COUNT(*) as family_member_count
                FROM tbl_voters_search
                WHERE family_member IS NOT NULL 
                    AND family_member != ''
                    AND Voter_Id != family_member
                GROUP BY family_member
            ) fm_counts ON v.Voter_Id = fm_counts.family_member
            WHERE v.family_member IS NOT NULL 
                AND v.family_member != ''
                AND v.Voter_Id = v.family_member
            ORDER BY v.id DESC
            LIMIT ? OFFSET ?
        `;
        
        const [rows] = await connection.query<RowDataPacket[]>(query, [validLimit, offset]);
        
        // Get total count for pagination
        const [countRows] = await connection.query<RowDataPacket[]>(
            `SELECT COUNT(*) as total 
             FROM tbl_voters_search 
             WHERE family_member IS NOT NULL 
                 AND family_member != ''
                 AND Voter_Id = family_member`
        );
        const totalRecords = Number(countRows[0]?.total || 0);

        return NextResponse.json({
            data: rows,
            pagination: {
                currentPage: validPage,
                totalPages: Math.ceil(totalRecords / validLimit),
                totalRecords: totalRecords,
                recordsPerPage: validLimit,
            },
        });
    } catch (error) {
        console.error('Database query failed (GET):', error);
        return NextResponse.json(
            { message: 'Failed to fetch family wise survey data' },
            { status: 500 }
        );
    } finally {
        if (connection) connection.release();
    }
}

