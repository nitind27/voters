import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { ResultSetHeader } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { voter_ids } = body;

    if (!Array.isArray(voter_ids) || voter_ids.length === 0) {
      return NextResponse.json(
        { error: 'voter_ids array is required' },
        { status: 400 }
      );
    }

    // Create placeholders for IN clause
    const placeholders = voter_ids.map(() => '?').join(',');

    // Update voting status and voting_paid for selected voters
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE tbl_voters_search
       SET voting_status = 'Done',
           voting_paid = 'Yes',
           updated_at = NOW()
       WHERE Voter_Id IN (${placeholders})`,
      voter_ids
    );

    return NextResponse.json({
      success: true,
      affectedRows: result.affectedRows,
      message: `Voting marked as done for ${result.affectedRows} voters`,
    });
  } catch (error) {
    console.error('markvotingdone POST error:', error);
    return NextResponse.json({ error: 'Failed to mark voting done' }, { status: 500 });
  }
}

