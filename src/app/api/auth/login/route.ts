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

// Interface for volunteer_master data
interface VolunteerQueryResult extends RowDataPacket {
  user_id: number;
  volunteer_name: string;
  username: string;
  password: string;
  contact_no: string;
  category_id: number | null;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}

// Interface for user data returned after login
interface UserData {
  name: string | null;
  user_id: number | null;
  category_name: string | null;
  taluka_id: number | null;
  village_id: number | null;
  category_id: number;
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
    
    // First, try to find user in users table
    const [users] = await connection.query<UserQueryResult[]>(
      `SELECT users.*, category.name as category_name 
       FROM users 
       INNER JOIN category ON users.category_id = category.category_id   
       WHERE users.username = ?`,
      [username]
    );

    let userFound = false;
    let userData: UserData | null = null;
    let categoryId: number | null = null;
    let categoryName: string | null = null;

    // Check if user exists in users table
    if (Array.isArray(users) && users.length > 0) {
      const user = users[0];
      
      // Verify password
      if (password === user.password) {
        userFound = true;
        categoryId = user.category_id;
        categoryName = user.category_name;
        
        // Check category_id - only allow login if category_id is 1 or 6
        if (categoryId === undefined || categoryId === null || (categoryId !== 1 && categoryId !== 6)) {
          connection.release();
          return NextResponse.json(
            { message: 'Access denied. Only authorized users can login.' },
            { status: 403 }
          );
        }

        userData = {
          name: user.name || null,
          user_id: user.user_id || null,
          category_name: categoryName,
          taluka_id: user.taluka_id || null,
          village_id: user.village_id || null,
          category_id: categoryId,
        };
      }
    }

    // If not found in users table, check volunteer_master table
    if (!userFound) {
      const [volunteers] = await connection.query<VolunteerQueryResult[]>(
        `SELECT vm.*, category.name as category_name
         FROM volunteer_master vm
         LEFT JOIN category ON vm.category_id = category.category_id
         WHERE vm.username = ? AND vm.status = 'Active'`,
        [username]
      );

      if (Array.isArray(volunteers) && volunteers.length > 0) {
        const volunteer = volunteers[0];
        
        // Verify password
        if (password === volunteer.password) {
          categoryId = volunteer.category_id;
          categoryName = volunteer.category_name || null;

          // For volunteers: allow category_id = 1 or 6, or if null/undefined, default to 6
          // Only allow login if category_id is 1 or 6 (or null which we'll treat as 6)
          if (categoryId !== null && categoryId !== undefined && categoryId !== 1 && categoryId !== 6) {
            connection.release();
            return NextResponse.json(
              { message: 'Access denied. Only volunteers with category_id 1 or 6 can login.' },
              { status: 403 }
            );
          }

          // If category_id is null or undefined, default to 6 for volunteers
          const finalCategoryId = categoryId || 6;
          
          // If category_name is null, try to get it from category table
          if (!categoryName && finalCategoryId) {
            const [categoryRows] = await connection.query<RowDataPacket[]>(
              `SELECT name FROM category WHERE category_id = ?`,
              [finalCategoryId]
            );
            if (Array.isArray(categoryRows) && categoryRows.length > 0) {
              categoryName = categoryRows[0].name || null;
            }
          }

          userFound = true;
          userData = {
            name: volunteer.volunteer_name || null,
            user_id: volunteer.user_id || null,
            category_name: categoryName,
            taluka_id: null, // Volunteers don't have taluka_id
            village_id: null, // Volunteers don't have village_id
            category_id: finalCategoryId, // Use finalCategoryId (6 if null)
          };
        }
      }
    }

    connection.release();

    // If user not found in either table or password doesn't match
    if (!userFound || !userData) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Set a cookie with user info
    const cookie = serialize('auth_token', String(userData.user_id), {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    // Return user data with proper category_id (ensured to be 1 or 6 at this point)
    const response = NextResponse.json({
      message: 'Login successful',
      user: userData
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
