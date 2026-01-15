import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const voterIdParam = formData.get('voter_id');

    if (!voterIdParam) {
      return NextResponse.json(
        {
          status: false,
          message: 'voter_id is required',
        },
        { status: 400 }
      );
    }

    // Handle string or array
    let voterIds: string[] = [];
    if (Array.isArray(voterIdParam)) {
      voterIds = voterIdParam.map((v) => v.toString());
    } else {
      voterIds = voterIdParam.toString().split(',');
    }

    // Clean values
    voterIds = voterIds.map((id) => id.trim()).filter((id) => id);

    if (voterIds.length === 0) {
      return NextResponse.json(
        {
          status: false,
          message: 'Invalid voter_id values',
        },
        { status: 400 }
      );
    }

    // Colony filter
    const colonyFilter = `(
      tvs.Updated_colony IS NULL 
      OR tvs.Updated_colony = '' 
      OR tvs.Updated_colony = 0
      OR EXISTS (
        SELECT 1 FROM colony 
        WHERE colony.colony_id = CAST(tvs.Updated_colony AS UNSIGNED) 
        AND colony.status = 'Active'
      )
    )`;

    const placeholders = voterIds.map(() => '?').join(',');
    const query = `
      SELECT tvs.*, c.status as colony_status 
      FROM tbl_voters_search tvs 
      LEFT JOIN colony c ON c.colony_id = CAST(tvs.Updated_colony AS UNSIGNED)
      WHERE tvs.family_member IN (${placeholders}) AND ${colonyFilter}
    `;

    const [data] = await pool.query<RowDataPacket[]>(query, voterIds);

    return NextResponse.json({
      status: true,
      count: data.length,
      message: 'Family members fetched successfully',
      data: data,
    });
  } catch (error) {
    console.error('Error fetching voters by voter_id:', error);
    return NextResponse.json(
      {
        status: false,
        message: error instanceof Error ? error.message : 'Failed to fetch data',
      },
      { status: 500 }
    );
  }
}

