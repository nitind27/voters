import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

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
        vm.primary_person_id,
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      volunteer_name,
      contact_no,
      status,
    } = body as {
      volunteer_name?: string;
      contact_no?: string | null;
      status?: 'Active' | 'Inactive';
    };

    if (!volunteer_name) {
      return NextResponse.json(
        { error: 'volunteer_name is required' },
        { status: 400 },
      );
    }

    const volunteerStatus = status || 'Active';
    const mobile = contact_no?.trim() || null;
    
    // Auto-generate username and password from contact_no
    const username = mobile || '';
    const password = mobile || '';

    // Check if contact_no already exists
    if (mobile) {
      const [existingContact] = await pool.query<RowDataPacket[]>(
        `SELECT volunteer_name FROM volunteer_master 
         WHERE contact_no = ? 
         LIMIT 1`,
        [mobile],
      );

      if (existingContact.length > 0) {
        return NextResponse.json(
          { 
            error: `Contact number ${mobile} already exists for volunteer: ${existingContact[0].volunteer_name}. Cannot insert duplicate contact number.` 
          },
          { status: 400 },
        );
      }
    }

    // Insert new volunteer
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO volunteer_master (
        volunteer_name,
        contact_no,
        username,
        password,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [volunteer_name, mobile, username, password, volunteerStatus],
    );

    return NextResponse.json({
      success: true,
      message: 'Volunteer created successfully',
      user_id: result.insertId,
    });
  } catch (error) {
    console.error('volunteermaster POST error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create volunteer',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      volunteer_name,
      contact_no,
      status,
    } = body as {
      user_id: number;
      volunteer_name?: string;
      contact_no?: string | null;
      status?: 'Active' | 'Inactive';
    };

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 },
      );
    }

    if (!volunteer_name) {
      return NextResponse.json(
        { error: 'volunteer_name is required' },
        { status: 400 },
      );
    }

    const volunteerStatus = status || 'Active';
    const mobile = contact_no?.trim() || null;
    
    // Auto-generate username and password from contact_no
    const username = mobile || '';
    const password = mobile || '';

    // Check if contact_no already exists for another volunteer
    if (mobile) {
      const [existingContact] = await pool.query<RowDataPacket[]>(
        `SELECT user_id, volunteer_name FROM volunteer_master 
         WHERE contact_no = ? AND user_id != ?
         LIMIT 1`,
        [mobile, user_id],
      );

      if (existingContact.length > 0) {
        return NextResponse.json(
          { 
            error: `Contact number ${mobile} already exists for volunteer: ${existingContact[0].volunteer_name}. Cannot use duplicate contact number.` 
          },
          { status: 400 },
        );
      }
    }

    // Update volunteer
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE volunteer_master 
       SET volunteer_name = ?,
           contact_no = ?,
           username = ?,
           password = ?,
           status = ?,
           updated_at = NOW()
       WHERE user_id = ?`,
      [volunteer_name, mobile, username, password, volunteerStatus, user_id],
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Volunteer not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Volunteer updated successfully',
    });
  } catch (error) {
    console.error('volunteermaster PUT error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update volunteer',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 },
      );
    }

    const userId = parseInt(user_id, 10);
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user_id' },
        { status: 400 },
      );
    }

    // Delete volunteer
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM volunteer_master WHERE user_id = ?`,
      [userId],
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Volunteer not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Volunteer deleted successfully',
    });
  } catch (error) {
    console.error('volunteermaster DELETE error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete volunteer',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

