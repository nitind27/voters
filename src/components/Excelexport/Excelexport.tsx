"use client";

import { ChangeEvent, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";

type ExcelRow = Record<string, string | number | boolean | null>;

const EMPTY_KEY = "__EMPTY__";

const Excelexport = () => {
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<ExcelRow[]>([]);
  const [uniqueRows, setUniqueRows] = useState<ExcelRow[]>([]);
  const [duplicateRows, setDuplicateRows] = useState<ExcelRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const totals = useMemo(
    () => ({
      total: rawRows.length,
      unique: uniqueRows.length,
      duplicates: duplicateRows.length,
    }),
    [rawRows.length, uniqueRows.length, duplicateRows.length]
  );

  const runDeduplication = (rows: ExcelRow[], keys: string[]) => {
    if (!rows.length || keys.length === 0) {
      setUniqueRows(rows);
      setDuplicateRows([]);
      return;
    }

    const bucket = new Map<string, ExcelRow[]>();

    rows.forEach((row) => {
      const compositeKey = keys
        .map((key) => String(row[key] ?? EMPTY_KEY))
        .join("|");
      const group = bucket.get(compositeKey) ?? [];
      group.push(row);
      bucket.set(compositeKey, group);
    });

    const deduped: ExcelRow[] = [];
    const dupes: ExcelRow[] = [];

    bucket.forEach((group) => {
      deduped.push(group[0]);
      if (group.length > 1) {
        dupes.push(...group);
      }
    });

    setUniqueRows(deduped);
    setDuplicateRows(dupes);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: ExcelRow[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        toast.error("Uploaded sheet is empty.");
        return;
      }

      const detectedColumns = Object.keys(rows[0]);
      const defaultKey =
        detectedColumns.find((col) =>
          ["voter_number", "mobile", "Phone", "Mobile"].includes(col)
        ) || detectedColumns[0];

      setFileName(file.name);
      setColumns(detectedColumns);
      setSelectedColumns(defaultKey ? [defaultKey] : []);
      setRawRows(rows);
      runDeduplication(rows, defaultKey ? [defaultKey] : []);
      toast.success("Excel parsed successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to read the Excel file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns((prev) => {
      const next = prev.includes(column)
        ? prev.filter((col) => col !== column)
        : [...prev, column];
      runDeduplication(rawRows, next);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedColumns.length === columns.length) {
      setSelectedColumns([]);
      runDeduplication(rawRows, []);
    } else {
      setSelectedColumns(columns);
      runDeduplication(rawRows, columns);
    }
  };

  const downloadSheet = (rows: ExcelRow[], suffix: string) => {
    if (!rows.length) {
      toast.info("Nothing to download for this set.");
      return;
    }

    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");

    const safeName = fileName.replace(/\.xlsx?$/i, "") || "dataset";
    XLSX.writeFile(workbook, `${safeName}_${suffix}.xlsx`);
  };

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Excel Matching </h1>
       
      </div>

      <label
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center hover:border-brand-400"
        htmlFor="excel-upload"
      >
        <input
          id="excel-upload"
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFile}
        />
        <span className="text-lg font-medium text-brand-600">Click to upload</span>
        <span className="text-xs text-gray-500 mt-2">
          Supported formats: .xlsx, .xls, .csv
        </span>
        {fileName && <span className="mt-4 text-sm text-gray-700">Loaded: {fileName}</span>}
      </label>

      {rawRows.length > 0 && (
        <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex max-w-xs flex-1 flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Check duplicates using columns
                </span>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={
                      selectedColumns.length > 0 &&
                      selectedColumns.length === columns.length
                    }
                    onChange={handleSelectAll}
                  />
                  Select all
                </label>
              </div>
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 text-sm">
                {columns.map((col) => (
                  <label
                    key={col}
                    className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={selectedColumns.includes(col)}
                      onChange={() => handleColumnToggle(col)}
                    />
                    {col}
                  </label>
                ))}
                {columns.length === 0 && (
                  <span className="text-xs text-gray-400">
                    No columns detected
                  </span>
                )}
              </div>
              {selectedColumns.length === 0 && (
                <span className="text-xs text-amber-600">
                  No columns selected. Showing entire sheet without duplicate
                  split.
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="rounded-lg bg-white px-4 py-2 shadow">
                Total rows: <strong>{totals.total}</strong>
              </div>
              <div className="rounded-lg bg-white px-4 py-2 shadow">
                Unique rows: <strong>{totals.unique}</strong>
              </div>
              <div className="rounded-lg bg-white px-4 py-2 shadow">
                Duplicate rows: <strong>{totals.duplicates}</strong>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => downloadSheet(uniqueRows, "unique")}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Download unique rows
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => downloadSheet(duplicateRows, "duplicates")}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              Download duplicate rows
            </button>
          </div>

          {duplicateRows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-amber-100 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-amber-50 text-amber-700">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Duplicate key value</th>
                    <th className="px-3 py-2">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {duplicateRows.slice(0, 10).map((row, index) => {
                    const signature = selectedColumns.length
                      ? selectedColumns
                          .map((col) => String(row[col] ?? EMPTY_KEY))
                          .join("|")
                      : `row-${index}`;
                    return (
                      <tr key={`${signature}-${index}`} className="border-t">
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2">
                          {selectedColumns.length
                            ? selectedColumns
                                .map((col) => `${col}: ${row[col] ?? "Empty"}`)
                                .join(" | ")
                            : "All columns"}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {(selectedColumns.length ? selectedColumns : columns)
                            .slice(0, 3)
                            .map((col) => `${col}: ${row[col] ?? "-"}`)
                            .join(" • ")}
                        </td>
                      </tr>
                    );
                  })}
                  {duplicateRows.length > 10 && (
                    <tr className="border-t bg-amber-50 text-xs text-amber-700">
                      <td colSpan={3} className="px-3 py-2">
                        +{duplicateRows.length - 10} more duplicate rows…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default Excelexport;