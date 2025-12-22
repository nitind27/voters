import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { serialize } from 'cookie'; // npm install cookie
import type { RowDataPacket } from 'mysql2';

// Interface for user data returned from the query (users.* + category.name as category_name)
interface UserQueryResult extends RowDataPacket {
  user_id: number;
  name: string;
  category_id: number;
  username: string;
  password: string;
  contact_no: string;
  address?: string;
  category_name: string;
  taluka_id: number;
  village_id: number;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: 'Username and password are required' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    const [users] = await connection.query<UserQueryResult[]>(
      `SELECT users.*, category.name as category_name 
       FROM users 
       INNER JOIN category ON users.category_id  = category.category_id   
       WHERE users.username = ?`,
      [username]
    );
    connection.release();

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = users[0];
   
    if (password !== user.password) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check category_id on backend - only allow login if category_id is exactly 1
    const categoryId = user.category_id;
    if (categoryId === undefined || categoryId === null || categoryId !== 1) {
      return NextResponse.json(
        { message: 'Access denied. Only authorized users  can login.' },
        { status: 403 }
      );
    }

    // Only proceed if category_id is exactly 1
    // Set a cookie with user info (e.g., user id)
    const cookie = serialize('auth_token', String(user.user_id), {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    // Return user data with proper category_id (ensured to be 1 at this point)
    const response = NextResponse.json({
      message: 'Login successful',
      user: { 
        name: user.name || null, 
        user_id: user.user_id || null, 
        category_name: user.category_name || null, // category.name from JOIN (aliased)
        taluka_id: user.taluka_id || null, 
        village_id: user.village_id || null,
        category_id: categoryId // This is guaranteed to be 1
      }
    });
    response.headers.set('Set-Cookie', cookie);

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
