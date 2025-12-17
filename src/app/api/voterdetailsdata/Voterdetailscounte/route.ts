import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

// Get count of voter details where updated_at is NOT NULL
export async function GET() {
    try {
        const [countResult] = await pool.query<RowDataPacket[]>(
            `SELECT COUNT(*) as total FROM voter_details_old WHERE updated_at IS NOT NULL`
        );
        
        return NextResponse.json({
            total: countResult[0].total
        });
    } catch (error) {
        console.error('Count fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 });
    }
}

