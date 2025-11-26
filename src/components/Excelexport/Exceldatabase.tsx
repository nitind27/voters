"use client";

import { ChangeEvent, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";

// Only check full_name column from Excel
const EXCEL_COLUMN = "full_name";

type ExcelRow = {
  full_name: string;
};

type DbMatch = {
  voter_id: number;
  full_name: string;
  full_name_mr: string;
  voter_number: string;
  mobile: string;
  colony_entry_id: number | null;
  colony_name: string;
  house_number: string;
};

type RowMatchResult = {
  index: number;
  excelRow: ExcelRow;
  matches: DbMatch[];
};

// Normalize column names: handles camel case, underscores, spaces, etc.
// Examples: "Full_name" → "fullname", "Full Name" → "fullname", "full_name" → "fullname"
const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

const extractRelevantRow = (row: Record<string, unknown>): ExcelRow => {
  // Create a map of normalized Excel column names to their values
  const normalizedMap = Object.entries(row).reduce<Record<string, unknown>>((acc, [key, value]) => {
    const normalized = normalizeKey(key);
    if (!acc[normalized] || (acc[normalized] === "" && value)) {
      acc[normalized] = value;
    }
    return acc;
  }, {});

  // Only extract full_name column (handles Full_name, Full Name, full_name, etc.)
  const lookupKey = normalizeKey(EXCEL_COLUMN);
  const raw = normalizedMap[lookupKey];
  
  // Remove all extra spaces: trim start/end and replace multiple spaces with single space
  let fullName = "";
  if (typeof raw === "string" || typeof raw === "number") {
    fullName = String(raw)
      .trim() // Remove spaces from start and end
      .replace(/\s+/g, " ") // Replace multiple spaces (including tabs, newlines) with single space
      .trim(); // Trim again after space normalization
  }

  return { full_name: fullName };
};

const hasAnyValue = (row: ExcelRow) => row.full_name && row.full_name.trim().length > 0;

const Exceldatabase = () => {
  const [fileName, setFileName] = useState("");
  const [excelRows, setExcelRows] = useState<ExcelRow[]>([]);
  const [matchRows, setMatchRows] = useState<RowMatchResult[]>([]);
  const [totalDbMatches, setTotalDbMatches] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMatching, setIsMatching] = useState(false);

  const stats = useMemo(() => {
    const matched = matchRows.filter((row) => row.matches.length > 0).length;
    return {
      uploaded: excelRows.length,
      withMatches: matched,
      withoutMatches: excelRows.length ? excelRows.length - matched : 0,
      totalDbMatches,
    };
  }, [excelRows.length, matchRows, totalDbMatches]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        toast.error("No sheet found in the uploaded file.");
        return;
      }
      const sheet = workbook.Sheets[sheetName];
      // Read sheet with header row (first row as column names)
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { 
        defval: "",
        raw: false, // Convert all values to strings
        blankrows: false // Skip blank rows
      });

      if (!rows.length) {
        toast.error("Uploaded sheet is empty. Please check your Excel file has data rows.");
        return;
      }

      // Debug: Log original Excel column names and show which one will match
      const firstRowKeys = Object.keys(rows[0] || {});
      console.log("📊 Original Excel column names:", firstRowKeys);
      console.log("📊 Total rows in Excel:", rows.length);
      console.log("📊 First row sample:", rows[0]);
      
      if (firstRowKeys.length === 0) {
        toast.error("Excel file में columns नहीं मिले। कृपया file check करें।");
        return;
      }
      
      const targetNormalized = normalizeKey(EXCEL_COLUMN);
      console.log("🔍 Looking for column (normalized):", targetNormalized);
      
      // Show which Excel column will match
      const matchingColumn = firstRowKeys.find(key => {
        const normalized = normalizeKey(key);
        return normalized === targetNormalized;
      });
      
      if (matchingColumn) {
        console.log("✅ Matching column found:", matchingColumn);
        // Show sample values from this column
        const sampleValues = rows.slice(0, 5).map(r => r[matchingColumn]).filter(Boolean);
        console.log("📝 Sample values from", matchingColumn, ":", sampleValues);
      } else {
        console.warn("⚠️ full_name column not found in Excel!");
        console.warn("Available columns:", firstRowKeys);
        // Show normalized versions of available columns
        const normalizedColumns = firstRowKeys.map(key => ({
          original: key,
          normalized: normalizeKey(key)
        }));
        console.warn("Normalized column names:", normalizedColumns);
        toast.error(`Excel में full_name column नहीं मिला। Available columns: ${firstRowKeys.join(", ")}`);
        return;
      }

      const extracted = rows.map(extractRelevantRow).filter(hasAnyValue);

      console.log("📊 Extracted rows with full_name:", extracted.length, "out of", rows.length);
      
      if (!extracted.length) {
        toast.error(`Excel में ${rows.length} rows हैं लेकिन full_name column में कोई data नहीं मिला। कृपया full_name column में data जोड़ें।`);
        return;
      }

      // Debug: Log first few rows to see what was extracted
      console.log("📊 Extracted Excel rows (first 3):", extracted.slice(0, 3));
      console.log("📝 Sample full_name values (original):", extracted.slice(0, 5).map(r => r.full_name).filter(Boolean));
      
      // Show normalized versions for debugging
      const sampleNormalized = extracted.slice(0, 5)
        .map(r => ({
          original: r.full_name,
          normalized: r.full_name.toLowerCase().trim().replace(/\s+/g, " ")
        }))
        .filter(r => r.original);
      console.log("📝 Sample full_name values (normalized for matching):", sampleNormalized);

      setFileName(file.name);
      setExcelRows(extracted);
      setMatchRows([]);
      setTotalDbMatches(0);
      toast.success(`Loaded ${extracted.length} rows from Excel.`);
    } catch (error) {
      console.error(error);
      toast.error("Unable to read the Excel file.");
    } finally {
      setIsProcessing(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleMatchWithDatabase = async () => {
    if (!excelRows.length) {
      toast.error("Please upload an Excel file first.");
      return;
    }

    console.log("🚀 Starting database matching...");
    console.log("📊 Excel rows to match:", excelRows.length);
    console.log("📝 Sample Excel data:", excelRows.slice(0, 3));

    setIsMatching(true);
    try {
      const payload = { rows: excelRows };
      console.log("📤 Sending data to backend:", {
        rowCount: excelRows.length,
        sampleRows: excelRows.slice(0, 2)
      });

      const response = await fetch("/api/excel-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("📥 Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Backend error:", errorText);
        throw new Error(`Failed to match data: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as { rows: RowMatchResult[]; totalDbMatches: number };
      console.log("✅ Received response from backend");
      console.log("📊 Response data:", {
        totalRows: data.rows?.length ?? 0,
        totalDbMatches: data.totalDbMatches ?? 0
      });

      setMatchRows(data.rows ?? []);
      setTotalDbMatches(data.totalDbMatches ?? 0);
      
      // Debug: Log matching results
      const matchedCount = (data.rows ?? []).filter(r => r.matches.length > 0).length;
      console.log(`📊 Matching complete: ${matchedCount} rows matched out of ${data.rows?.length ?? 0}`);
      
      if (matchedCount === 0 && excelRows.length > 0) {
        console.warn("⚠️ No matches found. Check browser console and server logs for details.");
        toast.warning(`No matches found for ${excelRows.length} rows. Check browser console for details.`);
      } else {
        toast.success(`Database matching completed. ${matchedCount} rows matched.`);
      }
    } catch (error) {
      console.error("❌ Error in handleMatchWithDatabase:", error);
      toast.error(`Failed to run database matching: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Excel vs Database Matcher</h2>
        
      </div>

      <label
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center hover:border-brand-400"
        htmlFor="excel-db-upload"
      >
        <input
          id="excel-db-upload"
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFile}
          disabled={isProcessing || isMatching}
        />
        <span className="text-lg font-medium text-brand-600">
          {isProcessing ? "Processing..." : "Click to upload Excel for DB check"}
        </span>
        <span className="mt-2 text-xs text-gray-500">
          Excel में <strong>full_name</strong> column होना चाहिए (database के full_name_mr से match होगा)
        </span>
        {fileName && <span className="mt-4 text-sm text-gray-700">Loaded: {fileName}</span>}
      </label>

      {excelRows.length > 0 && (
        <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleMatchWithDatabase}
              disabled={isMatching}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isMatching ? "Checking database..." : "Match with database"}
            </button>

            <div className="flex flex-wrap gap-3 text-sm">
              <div className="rounded-lg bg-white px-4 py-2 shadow">
                Uploaded rows: <strong>{stats.uploaded}</strong>
              </div>
              <div className="rounded-lg bg-white px-4 py-2 shadow">
                Rows with matches: <strong>{stats.withMatches}</strong>
              </div>
              <div className="rounded-lg bg-white px-4 py-2 shadow">
                No match: <strong>{stats.withoutMatches}</strong>
              </div>
              <div className="rounded-lg bg-white px-4 py-2 shadow">
                DB hits: <strong>{stats.totalDbMatches}</strong>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2 capitalize">full_name</th>
                  <th className="px-3 py-2">Matches</th>
                </tr>
              </thead>
              <tbody>
                {(matchRows.length ? matchRows : excelRows.map((row, index) => ({ index, excelRow: row, matches: [] }))).map(
                  (row) => (
                    <tr key={row.index} className="border-t">
                      <td className="px-3 py-2 text-xs text-gray-500">{row.index + 1}</td>
                      <td className="px-3 py-2 text-xs">
                        {row.excelRow.full_name || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {row.matches.length === 0 ? (
                          <span className="text-xs text-gray-500">No match</span>
                        ) : (
                          <div className="space-y-2">
                            {row.matches.map((match) => (
                              <div key={match.voter_id} className="rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-xs text-emerald-900">
                                <div className="font-semibold">
                                  {match.full_name_mr || match.full_name} (#{match.voter_id})
                                </div>
                                <div className="text-[11px] text-emerald-700">
                                  Matched on: full_name → full_name_mr
                                </div>
                                <div className="flex flex-wrap gap-2 text-[11px] text-emerald-700">
                                  {match.colony_name && <span>Colony: {match.colony_name}</span>}
                                  {match.house_number && <span>House: {match.house_number}</span>}
                                  {match.voter_number && <span>Voter No: {match.voter_number}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

export default Exceldatabase;

