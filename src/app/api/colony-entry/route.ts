import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(request: NextRequest) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const colony_id = searchParams.get('colony_id');
    const house_number = searchParams.get('house_number');

    connection = await pool.getConnection();

    let query = 'SELECT * FROM colony_entry WHERE status = "Active"';
    const params: unknown[] = [];

    if (colony_id) {
      query += ' AND colony_id = ?';
      params.push(colony_id);
    }

    if (house_number) {
      query += ' AND house_number = ?';
      params.push(house_number);
    }

    const [rows] = await connection.query<RowDataPacket[]>(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Database query failed:', error);
    return NextResponse.json({ message: 'Failed to fetch colony entries' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function POST(request: NextRequest) {
  let connection;
  try {
    const body = await request.json();
    const { colony_id, house_number } = body;

    if (!colony_id || !house_number) {
      return NextResponse.json({ error: 'colony_id and house_number are required' }, { status: 400 });
    }

    connection = await pool.getConnection();

    const insertQuery = `
      INSERT INTO colony_entry (colony_id, house_number, status, created_at, updated_at)
      VALUES (?, ?, "Active", NOW(), NOW())
    `;

    const [result] = await connection.execute<ResultSetHeader>(insertQuery, [colony_id, house_number]);

    return NextResponse.json({ 
      success: true, 
      colony_entry_id: result.insertId,
      colony_id,
      house_number 
    });
  } catch (error) {
    console.error('Database insert failed:', error);
    return NextResponse.json({ error: 'Failed to create colony entry' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
