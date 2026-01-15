import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { ResultSetHeader } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const idParam = formData.get('id')?.toString();
    const votingStatus = formData.get('voting_status')?.toString();

    if (!idParam || !idParam.trim()) {
      return NextResponse.json(
        {
          error: true,
          code: 400,
          message: 'ID is required.',
        },
        { status: 400 }
      );
    }

    if (!votingStatus || !votingStatus.trim()) {
      return NextResponse.json(
        {
          error: true,
          code: 400,
          message: 'voting_status is required.',
        },
        { status: 400 }
      );
    }

    // Handle single or multiple IDs
    const ids = idParam
      .split(',')
      .map((id) => id.trim())
      .filter((id) => /^\d+$/.test(id)); // Only numeric IDs

    if (ids.length === 0) {
      return NextResponse.json(
        {
          error: true,
          code: 400,
          message: 'Invalid ID values.',
        },
        { status: 400 }
      );
    }

    const placeholders = ids.map(() => '?').join(',');
    const query = `
      UPDATE tbl_voters_search 
      SET voting_status = ?
      WHERE id IN (${placeholders})
    `;

    const [result] = await pool.query<ResultSetHeader>(
      query,
      [votingStatus.trim(), ...ids.map((id) => parseInt(id, 10))]
    );

    if (result.affectedRows > 0) {
      return NextResponse.json({
        error: false,
        message: 'Voting status updated successfully.',
      });
    } else {
      return NextResponse.json(
        {
          error: true,
          code: 404,
          message: 'No records updated (IDs not found or same value).',
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error updating voter transits:', error);
    return NextResponse.json(
      {
        error: true,
        code: 500,
        message: error instanceof Error ? error.message : 'Failed to update voting status',
      },
      { status: 500 }
    );
  }
}

