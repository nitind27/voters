import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const page = Math.max(1, parseInt(formData.get('page')?.toString() || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(formData.get('page_size')?.toString() || '50', 10)));
    const offset = (page - 1) * pageSize;
    const search = (formData.get('search')?.toString() || '').trim();
    const colonyId = parseInt(formData.get('colony_id')?.toString() || '0', 10);

    // Build conditions
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // Colony filter condition
    conditions.push(`(
      v.Updated_colony IS NULL 
      OR v.Updated_colony = '' 
      OR v.Updated_colony = 0
      OR EXISTS (
        SELECT 1 FROM colony 
        WHERE colony.colony_id = CAST(v.Updated_colony AS UNSIGNED) 
        AND colony.status = 'Active'
      )
    )`);

    if (colonyId > 0) {
      conditions.push('v.Updated_colony = ?');
      params.push(colonyId);
    }

    if (search !== '') {
      conditions.push('(v.full_name LIKE ? OR v.Voter_Id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Total count query
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM tbl_voters_search v ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

    // Main data query
    const query = `
      SELECT 
        v.*,
        c.status as colony_status,
        CASE 
          WHEN v.family_member IS NULL OR TRIM(v.family_member) = '' OR v.family_member = '0' 
          THEN 0
          ELSE (
            SELECT COUNT(*) 
            FROM tbl_voters_search v2 
            WHERE TRIM(v2.family_member) = TRIM(v.family_member)
            AND v2.family_member IS NOT NULL 
            AND TRIM(v2.family_member) != '' 
            AND v2.family_member != '0'
          )
        END AS family_count
      FROM tbl_voters_search v
      LEFT JOIN colony c ON c.colony_id = CAST(v.Updated_colony AS UNSIGNED)
      ${whereClause}
      ORDER BY v.id DESC
      LIMIT ? OFFSET ?
    `;

    const [data] = await pool.query<RowDataPacket[]>(
      query,
      [...params, pageSize, offset]
    );

    return NextResponse.json({
      success: true,
      count: data.length,
      total: total,
      page: page,
      page_size: pageSize,
      data: data,
    });
  } catch (error) {
    console.error('Error fetching corporation data:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch data',
      },
      { status: 500 }
    );
  }
}

