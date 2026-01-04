import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const field = searchParams.get('field'); // 'first_name', 'middle_name', 'last_name'

    if (!query || !field) {
      return NextResponse.json({ suggestions: [] });
    }

    // Map English field to its Marathi field
    const mrField =
      field === 'first_name' ? 'first_name_mr' :
      field === 'middle_name' ? 'middle_name_mr' :
      field === 'last_name' ? 'last_name_mr' :
      null;

    if (!mrField) {
      return NextResponse.json({ suggestions: [] });
    }

    connection = await pool.getConnection();

    const searchQuery = `
      SELECT DISTINCT ${field} as en, ${mrField} as mr
      FROM colony_member 
      WHERE ${field} LIKE ? AND ${field} != '' AND status = 'Active'
      ORDER BY ${field} ASC
      LIMIT 10
    `;

    const [rows] = await connection.query<RowDataPacket[]>(searchQuery, [`${query}%`]);

    const suggestions = rows
      .map(r => ({ en: r.en as string, mr: (r.mr as string) || '' }))
      .filter(s => !!s.en);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Database query failed:', error);
    return NextResponse.json({ suggestions: [] });
  } finally {
    if (connection) connection.release();
  }
}