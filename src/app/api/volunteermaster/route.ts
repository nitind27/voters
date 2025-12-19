import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      conditions.push('(volunteer_name LIKE ? OR contact_no LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Fetch data from volunteer_master table
    // Join with colony table to get colony names from colony_id (comma-separated)
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        vm.user_id,
        vm.volunteer_name,
        vm.contact_no,
        vm.colony_id,
        vm.status,
        vm.username,
        vm.password,
        vm.created_at,
        vm.updated_at
      FROM volunteer_master vm
      ${whereClause}
      ORDER BY vm.user_id DESC`,
      params,
    );

    // Process rows to expand colony_id (comma-separated) into colony names
    const processedRows = await Promise.all(
      rows.map(async (row) => {
        const colonyIds = row.colony_id
          ? row.colony_id.split(',').map((id: string) => parseInt(id.trim(), 10)).filter(Boolean)
          : [];

        // Fetch colony names for each colony_id
        const colonyNames: string[] = [];
        if (colonyIds.length > 0) {
          const placeholders = colonyIds.map(() => '?').join(',');
          const [colonyRows] = await pool.query<RowDataPacket[]>(
            `SELECT colony_name FROM colony WHERE colony_id IN (${placeholders})`,
            colonyIds,
          );
          colonyNames.push(...colonyRows.map((c: RowDataPacket) => c.colony_name));
        }

        // Format colony names with numbers: 1) Colony1, 2) Colony2, etc.
        const formattedColonyNames = colonyNames
          .map((name, index) => `${index + 1}) ${name}`)
          .join(', ');

        return {
          ...row,
          colony_names: formattedColonyNames,
          colony_ids: colonyIds,
        };
      }),
    );

    return NextResponse.json({
      data: processedRows,
      total: processedRows.length,
    });
  } catch (error) {
    console.error('volunteermaster GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch volunteer master data' }, { status: 500 });
  }
}

