import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

// Only match full_name from Excel with full_name_mr in database
type IncomingRow = {
  full_name?: string | number | null;
};

// Check if string contains Devanagari/Marathi characters
const containsDevanagari = (str: string): boolean => {
  // Devanagari Unicode range: U+0900 to U+097F
  return /[\u0900-\u097F]/.test(str);
};

// Better normalization that handles multiple spaces, special characters, etc.
// For Devanagari/Marathi text: only normalize spaces, don't change case
// For English text: normalize spaces and convert to lowercase
const normalizeValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return value.toString().trim();
  }
  if (typeof value === "string") {
    let normalized = value
      .trim()
      .replace(/\s+/g, " ") // Replace multiple spaces (including tabs, newlines) with single space
      .trim();
    
    // Only convert to lowercase for non-Devanagari text (English, etc.)
    // Devanagari/Marathi text should remain as-is (no case conversion)
    if (!containsDevanagari(normalized)) {
      normalized = normalized.toLowerCase();
    }
    
    return normalized;
  }
  return "";
};

const sanitizeRow = (row: IncomingRow): { full_name: string } => {
  const raw = row.full_name;
  
  // Remove all extra spaces: trim start/end and replace multiple spaces with single space
  let fullName = "";
  if (typeof raw === "string" || typeof raw === "number") {
    fullName = String(raw)
      .trim() // Remove spaces from start and end
      .replace(/\s+/g, " ") // Replace multiple spaces (including tabs, newlines) with single space
      .trim(); // Trim again after space normalization
  }
  
  return {
    full_name: fullName,
  };
};

export async function POST(request: NextRequest) {
  let connection;
  try {
    const body = await request.json();
    const rows: IncomingRow[] = Array.isArray(body?.rows) ? body.rows : [];

    console.log("📥 Received request with", rows.length, "rows from Excel");

    if (!rows.length) {
      console.log("❌ No rows received");
      return NextResponse.json({ rows: [], totalDbMatches: 0 });
    }

    const sanitizedRows = rows.map(sanitizeRow);
    console.log("✅ Sanitized rows:", sanitizedRows.length);

    // Collect only full_name values from Excel to match against full_name_mr in database
    const nameValues = new Set<string>();

    sanitizedRows.forEach((row) => {
      const normalized = normalizeValue(row.full_name);
      if (normalized) {
        nameValues.add(normalized);
      }
    });

    console.log("📝 Unique normalized names from Excel:", nameValues.size);
    console.log("📝 Sample names:", Array.from(nameValues).slice(0, 5));

    if (!nameValues.size) {
      console.log("❌ No valid names found in Excel");
      return NextResponse.json({ rows: sanitizedRows.map((row, index) => ({ index, excelRow: row, matches: [] })), totalDbMatches: 0 });
    }

    connection = await pool.getConnection();
    console.log("✅ Database connection established");

    // Fetch all records from voter_entry table with full_name_mr
    // Only check full_name_mr column from voter_entry table
    const query = `
      SELECT 
        ve.voter_id,
        ve.full_name,
        ve.full_name_mr,
        ve.voter_number,
        ve.mobile,
        ve.colony_entry_id,
        c.colony_name,
        ce.house_number
      FROM voter_entry ve
      LEFT JOIN colony_entry ce ON ve.colony_entry_id = ce.colony_entry_id
      LEFT JOIN colony c ON ce.colony_id = c.colony_id
      WHERE ve.full_name_mr IS NOT NULL 
        AND ve.full_name_mr != ''
        AND TRIM(ve.full_name_mr) != ''
    `;

    console.log("🔍 Executing query on voter_entry table...");
    const [dbRows] = await connection.query<RowDataPacket[]>(query);
    
    console.log(`📊 Found ${dbRows.length} records in voter_entry table with full_name_mr`);
    
    if (dbRows.length === 0) {
      console.log("⚠️ No records found in voter_entry table with full_name_mr");
      return NextResponse.json({
        rows: sanitizedRows.map((row, index) => ({ index, excelRow: row, matches: [] })),
        totalDbMatches: 0
      });
    }

    // Normalize database full_name_mr values for matching
    // Only check full_name_mr column from voter_entry table
    const normalizedDb = (dbRows as RowDataPacket[]).map((row) => {
      const fullNameMr = row.full_name_mr as string;
      const normalized = normalizeValue(fullNameMr);
      return {
        raw: row,
        normalizedFullNameMr: normalized,
        originalFullNameMr: fullNameMr,
      };
    });

    console.log("📝 Sample database full_name_mr values (first 5):");
    normalizedDb.slice(0, 5).forEach((item, idx) => {
      const isDevanagari = containsDevanagari(item.originalFullNameMr);
      console.log(`   ${idx + 1}. Original: "${item.originalFullNameMr}" → Normalized: "${item.normalizedFullNameMr}" [Devanagari: ${isDevanagari}]`);
    });

    // Create a map for faster lookup: normalized name -> array of matching database rows
    const nameToDbRows = new Map<string, typeof normalizedDb>();
    normalizedDb.forEach((item) => {
      const key = item.normalizedFullNameMr;
      if (key) {
        if (!nameToDbRows.has(key)) {
          nameToDbRows.set(key, []);
        }
        nameToDbRows.get(key)!.push(item);
      }
    });

    console.log(`📊 Created lookup map with ${nameToDbRows.size} unique normalized names from voter_entry.full_name_mr`);

    // Match each Excel row against database
    const result = sanitizedRows.map((row, index) => {
      // Get normalized full_name from Excel row
      const excelFullName = normalizeValue(row.full_name);

      if (!excelFullName) {
        console.log(`⚠️ Row ${index + 1}: Empty full_name, skipping`);
        return {
          index,
          excelRow: row,
          matches: [],
        };
      }

      // Match Excel full_name against database full_name_mr using the lookup map
      let matchingDbRows = nameToDbRows.get(excelFullName) || [];
      
      // If no match found, try direct comparison (in case of encoding issues)
      if (matchingDbRows.length === 0) {
        matchingDbRows = normalizedDb.filter(({ normalizedFullNameMr }) => {
          // Exact string comparison
          if (normalizedFullNameMr === excelFullName) return true;
          
          // Also try comparing after removing all spaces (in case of hidden characters)
          const excelNoSpaces = excelFullName.replace(/\s/g, '');
          const dbNoSpaces = normalizedFullNameMr.replace(/\s/g, '');
          if (excelNoSpaces === dbNoSpaces && excelNoSpaces.length > 0) {
            console.log(`   🔍 Found match after removing spaces: "${excelFullName}" === "${normalizedFullNameMr}"`);
            return true;
          }
          
          return false;
        });
      }

      const matches = matchingDbRows.map(({ raw }) => ({
        voter_id: raw.voter_id as number,
        full_name: raw.full_name as string,
        full_name_mr: raw.full_name_mr as string,
        voter_number: raw.voter_number as string,
        mobile: raw.mobile as string,
        colony_entry_id: raw.colony_entry_id as number | null,
        colony_name: raw.colony_name as string,
        house_number: raw.house_number as string,
      }));

      // Debug: Log matching results
      if (matches.length === 0) {
        const isDevanagari = containsDevanagari(row.full_name);
        console.log(`❌ Row ${index + 1}: No match found`);
        console.log(`   Excel original: "${row.full_name}" [Devanagari: ${isDevanagari}]`);
        console.log(`   Excel normalized: "${excelFullName}"`);
        console.log(`   Excel normalized length: ${excelFullName.length} chars`);
        try {
          const excelBytes = Buffer.from(excelFullName, 'utf8');
          console.log(`   Excel normalized bytes: ${excelBytes.length} bytes`);
          console.log(`   Excel normalized hex: ${excelBytes.toString('hex').substring(0, 50)}...`);
        } catch (e) {
          // Buffer might not be available in all environments
          console.error("Error converting Excel full_name to bytes:", e);
        }
        
        // Show sample database names for comparison
        const sampleDbNames = normalizedDb.slice(0, 5).map(item => {
          const dbIsDevanagari = containsDevanagari(item.originalFullNameMr);
          return {
            original: item.originalFullNameMr,
            normalized: item.normalizedFullNameMr,
            normalizedLength: item.normalizedFullNameMr.length,
            isDevanagari: dbIsDevanagari,
            matches: item.normalizedFullNameMr === excelFullName
          };
        });
        console.log(`   Sample database full_name_mr values:`, sampleDbNames);
        
        // Check if exact match exists (case-sensitive for Devanagari)
        const exactMatch = normalizedDb.find(item => item.normalizedFullNameMr === excelFullName);
        if (exactMatch) {
          console.log(`   ⚠️ Found exact match but not returned! Original: "${exactMatch.originalFullNameMr}"`);
        }
      } else {
        console.log(`✅ Row ${index + 1}: Found ${matches.length} match(es) for "${row.full_name}"`);
        matches.forEach(match => {
          console.log(`   → Matched with voter_id: ${match.voter_id}, full_name_mr: "${match.full_name_mr}"`);
        });
      }

      return {
        index,
        excelRow: row,
        matches,
      };
    });

    const totalMatches = result.filter(r => r.matches.length > 0).length;
    console.log(`📊 Matching complete: ${totalMatches} out of ${result.length} Excel rows matched`);

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

