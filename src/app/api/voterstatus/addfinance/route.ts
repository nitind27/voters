import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { volunteer_name, primary_person_id, installment } = body;

    if (!volunteer_name || !primary_person_id || !installment) {
      return NextResponse.json(
        { error: 'volunteer_name, primary_person_id, and installment are required' },
        { status: 400 }
      );
    }

    if (!['inst_1_paid', 'inst_2_paid', 'inst_3_paid'].includes(installment)) {
      return NextResponse.json(
        { error: 'installment must be inst_1_paid, inst_2_paid, or inst_3_paid' },
        { status: 400 }
      );
    }

    // First, check if primary_person_id exists
    const [checkRows] = await pool.query<RowDataPacket[]>(
      `SELECT Voter_Id, full_name FROM tbl_voters_search 
       WHERE Voter_Id = ? AND family_member = ? LIMIT 1`,
      [primary_person_id, primary_person_id]
    );

    if (checkRows.length === 0) {
      return NextResponse.json(
        { error: 'Primary person not found' },
        { status: 404 }
      );
    }

    // Get user_id from volunteer_master table based on volunteer_name
    const [volunteerRows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id FROM volunteer_master 
       WHERE volunteer_name = ? AND status = 'Active' LIMIT 1`,
      [volunteer_name]
    );

    if (volunteerRows.length === 0) {
      return NextResponse.json(
        { error: 'Volunteer not found or inactive' },
        { status: 404 }
      );
    }

    const assigned_volunteer_id = volunteerRows[0].user_id;

    // Set the selected installment field to 1
    // Based on installment type: inst_1_paid -> set inst_1_paid = 1, etc.
    const updateValue = 1;

    // Update all family members (where family_member = primary_person_id)
    // Set the selected installment field to 1, volunteer_name, and assigned_volunteer_id
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE tbl_voters_search
       SET ${installment} = ?,
           volunteer_name = ?,
           assigned_volunteer_id = ?,
           updated_at = NOW()
       WHERE family_member = ?`,
      [updateValue, volunteer_name, assigned_volunteer_id, primary_person_id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'No records updated. Please check the primary_person_id.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      affectedRows: result.affectedRows,
      message: `${installment} set to ${updateValue} for ${result.affectedRows} family members`,
    });
  } catch (error) {
    console.error('addfinance POST error:', error);
    return NextResponse.json({ error: 'Failed to add finance' }, { status: 500 });
  }
}

