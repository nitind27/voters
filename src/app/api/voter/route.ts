// app/api/voter/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

// -------------------- GET Method --------------------
export async function GET() {
  let connection;
  try {
    // const { searchParams } = new URL(request.url);
    // const includeFindatasorting = searchParams.get('includeFindatasorting');

    connection = await pool.getConnection();

    const query = `
        SELECT 
            v.*,
            c.colony_name,
            ce.house_number AS house_number,
            COALESCE(v.findatasorting, 0) as Findatasorting
        FROM voter_entry v
        LEFT JOIN colony_entry ce ON v.colony_entry_id = ce.colony_entry_id
        LEFT JOIN colony c ON ce.colony_id = c.colony_id
        WHERE v.status = "Active"
    `;
    const [rows] = await connection.query<RowDataPacket[]>(query);

    // Process the data to ensure Findatasorting is always a number
    const processedRows = rows.map(row => ({
      ...row,
      Findatasorting: row.Findatasorting ? parseInt(row.Findatasorting) : 0
    }));

    return NextResponse.json(processedRows);
  } catch (error) {
    console.error('Database query failed (GET):', error);
    return NextResponse.json(
      { message: 'Failed to fetch voter data' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}


// -------------------- PUT Method for Findatasorting Updates --------------------
export async function PUT(request: Request) {
  let connection;
  try {
    const { updates } = await request.json();

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { message: 'Invalid request data' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    for (const update of updates) {
      const { voter_id, findatasorting } = update;

      if (!voter_id || findatasorting === undefined) {
        continue; // Skip invalid entries
      }

      // Update the Findatasorting column in the voter table
      await connection.query(
        'UPDATE voter_entry SET findatasorting = ? WHERE voter_id = ?',
        [findatasorting, voter_id]
      );
    }

    return NextResponse.json(
      { message: 'Findatasorting values updated successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Database update failed (PUT):', error);
    return NextResponse.json(
      { message: 'Failed to update Findatasorting values' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
