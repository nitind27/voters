import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    // Get volunteers from volunteer_master table
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         volunteer_name,
         contact_no as volunteer_mobile,
         status as volunteer_status,
         colony_id
       FROM volunteer_master
       WHERE volunteer_name IS NOT NULL 
         AND volunteer_name != ''
         AND status = 'Active'
       ORDER BY volunteer_name ASC`,
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('volunteers GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch volunteers' }, { status: 500 });
  }
}

