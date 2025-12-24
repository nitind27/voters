import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : null;

    const validPage = Math.max(1, page);
    // If limit is not provided or is 0, fetch all records
    const validLimit = limit && limit > 0 ? limit : null;
    const offset = validLimit ? (validPage - 1) * validLimit : 0;

    // Get finance list - voters where any installment is paid (inst_1_paid, inst_2_paid, or inst_3_paid = '1')
    // OR all three installments are unpaid (all = '0') for Total Unpaid filter
    let query = `SELECT 
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
       WHERE (v.inst_1_paid = '1' OR v.inst_2_paid = '1' OR v.inst_3_paid = '1' OR
             v.inst_1_paid = 1 OR v.inst_2_paid = 1 OR v.inst_3_paid = 1)
          OR ((v.inst_1_paid = '0' OR v.inst_1_paid = 0 OR v.inst_1_paid IS NULL OR v.inst_1_paid = '') 
              AND (v.inst_2_paid = '0' OR v.inst_2_paid = 0 OR v.inst_2_paid IS NULL OR v.inst_2_paid = '') 
              AND (v.inst_3_paid = '0' OR v.inst_3_paid = 0 OR v.inst_3_paid IS NULL OR v.inst_3_paid = ''))
       ORDER BY v.id DESC`;
    
    const queryParams: number[] = [];
    if (validLimit) {
      query += ` LIMIT ? OFFSET ?`;
      queryParams.push(validLimit, offset);
    }

    const [rows] = await pool.query<RowDataPacket[]>(query, queryParams.length > 0 ? queryParams : undefined);

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total 
       FROM tbl_voters_search 
       WHERE (inst_1_paid = '1' OR inst_2_paid = '1' OR inst_3_paid = '1' OR
             inst_1_paid = 1 OR inst_2_paid = 1 OR inst_3_paid = 1)
          OR ((inst_1_paid = '0' OR inst_1_paid = 0 OR inst_1_paid IS NULL OR inst_1_paid = '') 
              AND (inst_2_paid = '0' OR inst_2_paid = 0 OR inst_2_paid IS NULL OR inst_2_paid = '') 
              AND (inst_3_paid = '0' OR inst_3_paid = 0 OR inst_3_paid IS NULL OR inst_3_paid = ''))`,
    );
    const totalRecords = Number(countRows[0]?.total || 0);

    return NextResponse.json({
      data: rows,
      pagination: {
        currentPage: validPage,
        totalPages: validLimit ? Math.ceil(totalRecords / validLimit) : 1,
        totalRecords: totalRecords,
        recordsPerPage: validLimit || totalRecords,
      },
    });
  } catch (error) {
    console.error('finance GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch finance list data' }, { status: 500 });
  }
}

