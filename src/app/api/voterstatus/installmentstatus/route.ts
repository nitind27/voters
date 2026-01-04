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

    // Get installment status from primary person (where Voter_Id = family_member = primary_person_id)
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         inst_1_paid,
         inst_2_paid,
         inst_3_paid
       FROM tbl_voters_search
       WHERE Voter_Id = ? AND family_member = ?
       LIMIT 1`,
      [primaryPersonId, primaryPersonId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Primary person not found' },
        { status: 404 }
      );
    }

    const status = rows[0];
    
    // Check if installment is paid (value is 1, '1', or 'Yes')
    const isPaid = (value: string | number | null | undefined) => {
      return value === 1 || value === '1' || value === 'Yes';
    };

    return NextResponse.json({
      inst_1_paid: isPaid(status.inst_1_paid),
      inst_2_paid: isPaid(status.inst_2_paid),
      inst_3_paid: isPaid(status.inst_3_paid),
    });
  } catch (error) {
    console.error('installmentstatus GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch installment status' }, { status: 500 });
  }
}

