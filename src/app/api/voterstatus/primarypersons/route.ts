import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const colonyName = searchParams.get('colony_name');
    const colonyId = searchParams.get('colony_id');

    let whereClause = `v.family_member IS NOT NULL 
         AND v.family_member != ''
         AND v.Voter_Id = v.family_member`;
    const params: (string | number)[] = [];

    // Filter by colony if provided
    if (colonyName) {
      whereClause += ` AND c.colony_name = ?`;
      params.push(colonyName);
    } else if (colonyId) {
      whereClause += ` AND v.Updated_colony = ?`;
      params.push(colonyId);
    }

    // Get primary persons (where Voter_Id = family_member)
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         v.id,
         v.Voter_Id,
         v.full_name,
         v.ENG_Full_name,
         v.family_member,
         v.Updated_colony,
         v.updated_mobile_no,
         v.updated_house_number,
         v.House_Number,
         c.colony_name
       FROM tbl_voters_search v
       LEFT JOIN colony c ON v.Updated_colony = c.colony_id
       WHERE ${whereClause}
       ORDER BY v.full_name ASC`,
      params,
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('primarypersons GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch primary persons' }, { status: 500 });
  }
}

