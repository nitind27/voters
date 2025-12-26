import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const colonyName = searchParams.get('colony_name');
    const colonyId = searchParams.get('colony_id');
    const onlyAssigned = searchParams.get('only_assigned'); // New parameter to filter by volunteer_master
    const volunteerId = searchParams.get('volunteer_id'); // Filter by specific volunteer

    let whereClause = `v.family_member IS NOT NULL 
         AND v.family_member != ''
         AND v.Voter_Id = v.family_member`;
    const params: (string | number)[] = [];

    // Build join clause
    // Always join with colony first
    let joinClause = `LEFT JOIN colony c ON v.Updated_colony = c.colony_id`;
    
    // If only_assigned is true, also join with volunteer_master to filter assigned primary persons
    if (onlyAssigned === 'true') {
      // Join with volunteer_master to only get primary persons that are assigned
      // primary_person_id stores comma-separated values (can be id or Voter_Id)
      let volunteerCondition = `vm.primary_person_id IS NOT NULL 
        AND vm.primary_person_id != ''
        AND (
          FIND_IN_SET(CAST(v.id AS CHAR), vm.primary_person_id) > 0 
          OR FIND_IN_SET(v.Voter_Id, vm.primary_person_id) > 0
        )`;
      
      // If volunteer_id is provided, filter by specific volunteer
      // Push volunteer_id FIRST because it appears first in the query (in JOIN clause)
      if (volunteerId) {
        volunteerCondition += ` AND vm.user_id = ?`;
        params.push(Number(volunteerId));
      }
      
      joinClause += ` INNER JOIN volunteer_master vm ON (${volunteerCondition})`;
    }

    // Filter by colony if provided
    // Push colony parameter AFTER volunteer_id because WHERE clause comes after JOIN in query
    if (colonyName) {
      whereClause += ` AND c.colony_name = ?`;
      params.push(colonyName);
    } else if (colonyId) {
      whereClause += ` AND v.Updated_colony = ?`;
      params.push(colonyId);
    }

    // Get primary persons (where Voter_Id = family_member) with member count
    // Optimized: Simplified query and removed DISTINCT for better performance
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         v.id,
         v.Voter_Id,
         v.full_name,
         v.ENG_Full_name,
         v.family_member,
         v.Updated_colony,
         v.updated_mobile_no,
         v.updated_house_number,
         v.House_Number,
         c.colony_name,
         COALESCE(fm_counts.member_count, 0) as member_count
       FROM tbl_voters_search v
       ${joinClause}
       LEFT JOIN (
         SELECT family_member, COUNT(*) as member_count
         FROM tbl_voters_search
         WHERE family_member IS NOT NULL 
           AND family_member != ''
         GROUP BY family_member
       ) fm_counts ON v.Voter_Id = fm_counts.family_member
       WHERE ${whereClause}
       ORDER BY v.full_name ASC`,
      params,
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('primarypersons GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch primary persons' }, { status: 500 });
  }
}

