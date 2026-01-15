import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM colony WHERE status = 'Active'"
    );

    // Convert colony_id to integer
    const response = rows.map((row) => ({
      ...row,
      colony_id: row.colony_id ? Number(row.colony_id) : row.colony_id,
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching colonies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch colonies' },
      { status: 500 }
    );
  }
}

