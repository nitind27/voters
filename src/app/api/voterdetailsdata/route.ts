import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

const ITEMS_PER_PAGE = 50;

// Get voter details with pagination and search filters
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || String(ITEMS_PER_PAGE), 10);
        
        // Search filters
        const voterId = searchParams.get('voter_id') || '';
        const fullName = searchParams.get('full_name') || '';
        const search = searchParams.get('search') || ''; // General search for both fields
        
        // Validate page number
        const validPage = Math.max(1, page);
        const validLimit = Math.min(Math.max(1, limit), 100); // Max 100 items per page
        const offset = (validPage - 1) * validLimit;

        // Build WHERE clause dynamically
        const conditions: string[] = ['updated_at IS NULL'];
        const queryParams: (string | number)[] = [];

        // If general search is provided, search in both voter_id and full_name
        if (search.trim()) {
            // Split search into words for flexible matching (order doesn't matter)
            const searchWords = search.trim().split(/\s+/).filter(word => word.length > 0);
            if (searchWords.length > 0) {
                const wordConditions = searchWords.map(() => 'full_name LIKE ?').join(' AND ');
                conditions.push(`(Voter_Id LIKE ? OR (${wordConditions}))`);
                queryParams.push(`%${search.trim()}%`);
                searchWords.forEach(word => queryParams.push(`%${word}%`));
            }
        } else {
            // Individual field filters
            if (voterId.trim()) {
                conditions.push('Voter_Id LIKE ?');
                queryParams.push(`%${voterId.trim()}%`);
            }
            if (fullName.trim()) {
                // Split full_name into words for flexible matching (order doesn't matter)
                const nameWords = fullName.trim().split(/\s+/).filter(word => word.length > 0);
                if (nameWords.length > 0) {
                    const wordConditions = nameWords.map(() => 'full_name LIKE ?').join(' AND ');
                    conditions.push(`(${wordConditions})`);
                    nameWords.forEach(word => queryParams.push(`%${word}%`));
                }
            }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count for pagination (with filters)
        const [countResult] = await pool.query<RowDataPacket[]>(
            `SELECT COUNT(*) as total FROM voter_details_old ${whereClause}`,
            queryParams
        );
        const totalRecords = countResult[0].total;
        const totalPages = Math.ceil(totalRecords / validLimit);

        // Get paginated data (with filters)
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT * FROM voter_details_old ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
            [...queryParams, validLimit, offset]
        );

        return NextResponse.json({
            data: rows,
            pagination: {
                currentPage: validPage,
                totalPages: totalPages,
                totalRecords: totalRecords,
                recordsPerPage: validLimit,
                hasNextPage: validPage < totalPages,
                hasPrevPage: validPage > 1
            },
            filters: {
                voter_id: voterId,
                full_name: fullName,
                search: search
            }
        });
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}