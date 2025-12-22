import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const primaryPersonId = searchParams.get('primary_person_id');

    if (!primaryPersonId) {
      return NextResponse.json(
        { error: 'primary_person_id is required' },
        { status: 400 }
      );
    }

    // Get all family members including primary person (where family_member = primary_person_id)
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         v.id,
         v.Voter_Id,
         v.full_name,
         v.ENG_Full_name,
         v.Age,
         v.Gender,
         v.family_member,
         v.Updated_colony,
         v.updated_mobile_no,
         v.voting_status,
         v.voting_paid,
         v.voting_in_transit,
         v.inst_1_paid,
         v.inst_2_paid,
         v.inst_3_paid,
         c.colony_name
       FROM tbl_voters_search v
       LEFT JOIN colony c ON v.Updated_colony = c.colony_id
       WHERE v.family_member = ?
       ORDER BY 
         CASE WHEN v.Voter_Id = v.family_member THEN 0 ELSE 1 END,
         v.full_name ASC`,
      [primaryPersonId]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('familymembers GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch family members' }, { status: 500 });
  }
}

