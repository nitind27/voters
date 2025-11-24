 "use client";

import { useState } from "react";
import Excelexport from "@/components/Excelexport/Excelexport";
import Exceldatabase from "@/components/Excelexport/Exceldatabase";

type TabId = "split" | "db";

const tabs: { id: TabId; title: string; }[] = [
  {
    id: "split",
    title: "Excel Matching",
    // subtitle: "Upload Excel and split duplicates vs uniques",
  },
  {
    id: "db",
    title: "Excel vs Database Matcher",
    // subtitle: "Check uploaded names against voter_entry records",
  },
];

const ExcelExportPage = () => {
  const [activeTab, setActiveTab] = useState<TabId>("split");

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap gap-4">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-w-[220px] flex-1 flex-col rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
                isActive
                  ? "border-brand-500 bg-brand-600 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-brand-300"
              }`}
            >
              <span className="text-sm font-semibold">{tab.title}</span>
              
            </button>
          );
        })}
      </div>

      <div className="space-y-8">
        {activeTab === "split" && <Excelexport />}
        {activeTab === "db" && <Exceldatabase />}
      </div>
    </div>
  );
};

export default ExcelExportPage;