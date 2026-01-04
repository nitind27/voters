import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const volunteerName = searchParams.get('volunteer_name');

    if (!volunteerName) {
      return NextResponse.json({ error: 'volunteer_name is required' }, { status: 400 });
    }

    // Get primary_person_id for the volunteer
    const [volunteerRows] = await pool.query<RowDataPacket[]>(
      `SELECT primary_person_id
       FROM volunteer_master
       WHERE volunteer_name = ? 
         AND primary_person_id IS NOT NULL 
         AND primary_person_id != ''`,
      [volunteerName],
    );

    if (volunteerRows.length === 0 || !volunteerRows[0].primary_person_id) {
      return NextResponse.json([]);
    }

    // Parse comma-separated primary person IDs
    const personIds = String(volunteerRows[0].primary_person_id)
      .split(',')
      .map((id: string) => id.trim())
      .filter(Boolean);

    if (personIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch primary person details
    const placeholders = personIds.map(() => '?').join(',');
    const [primaryPersons] = await pool.query<RowDataPacket[]>(
      `SELECT 
         v.id,
         v.Voter_Id,
         v.full_name,
         v.ENG_Full_name,
         v.Updated_colony,
         v.updated_mobile_no,
         v.updated_house_number,
         v.House_Number,
         c.colony_name
       FROM tbl_voters_search v
       LEFT JOIN colony c ON v.Updated_colony = c.colony_id
       WHERE v.id IN (${placeholders})
       ORDER BY v.full_name ASC`,
      personIds,
    );

    return NextResponse.json(primaryPersons);
  } catch (error) {
    console.error('volunteer-primarypersons GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch primary persons for volunteer' }, { status: 500 });
  }
}

