// app/api/schoolwisedata/voters/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

// Get voters by school (booth numbers) with filters and pagination
export async function GET(request: NextRequest) {
    let connection;
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const boothNumbers = searchParams.get('booth_numbers') || ''; // Comma-separated booth numbers
        const search = searchParams.get('search') || '';
        const colonyId = searchParams.get('colony_id') || '';
        const filterType = searchParams.get('filter_type') || 'all'; // 'all', 'total', 'done', 'pending'
        
        if (!boothNumbers) {
            return NextResponse.json(
                { error: 'booth_numbers is required' },
                { status: 400 }
            );
        }
        
        connection = await pool.getConnection();
        
        const validPage = Math.max(1, page);
        const validLimit = Math.min(Math.max(1, limit), 100);
        const offset = (validPage - 1) * validLimit;
        
        // Parse booth numbers
        const boothNumbersArray = boothNumbers
            .split(',')
            .map(bn => bn.trim())
            .filter(Boolean);
        
        if (boothNumbersArray.length === 0) {
            return NextResponse.json({ data: [], total: 0, pagination: {} }, { status: 200 });
        }
        
        const placeholders = boothNumbersArray.map(() => '?').join(',');
        
        // Build WHERE conditions with table prefix
        const conditions: string[] = [`tvs.Booth_Number IN (${placeholders})`];
        const params: (string | number)[] = [...boothNumbersArray];
        
        // Filter by type
        if (filterType === 'done') {
            conditions.push("(tvs.voting_status = 'Completed' OR tvs.voting_status = 'Direct')");
        } else if (filterType === 'pending') {
            conditions.push("(tvs.voting_status IS NULL OR tvs.voting_status = '' OR tvs.voting_status = 'Pending' OR (tvs.voting_status != 'Completed' AND tvs.voting_status != 'Direct'))");
        }
        
        // Colony filter
        if (colonyId) {
            conditions.push('tvs.Updated_colony = ?');
            params.push(colonyId);
        }
        
        // Search filter
        if (search) {
            conditions.push('(tvs.full_name LIKE ? OR tvs.Voter_Id LIKE ? OR tvs.ENG_Full_name LIKE ? OR tvs.updated_mobile_no LIKE ?)');
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }
        
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        // Get total count
        const [countRows] = await connection.query<RowDataPacket[]>(
            `SELECT COUNT(*) as total FROM tbl_voters_search tvs ${whereClause}`,
            params
        );
        const total = Number(countRows[0]?.total || 0);
        
        // Get paginated data
        const [rows] = await connection.query<RowDataPacket[]>(
            `SELECT 
                tvs.*,
                c.colony_name
            FROM tbl_voters_search tvs
            LEFT JOIN colony c ON c.colony_id = IF(tvs.Updated_colony REGEXP '^[0-9]+$', CAST(tvs.Updated_colony AS UNSIGNED), NULL)
            ${whereClause}
            ORDER BY tvs.id DESC
            LIMIT ? OFFSET ?`,
            [...params, validLimit, offset]
        );
        
        const totalPages = Math.ceil(total / validLimit);
        
        return NextResponse.json({
            data: rows,
            total: total,
            pagination: {
                currentPage: validPage,
                totalPages: totalPages,
                totalRecords: total,
                recordsPerPage: validLimit,
                hasNextPage: validPage < totalPages,
                hasPrevPage: validPage > 1
            }
        });
    } catch (error) {
        console.error('Database query failed:', error);
        return NextResponse.json(
            { error: 'Failed to fetch voters', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    } finally {
        if (connection) connection.release();
    }
}

