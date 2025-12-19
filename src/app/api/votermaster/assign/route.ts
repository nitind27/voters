import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  let connection;
  try {
    const body = await request.json();
    const {
      volunteer_name,
      volunteer_mobile,
      volunteer_status,
      colony_names,
    } = body as {
      volunteer_name?: string;
      volunteer_mobile?: string | null;
      volunteer_status?: 'Active' | 'Inactive';
      colony_names?: string[];
    };

    if (!volunteer_name || !Array.isArray(colony_names) || colony_names.length === 0) {
      return NextResponse.json(
        { error: 'volunteer_name and colony_names are required' },
        { status: 400 },
      );
    }

    const status = volunteer_status || 'Active';
    const mobile = volunteer_mobile?.trim() || null;
    // Auto-generate username and password from contact_no (mobile)
    const volunteerUsername = mobile; // Use contact_no as username
    const volunteerPassword = mobile; // Use contact_no as password

    // Get database connection
    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get colony IDs for the colony names
      const placeholders = colony_names.map(() => '?').join(',');
      const [colonyRows] = await connection.query<RowDataPacket[]>(
        `SELECT colony_id, colony_name FROM colony WHERE colony_name IN (${placeholders}) AND status = 'Active'`,
        colony_names,
      );

      const colonyMap = new Map<string, number>();
      colonyRows.forEach((row: RowDataPacket) => {
        colonyMap.set(row.colony_name, row.colony_id);
      });

      // Insert/Update volunteer_master table with all colony IDs in single row
      let volunteerMasterInserted = 0;
      let volunteerMasterUpdated = 0;
      let contactExistsWarning = null;

      try {
        // Collect all colony IDs for selected colonies
        const colonyIds: number[] = [];
        for (const colonyName of colony_names) {
          const colonyId = colonyMap.get(colonyName);
          if (colonyId) {
            colonyIds.push(colonyId);
          } else {
            console.warn(`Colony ID not found for: ${colonyName}`);
          }
        }

        if (colonyIds.length > 0) {
          // Create comma-separated string of colony IDs
          const colonyIdString = colonyIds.sort((a, b) => a - b).join(',');

          // Check if volunteer already exists with SAME volunteer_name AND contact_no
          const [existingVolunteer] = await connection.query<RowDataPacket[]>(
            `SELECT volunteer_name, contact_no, colony_id FROM volunteer_master 
             WHERE volunteer_name = ? AND contact_no = ? 
             LIMIT 1`,
            [volunteer_name, mobile],
          );

          if (existingVolunteer.length > 0) {
            // Both volunteer_name AND contact_no match -> UPDATE existing record
            // Merge existing colony_ids with new ones (avoid duplicates)
            const existingColonyIds = existingVolunteer[0].colony_id
              ? existingVolunteer[0].colony_id.split(',').map((id: string) => parseInt(id.trim(), 10))
              : [];
            
            // Combine and remove duplicates
            const allColonyIds = [...new Set([...existingColonyIds, ...colonyIds])].sort((a, b) => a - b);
            const updatedColonyIdString = allColonyIds.join(',');

            await connection.query<ResultSetHeader>(
              `UPDATE volunteer_master SET
                username = ?,
                password = ?,
                colony_id = ?,
                status = ?,
                updated_at = NOW()
              WHERE volunteer_name = ? AND contact_no = ?`,
              [volunteerUsername, volunteerPassword, updatedColonyIdString, status, volunteer_name, mobile],
            );
            volunteerMasterUpdated++;
          } else {
            // Either volunteer_name OR contact_no is different
            // Check if contact_no already exists (even with different volunteer_name)
            if (mobile) {
              const [existingContact] = await connection.query<RowDataPacket[]>(
                `SELECT volunteer_name FROM volunteer_master 
                 WHERE contact_no = ? 
                 LIMIT 1`,
                [mobile],
              );

              if (existingContact.length > 0) {
                // Contact number already exists - DO NOT INSERT
                contactExistsWarning = `Contact number ${mobile} already exists for volunteer: ${existingContact[0].volunteer_name}. Cannot insert duplicate contact number.`;
                // Skip insertion - contact_no must be unique
              } else {
                // Contact number doesn't exist - safe to INSERT new record
                await connection.query<ResultSetHeader>(
                  `INSERT INTO volunteer_master (
                    volunteer_name,
                    contact_no,
                    username,
                    password,
                    colony_id,
                    status,
                    created_at,
                    updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                  [volunteer_name, mobile, volunteerUsername, volunteerPassword, colonyIdString, status],
                );
                volunteerMasterInserted++;
              }
            } else {
              // No contact number provided - still insert (contact_no can be null)
              await connection.query<ResultSetHeader>(
                `INSERT INTO volunteer_master (
                  volunteer_name,
                  contact_no,
                  username,
                  password,
                  colony_id,
                  status,
                  created_at,
                  updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [volunteer_name, mobile, volunteerUsername, volunteerPassword, colonyIdString, status],
              );
              volunteerMasterInserted++;
            }
          }
        }
      } catch (volunteerError) {
        // If there's an error with volunteer_master (table doesn't exist, wrong structure, etc.), log and continue
        console.warn('Error updating volunteer_master (table may not exist or have different structure):', volunteerError);
        // Continue with other operations (voter_master and tbl_voters_search updates)
      }

      // Get all voters from tbl_voters_search matching the colony names
      const [voterRows] = await connection.query<RowDataPacket[]>(
        `SELECT 
          id,
          Voter_Id,
          full_name,
          House_Number,
          Updated_colony,
          updated_house_number,
          updated_mobile_no,
          inst_1_paid,
          inst_2_paid,
          inst_3_paid,
          voting_paid,
          voting_in_transit,
          voting_status
        FROM tbl_voters_search
        WHERE Updated_colony IN (${placeholders})`,
        colony_names,
      );

      let insertedCount = 0;
      let updatedCount = 0;

      // Process each voter
      for (const voter of voterRows) {
        const assignedColonyName = voter.Updated_colony || null;
        const assignedColonyId = assignedColonyName ? colonyMap.get(assignedColonyName) || null : null;

        // Check if record already exists in voter_master
        const [existing] = await connection.query<RowDataPacket[]>(
          `SELECT id FROM voter_master 
           WHERE voter_id = ? AND volunteer_name = ? AND assigned_colony_name = ?`,
          [voter.id, volunteer_name, assignedColonyName],
        );

        if (existing.length > 0) {
          // Update existing record
          await connection.query<ResultSetHeader>(
            `UPDATE voter_master SET
              volunteer_mobile = ?,
              volunteer_status = ?,
              assigned_colony_id = ?,
              updated_at = NOW()
            WHERE voter_id = ? AND volunteer_name = ? AND assigned_colony_name = ?`,
            [
              mobile,
              status,
              assignedColonyId,
              voter.id,
              volunteer_name,
              assignedColonyName,
            ],
          );
          updatedCount++;
        } else {
          // Insert new record
          await connection.query<ResultSetHeader>(
            `INSERT INTO voter_master (
              voter_id,
              Voter_Id,
              full_name,
              House_Number,
              Updated_colony,
              updated_house_number,
              updated_mobile_no,
              volunteer_name,
              volunteer_mobile,
              volunteer_status,
              assigned_colony_name,
              assigned_colony_id,
              inst_1_paid,
              inst_2_paid,
              inst_3_paid,
              voting_paid,
              voting_in_transit,
              voting_status,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              voter.id,
              voter.Voter_Id || '',
              voter.full_name || null,
              voter.House_Number || null,
              voter.Updated_colony || null,
              voter.updated_house_number || null,
              voter.updated_mobile_no || null,
              volunteer_name,
              mobile,
              status,
              assignedColonyName,
              assignedColonyId,
              voter.inst_1_paid || 0,
              voter.inst_2_paid || 0,
              voter.inst_3_paid || 0,
              voter.voting_paid || 0,
              voter.voting_in_transit || 0,
              voter.voting_status || 'Pending',
            ],
          );
          insertedCount++;
        }

        // Also update tbl_voters_search to maintain consistency
        await connection.query<ResultSetHeader>(
          `UPDATE tbl_voters_search SET
            volunteer_name = ?,
            volunteer_mobile = ?,
            volunteer_status = ?,
            assigned_colony_name = ?,
            Updated_at = NOW()
          WHERE id = ?`,
          [
            volunteer_name,
            mobile,
            status,
            assignedColonyName,
            voter.id,
          ],
        );
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        inserted: insertedCount,
        updated: updatedCount,
        totalAffected: insertedCount + updatedCount,
        volunteerMaster: {
          inserted: volunteerMasterInserted,
          updated: volunteerMasterUpdated,
        },
        warning: contactExistsWarning || undefined,
        message: `Successfully assigned volunteer to ${insertedCount + updatedCount} voters`,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('votermaster assign error:', error);
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
      connection.release();
    }
    return NextResponse.json(
      {
        error: 'Failed to assign volunteer',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}


