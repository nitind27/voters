import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const page = Math.max(1, parseInt(formData.get('page')?.toString() || '1', 10));
    const pageSize = Math.max(1, parseInt(formData.get('page_size')?.toString() || '50', 10));
    const offset = (page - 1) * pageSize;
    const search = (formData.get('search')?.toString() || '').trim();
    const votingCount = parseInt(formData.get('voting_status')?.toString() || '0', 10);
    const assignBoothNumber = (formData.get('assign_booth_number')?.toString() || '').trim();
    const searchBoothNumber = (formData.get('search_booth_number')?.toString() || '').trim();
    const searchSrNo = (formData.get('search_sr_no')?.toString() || '').trim();

    if (!assignBoothNumber) {
      return NextResponse.json(
        {
          error: true,
          message: 'assign_booth_number is required',
          data: [],
        },
        { status: 400 }
      );
    }

    // Colony filter conditions
    const colonyConditions = [
      "(tvs.Updated_colony IS NULL OR tvs.Updated_colony = '')",
      `(tvs.Updated_colony != '' AND tvs.Updated_colony != 0 AND EXISTS (
        SELECT 1 FROM colony c WHERE c.colony_id = CAST(tvs.Updated_colony AS UNSIGNED) AND c.status = 'Active'
      ))`,
    ];
    const colonyFilter = '( ' + colonyConditions.join(' OR ') + ' )';

    // Booth numbers
    const boothNumbers = assignBoothNumber.split(',').map((bn) => bn.trim()).filter(Boolean);
    const boothPlaceholders = boothNumbers.map(() => '?').join(',');
    const boothCondition = `tvs.Booth_Number IN (${boothPlaceholders}) AND ${colonyFilter}`;

    // Count queries
    const [allRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as all_voter FROM tbl_voters_search tvs WHERE ${boothCondition}`,
      boothNumbers
    );
    const allVoter = Number(allRows[0]?.all_voter || 0);

    const [pendingRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as pending_voter FROM tbl_voters_search tvs WHERE ${boothCondition} AND tvs.voting_status = 'Pending'`,
      boothNumbers
    );
    const pendingVoter = Number(pendingRows[0]?.pending_voter || 0);

    const [inTransitRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as in_transit_voter FROM tbl_voters_search tvs WHERE ${boothCondition} AND tvs.voting_status = 'In Transit'`,
      boothNumbers
    );
    const inTransitVoter = Number(inTransitRows[0]?.in_transit_voter || 0);

    const [doneRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as done_voter FROM tbl_voters_search tvs WHERE ${boothCondition} AND (tvs.voting_status = 'Completed' OR tvs.voting_status = 'Direct')`,
      boothNumbers
    );
    const doneVoter = Number(doneRows[0]?.done_voter || 0);

    // Build WHERE conditions for main query
    const conditions = [boothCondition];
    const params: (string | number)[] = [...boothNumbers];

    if (searchBoothNumber) {
      conditions.push('tvs.Booth_Number = ?');
      params.push(searchBoothNumber.trim());
    }

    if (searchSrNo) {
      conditions.push('tvs.Sr_No = ?');
      params.push(searchSrNo.trim());
    }

    if (votingCount === 2) {
      conditions.push("tvs.voting_status = 'In Transit'");
    } else if (votingCount === 3) {
      conditions.push("tvs.voting_status = 'Pending'");
    } else if (votingCount === 4) {
      conditions.push("(tvs.voting_status = 'Completed' OR tvs.voting_status = 'Direct')");
    }

    if (search) {
      const searchWords = search.split(' ').filter((word) => word.trim());
      const nameConditions = searchWords.map(() => 'tvs.full_name LIKE ?');
      const searchParams = searchWords.map((word) => `%${word.trim()}%`);

      if (nameConditions.length > 0) {
        conditions.push(`((${nameConditions.join(' AND ')}) OR tvs.Voter_Id LIKE ?)`);
        params.push(...searchParams, `%${search}%`);
      }
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    // Count filtered records
    const [totalRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM tbl_voters_search tvs ${whereClause}`,
      params
    );
    const total = Number(totalRows[0]?.total || 0);

    // Fetch paginated results
    const query = `
      SELECT tvs.*, c.status as colony_status, c.colony_name 
      FROM tbl_voters_search tvs 
      LEFT JOIN colony c ON c.colony_id = IF(tvs.Updated_colony REGEXP '^[0-9]+$', CAST(tvs.Updated_colony AS UNSIGNED), NULL)
      ${whereClause} 
      ORDER BY tvs.id DESC 
      LIMIT ? OFFSET ?
    `;

    const [data] = await pool.query<RowDataPacket[]>(
      query,
      [...params, pageSize, offset]
    );

    return NextResponse.json({
      error: false,
      message: 'Voter details fetched successfully.',
      count: data.length,
      total: total,
      page: page,
      page_size: pageSize,
      all_voter: allVoter,
      pending_voter: pendingVoter,
      in_transit_voter: inTransitVoter,
      done_voter: doneVoter,
      data: data,
    });
  } catch (error) {
    console.error('Error fetching voters by booth number:', error);
    return NextResponse.json(
      {
        error: true,
        message: 'Fetch failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
        data: [],
      },
      { status: 500 }
    );
  }
}

