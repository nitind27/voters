import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const primaryPersonId = searchParams.get('primary_person_id');
    const primaryPersonIds = searchParams.get('primary_person_ids'); // Batch support: comma-separated IDs

    // Support both single and batch requests
    let primaryPersonIdList: string[] = [];
    
    if (primaryPersonIds) {
      // Batch mode: parse comma-separated IDs
      primaryPersonIdList = primaryPersonIds.split(',').map(id => id.trim()).filter(Boolean);
    } else if (primaryPersonId) {
      // Single mode: use single ID
      primaryPersonIdList = [primaryPersonId];
    } else {
      return NextResponse.json(
        { error: 'primary_person_id or primary_person_ids is required' },
        { status: 400 }
      );
    }

    if (primaryPersonIdList.length === 0) {
      return NextResponse.json([]);
    }

    // Build query with IN clause for batch requests
    const placeholders = primaryPersonIdList.map(() => '?').join(',');
    
    // Get all family members including primary person (where family_member IN (...))
    // Optimized: Simplified ORDER BY for better performance with large batches
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
         v.Sr_No,
         v.Booth_Number,
         v.Booth_Name,
         v.Booth_Address,
         c.colony_name
       FROM tbl_voters_search v
       LEFT JOIN colony c ON v.Updated_colony = c.colony_id
       WHERE v.family_member IN (${placeholders})`,
      primaryPersonIdList
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('familymembers GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch family members' }, { status: 500 });
  }
}

