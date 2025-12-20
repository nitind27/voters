import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const volunteerName = searchParams.get('volunteer_name');
    
    // Get all volunteer assignments with primary_person_id
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        user_id,
        volunteer_name,
        primary_person_id
      FROM volunteer_master
      WHERE primary_person_id IS NOT NULL 
        AND primary_person_id != ''
      ORDER BY volunteer_name ASC`,
    );

    // Create a map of primary_person_id -> volunteer_name (for all assignments)
    const allAssignments: Record<string, string> = {};
    
    // Also track current volunteer's assignments if provided
    const currentVolunteerAssignments: string[] = [];
    
    rows.forEach((row: RowDataPacket) => {
      if (row.primary_person_id) {
        // primary_person_id is comma-separated string
        const personIds = row.primary_person_id.split(',').map((id: string) => id.trim()).filter(Boolean);
        personIds.forEach((personId: string) => {
          // If already assigned, keep the first one (or you can decide logic)
          if (!allAssignments[personId]) {
            allAssignments[personId] = row.volunteer_name;
          }
          
          // Track current volunteer's assignments
          if (volunteerName && row.volunteer_name === volunteerName) {
            currentVolunteerAssignments.push(personId);
          }
        });
      }
    });

    return NextResponse.json({
      allAssignments,
      currentVolunteerAssignments,
    });
  } catch (error) {
    console.error('primaryperson-assignments GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch primary person assignments' }, { status: 500 });
  }
}

