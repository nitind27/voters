import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { ResultSetHeader } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { volunteer_name, volunteer_mobile, primary_person_id } = body;

    if (!volunteer_name || !primary_person_id) {
      return NextResponse.json(
        { error: 'volunteer_name and primary_person_id are required' },
        { status: 400 }
      );
    }

    // Update all family members (where family_member = primary_person_id)
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE tbl_voters_search
       SET volunteer_name = ?,
           volunteer_mobile = ?,
           volunteer_status = 'Active',
           assigned_colony_name = Updated_colony,
           assigned_colony_id = Updated_colony,
           updated_at = NOW()
       WHERE family_member = ?`,
      [volunteer_name, volunteer_mobile || null, primary_person_id]
    );

    return NextResponse.json({
      success: true,
      affectedRows: result.affectedRows,
      message: `Volunteer assigned to ${result.affectedRows} family members`,
    });
  } catch (error) {
    console.error('assignvolunteer POST error:', error);
    return NextResponse.json({ error: 'Failed to assign volunteer' }, { status: 500 });
  }
}

