"use client";

import { ChangeEvent, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";

const NAME_FIELDS = [
  "full_name",
  "full_name_mr",
  "first_name_mr",
  "middle_name_mr",
  "last_name_mr",
] as const;

type NameField = (typeof NAME_FIELDS)[number];

type ExcelRow = Record<NameField, string>;

type DbMatch = {
  voter_id: number;
  full_name: string;
  full_name_mr: string;
  first_name_mr: string;
  middle_name_mr: string;
  last_name_mr: string;
  voter_number: string;
  mobile: string;
  colony_entry_id: number | null;
  colony_name: string;
  house_number: string;
  matchedOn: NameField[];
};

type RowMatchResult = {
  index: number;
  excelRow: ExcelRow;
  matches: DbMatch[];
};

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

const extractRelevantRow = (row: Record<string, unknown>): ExcelRow => {
  const normalizedMap = Object.entries(row).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[normalizeKey(key)] = value;
    return acc;
  }, {});

  return NAME_FIELDS.reduce((acc, field) => {
    const lookupKey = normalizeKey(field);
    const raw = normalizedMap[lookupKey];
    acc[field] = typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : "";
    return acc;
  }, {} as ExcelRow);
};

const hasAnyValue = (row: ExcelRow) =>
  NAME_FIELDS.some((field) => row[field] && row[field].trim().length > 0);

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
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      if (!rows.length) {
        toast.error("Uploaded sheet is empty.");
        return;
      }

      const extracted = rows.map(extractRelevantRow).filter(hasAnyValue);

      if (!extracted.length) {
        toast.error("Could not find the required name columns in this file.");
        return;
      }

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

    setIsMatching(true);
    try {
      const response = await fetch("/api/excel-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: excelRows }),
      });

      if (!response.ok) {
        throw new Error("Failed to match data.");
      }

      const data = (await response.json()) as { rows: RowMatchResult[]; totalDbMatches: number };
      setMatchRows(data.rows ?? []);
      setTotalDbMatches(data.totalDbMatches ?? 0);
      toast.success("Database matching completed.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to run database matching.");
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
        <span className="mt-2 text-xs text-gray-500">Required columns: {NAME_FIELDS.join(", ")}</span>
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
                  {NAME_FIELDS.map((field) => (
                    <th key={field} className="px-3 py-2 capitalize">
                      {field.replace(/_/g, " ")}
                    </th>
                  ))}
                  <th className="px-3 py-2">Matches</th>
                </tr>
              </thead>
              <tbody>
                {(matchRows.length ? matchRows : excelRows.map((row, index) => ({ index, excelRow: row, matches: [] }))).map(
                  (row) => (
                    <tr key={row.index} className="border-t">
                      <td className="px-3 py-2 text-xs text-gray-500">{row.index + 1}</td>
                      {NAME_FIELDS.map((field) => (
                        <td key={field} className="px-3 py-2 text-xs">
                          {row.excelRow[field] || <span className="text-gray-400">—</span>}
                        </td>
                      ))}
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
                                  Matched on:{" "}
                                  {match.matchedOn
                                    .map((field) => field.replace(/_/g, " "))
                                    .join(", ")}
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

