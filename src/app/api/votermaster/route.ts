import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

const ITEMS_PER_PAGE = 50;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || String(ITEMS_PER_PAGE), 10);
    const search = (searchParams.get('search') || '').trim();

    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 200);
    const offset = (validPage - 1) * validLimit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      conditions.push('(Voter_Id LIKE ? OR full_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM tbl_voters_search ${whereClause}`,
      params,
    );
    const totalRecords = Number(countRows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(totalRecords / validLimit));

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         id,
         Voter_Id,
         full_name,
         House_Number,
         Updated_colony,
         updated_house_number,
         updated_mobile_no,
         volunteer_name,
         volunteer_mobile,
         volunteer_status,
         assigned_colony_name,
         inst_1_paid,
         inst_2_paid,
         inst_3_paid,
         voting_paid,
         voting_in_transit,
         voting_status
       FROM tbl_voters_search
       ${whereClause}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, validLimit, offset],
    );

    return NextResponse.json({
      data: rows,
      pagination: {
        currentPage: validPage,
        totalPages,
        totalRecords,
      },
    });
  } catch (error) {
    console.error('votermaster GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch voter master data' }, { status: 500 });
  }
}


