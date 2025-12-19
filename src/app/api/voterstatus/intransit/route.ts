import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10000', 10);

    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 50000);
    const offset = (validPage - 1) * validLimit;

    // Get in transit list - voters where voting_status = "In Transit"
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         v.id,
         v.Voter_Id,
         v.full_name,
         v.ENG_Full_name,
         v.Age,
         v.Gender,
         v.House_Number,
         v.Updated_colony,
         v.updated_mobile_no,
         v.Updated_photo,
         v.user_id,
         v.updated_house_number,
         v.family_member,
         v.status,
         v.created_at,
         v.updated_at,
         v.volunteer_name,
         v.volunteer_mobile,
         v.volunteer_status,
         v.assigned_colony_name,
         v.assigned_colony_id,
         v.assigned_volunteer_id,
         v.inst_1_paid,
         v.inst_2_paid,
         v.inst_3_paid,
         v.voting_paid,
         v.voting_in_transit,
         v.voting_status,
         c.colony_name
       FROM tbl_voters_search v
       LEFT JOIN colony c ON v.Updated_colony = c.colony_id
       WHERE v.voting_status = 'In Transit'
       ORDER BY v.id DESC
       LIMIT ? OFFSET ?`,
      [validLimit, offset],
    );

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total 
       FROM tbl_voters_search 
       WHERE voting_status = 'In Transit'`,
    );
    const totalRecords = Number(countRows[0]?.total || 0);

    return NextResponse.json({
      data: rows,
      pagination: {
        currentPage: validPage,
        totalPages: Math.ceil(totalRecords / validLimit),
        totalRecords: totalRecords,
        recordsPerPage: validLimit,
      },
    });
  } catch (error) {
    console.error('intransit GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch in transit list data' }, { status: 500 });
  }
}

