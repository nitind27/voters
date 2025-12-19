import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    // Get primary persons (where Voter_Id = family_member)
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         v.Voter_Id,
         v.full_name,
         v.ENG_Full_name,
         v.family_member,
         v.Updated_colony,
         v.updated_mobile_no,
         c.colony_name
       FROM tbl_voters_search v
       LEFT JOIN colony c ON v.Updated_colony = c.colony_id
       WHERE v.family_member IS NOT NULL 
         AND v.family_member != ''
         AND v.Voter_Id = v.family_member
       ORDER BY v.full_name ASC`,
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('primarypersons GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch primary persons' }, { status: 500 });
  }
}

