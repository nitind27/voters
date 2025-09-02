// app/api/voter/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

// -------------------- GET Method --------------------
export async function GET() {
    let connection;
    try {

        connection = await pool.getConnection();
        
        const query = `
            SELECT 
                v.*,
                c.colony_name,
                COALESCE(v.voterlist, 0) as Voterlist
            FROM voter_entry v
            LEFT JOIN colony_entry ce ON v.colony_entry_id = ce.colony_entry_id
            LEFT JOIN colony c ON ce.colony_id = c.colony_id
            WHERE v.status = "Active"
        `;
        
        const [rows] = await connection.query<RowDataPacket[]>(query);
        
        // Process the data to ensure Voterlist is always a number
        const processedRows = rows.map(row => ({
            ...row,
            Voterlist: row.Voterlist ? parseInt(row.Voterlist) : 0
        }));

        return NextResponse.json(processedRows);
    } catch (error) {
        console.error('Database query failed (GET):', error);
        return NextResponse.json(
            { message: 'Failed to fetch voter data' },
            { status: 500 }
        );
    } finally {
        if (connection) connection.release();
    }
}


// -------------------- PUT Method for Voterlist Updates --------------------
export async function PUT(request: Request) {
    let connection;
    try {
      const { updates } = await request.json();
      
      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return NextResponse.json(
          { message: 'Invalid request data' },
          { status: 400 }
        );
      }
  
      connection = await pool.getConnection();
      
      for (const update of updates) {
        const { voter_id, voterlist } = update;
        
        if (!voter_id || voterlist === undefined) {
          continue; // Skip invalid entries
        }
  
        // Update the Voterlist column in the voter table
        await connection.query(
          'UPDATE voter_entry SET voterlist = ? WHERE voter_id = ?',
          [voterlist, voter_id]
        );
      }
  
      return NextResponse.json(
        { message: 'Voterlist values updated successfully' },
        { status: 200 }
      );
      
    } catch (error) {
      console.error('Database update failed (PUT):', error);
      return NextResponse.json(
        { message: 'Failed to update Voterlist values' },
        { status: 500 }
      );
    } finally {
      if (connection) connection.release();
    }
  }
  