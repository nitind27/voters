"use client";

import React, { useState, useMemo } from "react";
import DataTable from "react-data-table-component";
import { Column, FilterOption } from "./tabletype";

// Interface for finance-related data with installment fields
interface FinanceRow {
  inst_1_paid?: string | number | boolean | null;
  inst_2_paid?: string | number | boolean | null;
  inst_3_paid?: string | number | boolean | null;
  [key: string]: unknown;
}

type Props<T> = {
  data: T[];
  columns: Column<T>[];
  filterOptions?: FilterOption[];
  filterKey?: keyof T;
  inputfiled?: React.ReactNode;
  submitbutton?: React.ReactNode;
  title?: string;
  searchKey?: string;
  classname?: string;
};

export function Withoutbtn<T extends object>({
  data,
  columns,
  filterOptions = [],
  filterKey,
  inputfiled,
  submitbutton,
}: Props<T>) {
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(50);

  // Make sure to include perPage and currentPage in the dependency array!
  const reactColumns = useMemo(() => {
    return [
      {
        name: "SR No.",
        cell: (_row: T, index: number) => (perPage * (currentPage - 1)) + index + 1,
        width: "80px",
      },
      ...columns.map((col) => ({
        name: col.label,
        selector: (row: T) =>
          col.accessor ? String(row[col.accessor] ?? "") : "",
        cell: col.render
          ? (row: T) => col.render?.(row)
          : (row: T) => (col.accessor ? String(row[col.accessor]) : ""),
        sortable: true,
      })),
    ];
  }, [columns, perPage, currentPage]); // <-- Add perPage and currentPage here

  const filteredData = useMemo(() => {
    let tempData = [...data];

    // Filter by dropdown value
    if (filter && filterKey) {
      tempData = tempData.filter(
        (row) => String(row[filterKey]) === String(filter)
      );
    }

    // Global search across all keys
    if (search) {
      tempData = tempData.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(search.toLowerCase())
        )
      );
    }

    return tempData;
  }, [data, filter, filterKey, search]);

  const SubHeaderComponent = (
    <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-4 w-full">
      <div className="inline-flex items-center gap-2 w-full md:w-auto flex-1">
        {filterOptions.length > 0 && filterKey && (
          <select
            className="border rounded px-3 py-2"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All</option>
            {filterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        <input
          type="text"
          placeholder="Search..."
          className="rounded border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03] hover:shadow-sm transition-shadow md:w-auto flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="inline-flex items-center gap-2 w-full md:w-auto">
        {inputfiled}
        {submitbutton}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-md  border p-4">
      <DataTable
        columns={reactColumns}
        data={filteredData}
        pagination
        paginationPerPage={perPage}
        paginationDefaultPage={currentPage}
        onChangePage={page => setCurrentPage(page)}
        onChangeRowsPerPage={newPerPage => {
          setPerPage(newPerPage);
          setCurrentPage(1); // Reset to first page when page size changes
        }}
        highlightOnHover
        responsive
        striped
        persistTableHead
        subHeader
        subHeaderComponent={SubHeaderComponent}
        conditionalRowStyles={[
          {
            when: (row: T) => {
              // Check if row has installment payment fields and any is paid
              const hasInstFields = 'inst_1_paid' in row || 'inst_2_paid' in row || 'inst_3_paid' in row;
              if (!hasInstFields) return false;
              
              const financeRow = row as FinanceRow;
              const inst1 = financeRow.inst_1_paid;
              const inst2 = financeRow.inst_2_paid;
              const inst3 = financeRow.inst_3_paid;

              const isPaid = (value: string | number | boolean | null | undefined): boolean => {
                if (value === null || value === undefined) return false;
                if (typeof value === 'boolean') return value === true;
                const str = String(value).trim();
                return str === '1' || str === 'true' || str === 'True' || value === 1;
              };
              
              return isPaid(inst1) || isPaid(inst2) || isPaid(inst3);
            },
            style: {
              backgroundColor: '#beebcc', // bg-green-50 equivalent
            },
          },
        ]}
        customStyles={{
          rows: {
            style: {
              minHeight: "48px",
            },
          },
         headCells: {
        style: {
          fontWeight: "600",
          // fontSize: "14px",
          border: "1px solid #ddd",
          // borderTop: "white",
          // borderLeft: "white",
          // borderRight: "white",
        },
      },
      cells: {
        style: {
          border: "1px solid #ddd",
          // borderTop: "white",
          // borderLeft: "white",
          // borderRight: "white",
        },
      },
    }}
      />
    </div>
  );
}