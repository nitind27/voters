import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

const NAME_FIELDS = [
  "full_name",
  "full_name_mr",
  "first_name_mr",
  "middle_name_mr",
  "last_name_mr",
] as const;

type NameField = (typeof NAME_FIELDS)[number];

type IncomingRow = Partial<Record<NameField, string | number | null>>;

const normalizeValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value.toString().trim().toLowerCase();
  if (typeof value === "string") return value.trim().toLowerCase();
  return "";
};

const sanitizeRow = (row: IncomingRow): Record<NameField, string> => {
  return NAME_FIELDS.reduce((acc, field) => {
    const raw = row[field];
    acc[field] = typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : "";
    return acc;
  }, {} as Record<NameField, string>);
};

export async function POST(request: NextRequest) {
  let connection;
  try {
    const body = await request.json();
    const rows: IncomingRow[] = Array.isArray(body?.rows) ? body.rows : [];

    if (!rows.length) {
      return NextResponse.json({ rows: [], totalDbMatches: 0 });
    }

    const sanitizedRows = rows.map(sanitizeRow);

    const valueSets: Record<NameField, Set<string>> = NAME_FIELDS.reduce(
      (acc, field) => {
        acc[field] = new Set<string>();
        return acc;
      },
      {} as Record<NameField, Set<string>>
    );

    sanitizedRows.forEach((row) => {
      NAME_FIELDS.forEach((field) => {
        const normalized = normalizeValue(row[field]);
        if (normalized) {
          valueSets[field].add(normalized);
        }
      });
    });

    const filters: string[] = [];
    const params: string[] = [];

    NAME_FIELDS.forEach((field) => {
      const values = Array.from(valueSets[field]);
      if (values.length) {
        const placeholders = values.map(() => "?").join(",");
        filters.push(`LOWER(ve.${field}) IN (${placeholders})`);
        params.push(...values);
      }
    });

    if (!filters.length) {
      return NextResponse.json({ rows: sanitizedRows.map((row, index) => ({ index, excelRow: row, matches: [] })), totalDbMatches: 0 });
    }

    const query = `
      SELECT 
        ve.voter_id,
        ve.full_name,
        ve.full_name_mr,
        ve.first_name_mr,
        ve.middle_name_mr,
        ve.last_name_mr,
        ve.voter_number,
        ve.mobile,
        ve.colony_entry_id,
        c.colony_name,
        ce.house_number
      FROM voter_entry ve
      LEFT JOIN colony_entry ce ON ve.colony_entry_id = ce.colony_entry_id
      LEFT JOIN colony c ON ce.colony_id = c.colony_id
      WHERE ve.status = "Active" AND (${filters.join(" OR ")})
    `;

    connection = await pool.getConnection();
    const [dbRows] = await connection.query<RowDataPacket[]>(query, params);

    const normalizedDb = (dbRows as RowDataPacket[]).map((row) => ({
      raw: row,
      normalized: NAME_FIELDS.reduce((acc, field) => {
        acc[field] = normalizeValue(row[field]);
        return acc;
      }, {} as Record<NameField, string>),
    }));

    const result = sanitizedRows.map((row, index) => {
      const normalizedRow = NAME_FIELDS.reduce((acc, field) => {
        acc[field] = normalizeValue(row[field]);
        return acc;
      }, {} as Record<NameField, string>);

      const matches = normalizedDb
        .map(({ raw, normalized }) => {
          const matchedOn = NAME_FIELDS.filter(
            (field) => normalizedRow[field] && normalizedRow[field] === normalized[field]
          );

          if (!matchedOn.length) return null;

          return {
            voter_id: raw.voter_id as number,
            full_name: raw.full_name as string,
            full_name_mr: raw.full_name_mr as string,
            first_name_mr: raw.first_name_mr as string,
            middle_name_mr: raw.middle_name_mr as string,
            last_name_mr: raw.last_name_mr as string,
            voter_number: raw.voter_number as string,
            mobile: raw.mobile as string,
            colony_entry_id: raw.colony_entry_id as number | null,
            colony_name: raw.colony_name as string,
            house_number: raw.house_number as string,
            matchedOn,
          };
        })
        .filter(Boolean);

      return {
        index,
        excelRow: row,
        matches,
      };
    });

    return NextResponse.json({
      rows: result,
      totalDbMatches: dbRows.length,
    });
  } catch (error) {
    console.error("excel-match POST failed:", error);
    return NextResponse.json(
      { error: "Failed to match Excel data with voter_entry." },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

