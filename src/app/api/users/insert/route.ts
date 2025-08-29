import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';
import { RowDataPacket } from 'mysql2';

// Match DB fields exactly
interface User {
  user_id?: number;
  name: string;
  contact_no: string;
  username: string;
  password: string;
  category_id?: number | null;
  colony_id?: number | null;
  status?: string | null;
}

export async function POST(request: Request) {
  try {
    const {
      name,
      contact_no,
      username,
      password,
      category_id,
      colony_id,
      status
    } = await request.json();



    try {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO users (
          name,
          contact_no,
          username,
          password,
          category_id,
          colony_id,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          contact_no,
          username,
          password,
          category_id,
          colony_id,
          status ?? 'Active'
        ]
      );

      return NextResponse.json({
        success: true,
        userId: result.insertId,
      });
    } catch (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Request parsing error:', error);
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
  }
}

export async function GET() {
  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query<RowDataPacket[] & User[]>(`
SELECT
  u.user_id,
  u.name,
  u.contact_no,
  u.username,
  u.password,
  u.category_id,
  u.colony_id,
  u.status,
  CONVERT(
    GROUP_CONCAT(DISTINCT c.colony_name ORDER BY c.colony_name SEPARATOR ', ')
    USING 'utf8mb4'
  ) AS colony_names,
  cat.name AS category_name
FROM users u
LEFT JOIN colony c
  ON FIND_IN_SET(c.colony_id, REPLACE(u.colony_id, ' ', '')) > 0
LEFT JOIN category cat
  ON cat.category_id = u.category_id 
WHERE u.status = 'Active'
GROUP BY
  u.user_id, u.name, u.contact_no, u.username, u.password,
  u.category_id, u.colony_id, u.status, cat.name;



      `);

      const safeUsers = rows.map(({ ...user }) => user);
      return NextResponse.json(safeUsers);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const {
      user_id,
      name,
      contact_no,
      username,
      password,
      category_id,
      colony_id,
      status
    } = await request.json();

    if (!user_id || !name || !contact_no || !username || !password || !category_id || !colony_id) {
      return NextResponse.json(
        { error: 'Required fields: user_id, name, contact_no, username, password, category_id, colony_id' },
        { status: 400 }
      );
    }

    try {
      const [result] = await pool.query<ResultSetHeader>(
        `UPDATE users SET
          name = ?,
          contact_no = ?,
          username = ?,
          password = ?,
          category_id = ?,
          colony_id = ?,
          status = ?
        WHERE user_id = ?`,
        [
          name,
          contact_no,
          username,
          password,
          category_id,
          colony_id,
          status ?? 'Active',
          user_id
        ]
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'User not found or no changes made' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Request parsing error:', error);
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { user_id } = await request.json();

  if (!user_id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    await pool.query('DELETE FROM users WHERE user_id = ?', [user_id]);
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Deletion failed:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { user_id, status } = await request.json();

  if (!user_id || !status) {
    return NextResponse.json({ error: 'User ID and status are required' }, { status: 400 });
  }

  try {
    await pool.query('UPDATE users SET status = ? WHERE user_id = ?', [status, user_id]);
    return NextResponse.json({ message: `User ${status === 'Active' ? 'activated' : 'deactivated'}` });
  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}