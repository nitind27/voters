import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const username = (formData.get('username')?.toString() || '').trim();
    const password = (formData.get('password')?.toString() || '').trim();
    const deviceUid = (formData.get('device_uid')?.toString() || '').trim();

    if (!username || !password) {
      return NextResponse.json(
        {
          error: true,
          code: 500,
          message: 'All fields are required.',
        },
        { status: 400 }
      );
    }

    // Step 1: Check username exists and active
    const [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM volunteer_master WHERE username = ? AND status = 'Active' LIMIT 1",
      [username]
    );

    if (userRows.length === 0) {
      return NextResponse.json(
        {
          error: true,
          code: 101,
          message: 'Username is wrong',
        },
        { status: 401 }
      );
    }

    const userRow = userRows[0];
    let isForgot = false;
    let userPassRow = userRow;

    // Check if password is in pass_record (forgot password flow)
    if (userRow.pass_request === 1 && userRow.pass_record) {
      const passRecords = userRow.pass_record.split('|');
      if (passRecords.length > 0) {
        const lastRecord = passRecords[passRecords.length - 1];
        const passRecord = lastRecord.split('}');
        if (passRecord[0] === password) {
          userPassRow = userRow;
          isForgot = true;
        } else {
          return NextResponse.json(
            {
              error: true,
              code: 102,
              message: 'Password is wrong',
            },
            { status: 401 }
          );
        }
      }
    } else {
      // Step 2: Check password correctness
      const [passRows] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM volunteer_master WHERE username = ? AND password = ? AND status = 'Active' LIMIT 1",
        [username, password]
      );

      if (passRows.length === 0) {
        return NextResponse.json(
          {
            error: true,
            code: 102,
            message: 'Password is wrong',
          },
          { status: 401 }
        );
      }

      userPassRow = passRows[0];
    }

    // Step 3: Update device_uid if needed
    if (deviceUid && !userPassRow.device_uid) {
      await pool.query(
        'UPDATE volunteer_master SET device_uid = ? WHERE user_id = ?',
        [deviceUid, userPassRow.user_id]
      );
      userPassRow.device_uid = deviceUid;
    }

    // Step 4: Device UID check
    if (deviceUid && userPassRow.device_uid) {
      if (deviceUid !== userPassRow.device_uid) {
        return NextResponse.json(
          {
            error: true,
            code: 103,
            message: "You can't login another device",
          },
          { status: 403 }
        );
      }
    }

    // Step 5: Get full user data with category
    const [fullUserRows] = await pool.query<RowDataPacket[]>(
      `SELECT u.*, c.name AS category_name
       FROM volunteer_master u
       LEFT JOIN category c ON u.category_id = c.category_id AND c.status = 'Active'
       WHERE u.username = ? AND u.status = 'Active'
       LIMIT 1`,
      [username]
    );

    if (fullUserRows.length === 0) {
      return NextResponse.json(
        {
          error: true,
          code: 104,
          message: 'Invalid login details',
        },
        { status: 401 }
      );
    }

    const user = fullUserRows[0];
    if (user.user_id) user.user_id = Number(user.user_id);
    if (user.category_id) user.category_id = Number(user.category_id);

    return NextResponse.json({
      error: false,
      code: 200,
      message: 'Login Successfully',
      is_forgot: isForgot,
      data: user,
    });
  } catch (error) {
    console.error('Error in volunteer login:', error);
    return NextResponse.json(
      {
        error: true,
        code: 500,
        message: error instanceof Error ? error.message : 'Login failed',
      },
      { status: 500 }
    );
  }
}

