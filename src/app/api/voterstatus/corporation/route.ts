import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    // Get ALL voter data from tbl_voters_search without any WHERE conditions or LIMIT
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * from tbl_voters_search`,
    );

    return NextResponse.json({
      data: rows,
    });
  } catch (error) {
    console.error('corporation GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch corporation list data' }, { status: 500 });
  }
}

