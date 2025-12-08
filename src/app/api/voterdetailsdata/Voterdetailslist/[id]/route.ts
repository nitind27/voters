import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

// Get single voter detail by ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT * FROM voter_details WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch voter' }, { status: 500 });
    }
}

// Update voter details - Only 3 fields: Colony, House Number, Mobile Number
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        
        const {
            Updated_colony,
            updated_house_number,
            updated_mobile_no,
        } = body;

        // Update only 3 fields: Updated_colony, updated_house_number, updated_mobile_no
        const [result] = await pool.query<ResultSetHeader>(
            `UPDATE voter_details 
             SET Updated_colony = ?,
                 updated_house_number = ?,
                 updated_mobile_no = ?,
                 Updated_at = NOW()
             WHERE id = ?`,
            [
                Updated_colony || null,
                updated_house_number || null,
                updated_mobile_no || null,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Voter updated successfully' 
        });
    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json({ error: 'Failed to update voter' }, { status: 500 });
    }
}

// Delete voter details
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        const [result] = await pool.query<ResultSetHeader>(
            `DELETE FROM voter_details WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Voter deleted successfully' 
        });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Failed to delete voter' }, { status: 500 });
    }
}
