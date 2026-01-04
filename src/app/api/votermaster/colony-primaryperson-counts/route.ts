import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    // Get all primary persons with their colony
    const [primaryPersons] = await pool.query<RowDataPacket[]>(
      `SELECT 
         v.id,
         v.Updated_colony,
         c.colony_name,
         c.colony_id
       FROM tbl_voters_search v
       LEFT JOIN colony c ON v.Updated_colony = c.colony_id
       WHERE v.family_member IS NOT NULL 
         AND v.family_member != ''
         AND v.Voter_Id = v.family_member
       ORDER BY c.colony_name ASC`,
    );

    // Get all assigned primary person IDs from volunteer_master
    const [volunteerAssignments] = await pool.query<RowDataPacket[]>(
      `SELECT primary_person_id
       FROM volunteer_master
       WHERE primary_person_id IS NOT NULL 
         AND primary_person_id != ''`,
    );

    // Create a set of assigned primary person IDs
    const assignedPersonIds = new Set<string>();
    volunteerAssignments.forEach((row: RowDataPacket) => {
      if (row.primary_person_id) {
        const personIds = row.primary_person_id.split(',').map((id: string) => id.trim()).filter(Boolean);
        personIds.forEach((id: string) => assignedPersonIds.add(id));
      }
    });

    // Count total and pending per colony
    const colonyCounts: Record<number, { colony_name: string; total: number; pending: number }> = {};

    primaryPersons.forEach((person: RowDataPacket) => {
      const colonyId = person.colony_id;
      if (!colonyId) return;

      if (!colonyCounts[colonyId]) {
        colonyCounts[colonyId] = {
          colony_name: person.colony_name || '',
          total: 0,
          pending: 0,
        };
      }

      colonyCounts[colonyId].total++;
      
      // Check if this primary person is assigned
      const personId = String(person.id);
      if (!assignedPersonIds.has(personId)) {
        colonyCounts[colonyId].pending++;
      }
    });

    return NextResponse.json(colonyCounts);
  } catch (error) {
    console.error('colony-primaryperson-counts GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch colony counts' }, { status: 500 });
  }
}

