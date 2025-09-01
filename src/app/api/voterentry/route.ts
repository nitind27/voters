// app/api/taluka/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

// -------------------- GET Method --------------------
export async function GET() {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>(`
            SELECT 
                ve.*,
                c.colony_name
            FROM voter_entry ve
            LEFT JOIN colony_entry ce ON ve.colony_entry_id = ce.colony_entry_id
            LEFT JOIN colony c ON ce.colony_id = c.colony_id
            WHERE ve.status = "Active"
        `);

        return NextResponse.json(rows);
    } catch (error) {
        console.error('Database query failed (GET):', error);
        return NextResponse.json(
            { message: 'Failed to fetch voter entries' },
            { status: 500 }
        );
    } finally {
        if (connection) connection.release();
    }
}
