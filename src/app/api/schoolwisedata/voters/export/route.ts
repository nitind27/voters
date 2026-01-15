// app/api/schoolwisedata/voters/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

// Export voters by school (booth numbers) with filters - returns all matching records (no pagination)
export async function GET(request: NextRequest) {
    let connection;
    try {
        const { searchParams } = new URL(request.url);
        // const exportType = searchParams.get('type') || 'excel'; // 'excel' or 'pdf'
        const boothNumbers = searchParams.get('booth_numbers') || '';
        const search = searchParams.get('search') || '';
        const colonyId = searchParams.get('colony_id') || '';
        const filterType = searchParams.get('filter_type') || 'all';
        
        if (!boothNumbers) {
            return NextResponse.json(
                { error: 'booth_numbers is required' },
                { status: 400 }
            );
        }
        
        connection = await pool.getConnection();
        
        // Parse booth numbers
        const boothNumbersArray = boothNumbers
            .split(',')
            .map(bn => bn.trim())
            .filter(Boolean);
        
        if (boothNumbersArray.length === 0) {
            return NextResponse.json({ data: [] }, { status: 200 });
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
        
        // Get all matching data (no pagination for export)
        const [rows] = await connection.query<RowDataPacket[]>(
            `SELECT 
                tvs.*,
                c.colony_name
            FROM tbl_voters_search tvs
            LEFT JOIN colony c ON c.colony_id = IF(tvs.Updated_colony REGEXP '^[0-9]+$', CAST(tvs.Updated_colony AS UNSIGNED), NULL)
            ${whereClause}
            ORDER BY tvs.id DESC`,
            params
        );
        
        return NextResponse.json({
            data: rows,
            total: rows.length
        });
    } catch (error) {
        console.error('Export query failed:', error);
        return NextResponse.json(
            { error: 'Failed to export voters', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    } finally {
        if (connection) connection.release();
    }
}

