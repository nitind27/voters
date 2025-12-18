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
            `SELECT * FROM tbl_voters_search WHERE id = ?`,
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

// Update voter details - colony / house / mobile + admin master fields
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

            // admin master fields (all optional)
            volunteer_name,
            volunteer_mobile,
            volunteer_status,
            assigned_colony_name,
            inst_1_paid,
            inst_2_paid,
            inst_3_paid,
            voting_paid,
            voting_in_transit,
            voting_status,
        } = body;

        const [result] = await pool.query<ResultSetHeader>(
            `UPDATE tbl_voters_search 
             SET 
                Updated_colony       = ?,
                updated_house_number = ?,
                updated_mobile_no    = ?,
                volunteer_name       = ?,
                volunteer_mobile     = ?,
                volunteer_status     = ?,
                assigned_colony_name = ?,
                inst_1_paid          = ?,
                inst_2_paid          = ?,
                inst_3_paid          = ?,
                voting_paid          = ?,
                voting_in_transit    = ?,
                voting_status        = ?,
                Updated_at           = NOW()
             WHERE id = ?`,
            [
                Updated_colony || null,
                updated_house_number || null,
                updated_mobile_no || null,
                volunteer_name || null,
                volunteer_mobile || null,
                volunteer_status || null,
                assigned_colony_name || null,
                inst_1_paid ?? 0,
                inst_2_paid ?? 0,
                inst_3_paid ?? 0,
                voting_paid ?? 0,
                voting_in_transit ?? 0,
                voting_status || 'Pending',
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
            `DELETE FROM tbl_voters_search WHERE id = ?`,
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
