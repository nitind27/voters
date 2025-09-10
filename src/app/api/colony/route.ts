// app/api/colony/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

// Define proper types
interface Colony {
    colony_id: number;
    colony_name: string;
    status: string;
    created_at: string;
    updated_at: string;
}

// -------------------- GET Method --------------------
export async function GET() {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>(
            'SELECT colony_id, colony_name, status, created_at, updated_at FROM colony WHERE status = "Active" ORDER BY colony_name'
        );

        return NextResponse.json(rows as Colony[]);
    } catch (error) {
        console.error('Database query failed (GET):', error);
        return NextResponse.json(
            { message: 'Failed to fetch colonies' },
            { status: 500 }
        );
    } finally {
        if (connection) connection.release();
    }
}

// -------------------- POST Method --------------------
export async function POST(request: Request) {
    let connection;
    try {
        const body = await request.json();
        const { colony_name } = body;

        if (!colony_name || colony_name.trim() === '') {
            return NextResponse.json(
                { message: 'Colony name is required' },
                { status: 400 }
            );
        }

        connection = await pool.getConnection();

        // Check if colony already exists
        const [existing] = await connection.query<RowDataPacket[]>(
            'SELECT colony_id FROM colony WHERE colony_name = ? AND status = "Active"',
            [colony_name.trim()]
        );

        if (existing.length > 0) {
            return NextResponse.json(
                { message: 'Colony with this name already exists' },
                { status: 409 }
            );
        }

        const [result] = await connection.query(
            'INSERT INTO colony (colony_name, status) VALUES (?, ?)',
            [colony_name.trim(), 'Active']
        );

        return NextResponse.json(
            { message: 'Colony created successfully', colony_id: (result as unknown as { insertId: number }).insertId },
            { status: 201 }
        );
    } catch (error) {
        console.error('Database query failed (POST):', error);
        return NextResponse.json(
            { message: 'Failed to create colony' },
            { status: 500 }
        );
    } finally {
        if (connection) connection.release();
    }
}

// -------------------- PUT Method --------------------
export async function PUT(request: Request) {
    let connection;
    try {
        const body = await request.json();
        const { colony_id, colony_name, status } = body;

        if (!colony_id || !colony_name) {
            return NextResponse.json(
                { message: 'Colony ID and name are required' },
                { status: 400 }
            );
        }

        connection = await pool.getConnection();

        // Check if colony name already exists (excluding current colony)
        const [existing] = await connection.query<RowDataPacket[]>(
            'SELECT colony_id FROM colony WHERE colony_name = ? AND colony_id != ? AND status = "Active"',
            [colony_name.trim(), colony_id]
        );

        if (existing.length > 0) {
            return NextResponse.json(
                { message: 'Colony with this name already exists' },
                { status: 409 }
            );
        }

        await connection.query(
            'UPDATE colony SET colony_name = ?, status = ? WHERE colony_id = ?',
            [colony_name.trim(), status || 'Active', colony_id]
        );

        return NextResponse.json(
            { message: 'Colony updated successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Database query failed (PUT):', error);
        return NextResponse.json(
            { message: 'Failed to update colony' },
            { status: 500 }
        );
    } finally {
        if (connection) connection.release();
    }
}



export async function PATCH(request: Request) {
    const { colony_id, status } = await request.json();

    if (!colony_id || !status) {
        return NextResponse.json(
            { message: 'Colony ID is required' },
            { status: 400 }
        );
    }

    try {
        await pool.query(
            'UPDATE colony SET status = ? WHERE colony_id = ?',
            [status, colony_id]
        );
        return NextResponse.json({ message: `documents ${status === 'active' ? 'Active' : 'Inactive'}` });
    } catch (error) {
        console.error('Status update error:', error);
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }
}