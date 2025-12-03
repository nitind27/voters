import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

// Get all documents
export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM voter_details'
        );
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}