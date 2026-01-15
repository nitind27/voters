import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

// Helper function to get colony filter
function getColonyFilter(tableAlias = '') {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  return `(
    ${prefix}Updated_colony IS NULL 
    OR ${prefix}Updated_colony = '' 
    OR ${prefix}Updated_colony = 0
    OR EXISTS (
      SELECT 1 FROM colony 
      WHERE colony.colony_id = CAST(${prefix}Updated_colony AS UNSIGNED) 
      AND colony.status = 'Active'
    )
  )`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const primaryPersonId = (formData.get('primary_person_id')?.toString() || '').trim();
    const page = Math.max(1, parseInt(formData.get('page')?.toString() || '1', 10));
    const pageSize = Math.max(1, parseInt(formData.get('page_size')?.toString() || '50', 10));
    const offset = (page - 1) * pageSize;
    const search = (formData.get('search')?.toString() || '').trim();
    const votingCount = parseInt(formData.get('voting_status')?.toString() || '0', 10);
    const colonyId = parseInt(formData.get('colony_id')?.toString() || '0', 10);

    if (!primaryPersonId) {
      return NextResponse.json(
        {
          error: true,
          message: 'primary_person_id required',
          data: [],
        },
        { status: 400 }
      );
    }

    // Parse primary person IDs
    const primaryIds = primaryPersonId.split(',').map((id) => id.trim()).filter(Boolean);
    const idPlaceholders = primaryIds.map(() => '?').join(',');

    // Get primary voter IDs
    const colonyFilter = getColonyFilter();
    const [voterIdRows] = await pool.query<RowDataPacket[]>(
      `SELECT Voter_Id FROM tbl_voters_search WHERE id IN (${idPlaceholders}) AND ${colonyFilter}`,
      primaryIds.map((id) => parseInt(id, 10))
    );

    const primaryVoterIds = voterIdRows
      .map((row) => row.Voter_Id)
      .filter((id) => id);

    if (primaryVoterIds.length === 0) {
      return NextResponse.json(
        {
          error: true,
          message: 'No valid primary voter found',
          data: [],
        },
        { status: 400 }
      );
    }

    const voterPlaceholders = primaryVoterIds.map(() => '?').join(',');
    const familyCondition = `(id IN (${idPlaceholders}) OR family_member IN (${voterPlaceholders})) AND ${colonyFilter}`;
    const familyConditionWithAlias = `(tvs.id IN (${idPlaceholders}) OR tvs.family_member IN (${voterPlaceholders})) AND ${getColonyFilter('tvs')}`;

    // Build params for family condition
    const familyParams = [
      ...primaryIds.map((id) => parseInt(id, 10)),
      ...primaryVoterIds,
    ];

    // Count queries (without alias)
    const [allRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM tbl_voters_search WHERE ${familyCondition}`,
      familyParams
    );
    const allVoter = Number(allRows[0]?.c || 0);

    const [pendingRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM tbl_voters_search WHERE ${familyCondition} AND voting_status='Pending'`,
      familyParams
    );
    const pendingVoter = Number(pendingRows[0]?.c || 0);

    const [inTransitRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM tbl_voters_search WHERE ${familyCondition} AND voting_status='In Transit'`,
      familyParams
    );
    const inTransitVoter = Number(inTransitRows[0]?.c || 0);

    const [doneRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM tbl_voters_search WHERE ${familyCondition} AND (voting_status='Completed' OR voting_status='Direct')`,
      familyParams
    );
    const doneVoter = Number(doneRows[0]?.c || 0);

    // Build WHERE conditions for main query (with alias)
    const conditions = [familyConditionWithAlias];
    const params: (string | number)[] = [...familyParams];

    if (colonyId > 0) {
      conditions.push('tvs.Updated_colony = ?');
      params.push(colonyId);
    }

    if (votingCount === 1) {
      conditions.push("tvs.voting_status = 'Pending'");
    } else if (votingCount === 2) {
      conditions.push("tvs.voting_status = 'In Transit'");
    } else if (votingCount === 3) {
      conditions.push("(tvs.voting_status = 'Completed' OR tvs.voting_status = 'Direct')");
    }

    if (search) {
      const searchWords = search.split(' ').filter((word) => word.trim());
      const nameParts = searchWords.map(() => 'tvs.full_name LIKE ?');
      const searchParams = searchWords.map((word) => `%${word.trim()}%`);

      if (nameParts.length > 0) {
        conditions.push(`((${nameParts.join(' AND ')}) OR tvs.Voter_Id LIKE ?)`);
        params.push(...searchParams, `%${search}%`);
      }
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    // Colony wise count
    let colonyWhere = familyCondition;
    const colonyParams = [...familyParams];

    if (votingCount === 1) colonyWhere += " AND tbl_voters_search.voting_status='Pending'";
    else if (votingCount === 2) colonyWhere += " AND tbl_voters_search.voting_status='In Transit'";
    else if (votingCount === 3) colonyWhere += " AND (tbl_voters_search.voting_status='Completed' OR tbl_voters_search.voting_status='Direct')";

    const [colonyRows] = await pool.query<RowDataPacket[]>(
      `SELECT tbl_voters_search.Updated_colony AS colony_id, COUNT(*) AS total_voters 
       FROM tbl_voters_search WHERE ${colonyWhere} 
       GROUP BY tbl_voters_search.Updated_colony`,
      colonyParams
    );

    const colonyVoter = colonyRows.map((row) => ({
      colony_id: Number(row.colony_id || 0),
      total_voters: Number(row.total_voters || 0),
    }));

    // Pagination count
    const [totalRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM tbl_voters_search ${whereClause}`,
      params
    );
    const total = Number(totalRows[0]?.total || 0);

    // Main data query
    const dataQuery = `
      SELECT 
        tvs.*, 
        c.status as colony_status,
        CASE 
          WHEN tvs.family_member IS NULL OR TRIM(tvs.family_member) = '' OR tvs.family_member = '0' 
          THEN 0
          ELSE (
            SELECT COUNT(*) 
            FROM tbl_voters_search v2 
            WHERE TRIM(v2.family_member) = TRIM(tvs.family_member)
            AND v2.family_member IS NOT NULL 
            AND TRIM(v2.family_member) != '' 
            AND v2.family_member != '0'
          )
        END AS family_count
      FROM tbl_voters_search tvs 
      LEFT JOIN colony c ON c.colony_id = CAST(tvs.Updated_colony AS UNSIGNED)
      ${whereClause} 
      ORDER BY tvs.updated_at DESC 
      LIMIT ? OFFSET ?
    `;

    const [data] = await pool.query<RowDataPacket[]>(
      dataQuery,
      [...params, pageSize, offset]
    );

    return NextResponse.json({
      error: false,
      message: 'Voter & family data fetched successfully',
      count: data.length,
      total: total,
      page: page,
      page_size: pageSize,
      all_voter: allVoter,
      pending_voter: pendingVoter,
      in_transit_voter: inTransitVoter,
      done_voter: doneVoter,
      colony_voter: colonyVoter,
      data: data,
    });
  } catch (error) {
    console.error('Error fetching volunteer voter data:', error);
    return NextResponse.json(
      {
        error: true,
        message: error instanceof Error ? error.message : 'Failed to fetch data',
        data: [],
      },
      { status: 500 }
    );
  }
}

