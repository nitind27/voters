import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { colony_id, member_id, checkbox_data } = body;

    if (!colony_id || !member_id || !checkbox_data) {
      return NextResponse.json(
        { error: 'Missing required fields: colony_id, member_id, checkbox_data' },
        { status: 400 }
      );
    }

    // Convert checkbox data to pipe-separated string
    const checkboxString = checkbox_data.join('|');

    const connection = await pool.getConnection();

    try {
      // Check if record already exists
      const [existingRows] = await connection.execute(
        'SELECT * FROM voter_checkbox_data WHERE colony_id = ? AND member_id = ?',
        [colony_id, member_id]
      );

      if (Array.isArray(existingRows) && existingRows.length > 0) {
        // Update existing record
        await connection.execute(
          'UPDATE voter_checkbox_data SET checkbox_data = ?, updated_at = NOW() WHERE colony_id = ? AND member_id = ?',
          [checkboxString, colony_id, member_id]
        );
      } else {
        // Insert new record
        await connection.execute(
          'INSERT INTO voter_checkbox_data (colony_id, member_id, checkbox_data, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
          [colony_id, member_id, checkboxString]
        );
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: Array.isArray(existingRows) && existingRows.length > 0
          ? 'Data updated successfully'
          : 'Data inserted successfully'
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error in voter data insertion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { colony_id, member_id, checkbox_data } = body;

    if (!colony_id || !member_id || !checkbox_data) {
      return NextResponse.json(
        { error: 'Missing required fields: colony_id, member_id, checkbox_data' },
        { status: 400 }
      );
    }

    const checkboxString = checkbox_data.join('|');
    const connection = await pool.getConnection();

    try {
      await connection.execute(
        'UPDATE voter_checkbox_data SET checkbox_data = ?, updated_at = NOW() WHERE colony_id = ? AND member_id = ?',
        [checkboxString, colony_id, member_id]
      );

      await connection.commit();
      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating voter data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { colony_id, member_id } = body as { colony_id: number | string; member_id: number | string };

    if (!colony_id || !member_id) {
      return NextResponse.json(
        { error: 'Missing required fields: colony_id, member_id' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'DELETE FROM voter_checkbox_data WHERE colony_id = ? AND member_id = ?',
        [colony_id, member_id]
      );
      await connection.commit();
      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting voter data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const colony_id = searchParams.get('colony_id');

    const connection = await pool.getConnection();

    try {
      let rows = [];
      if (colony_id) {
        const [result] = await connection.execute(
          'SELECT * FROM voter_checkbox_data',
          [colony_id]
        );
        rows = Array.isArray(result) ? result : [];
      } else {
        const [result] = await connection.execute(
          'SELECT * FROM voter_checkbox_data ORDER BY colony_id, member_id'
        );
        rows = Array.isArray(result) ? result : [];
      }

      return NextResponse.json({
        success: true,
        data: rows
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error fetching voter data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
