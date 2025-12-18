import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { ResultSetHeader } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      volunteer_name,
      volunteer_mobile,
      volunteer_status,
      colony_names,
    } = body as {
      volunteer_name?: string;
      volunteer_mobile?: string | null;
      volunteer_status?: 'Active' | 'Inactive';
      colony_names?: string[];
    };

    if (!volunteer_name || !Array.isArray(colony_names) || colony_names.length === 0) {
      return NextResponse.json(
        { error: 'volunteer_name and colony_names are required' },
        { status: 400 },
      );
    }

    const placeholders = colony_names.map(() => '?').join(',');

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE tbl_voters_search
       SET volunteer_name       = ?,
           volunteer_mobile     = ?,
           volunteer_status     = ?,
           assigned_colony_name = Updated_colony,
           Updated_at           = NOW()
       WHERE Updated_colony IN (${placeholders})`,
      [
        volunteer_name,
        volunteer_mobile || null,
        volunteer_status || 'Active',
        ...colony_names,
      ],
    );

    return NextResponse.json({
      success: true,
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    console.error('votermaster assign error:', error);
    return NextResponse.json({ error: 'Failed to assign volunteer' }, { status: 500 });
  }
}


