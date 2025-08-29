// app/api/colony/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

// -------------------- GET Method --------------------
export async function GET() {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.query<RowDataPacket[]>(
            'SELECT * FROM colony WHERE status = "Active"'
        );

        return NextResponse.json(rows);
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
        const { name = "Active" } = body;

        if (!name) {
            return NextResponse.json(
                { message: 'Colony name is required' },
                { status: 400 }
            );
        }

        connection = await pool.getConnection();
        // const [result] = await connection.query(
        //     'INSERT INTO colony (name, status) VALUES (?, ?)',
        //     [name, status]
        // );

        return NextResponse.json(
            { message: 'Colony created successfully' },
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
        const { colony_id, name, status } = body;

        if (!colony_id || !name) {
            return NextResponse.json(
                { message: 'Colony ID and name are required' },
                { status: 400 }
            );
        }

        connection = await pool.getConnection();
        await connection.query(
            'UPDATE colony SET name = ?, status = ? WHERE colony_id = ?',
            [name, status, colony_id]
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

// -------------------- DELETE Method --------------------
export async function DELETE(request: Request) {
    let connection;
    try {
        const { searchParams } = new URL(request.url);
        const colony_id = searchParams.get('id');

        if (!colony_id) {
            return NextResponse.json(
                { message: 'Colony ID is required' },
                { status: 400 }
            );
        }

        connection = await pool.getConnection();
        await connection.query(
            'UPDATE colony SET status = "Inactive" WHERE colony_id = ?',
            [colony_id]
        );

        return NextResponse.json(
            { message: 'Colony deleted successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Database query failed (DELETE):', error);
        return NextResponse.json(
            { message: 'Failed to delete colony' },
            { status: 500 }
        );
    } finally {
        if (connection) connection.release();
    }
}
