"use client";
import React, { useState } from "react";
import Allvoters from "./Allvoters";
import ColonyWiseVoters from "./ColonyWiseVoters";
import { colonyentrydatatype, Voterdatatye, voterdayatype } from "./Votertype";

type Props = {
  colony: Voterdatatye[];
  colonyentry: colonyentrydatatype[];
  voterentry: voterdayatype[];
};

const VoterTabs: React.FC<Props> = ({ colony, colonyentry, voterentry }) => {
  const [active, setActive] = useState<"details" | "colony">("details");

  return (
    <div className="">
      {/* Button grid tabs */}
      <div className="grid grid-cols-2 gap-3 mb-5" role="tablist" aria-label="Voter tabs">
        <button
          type="button"
          role="tab"
          aria-selected={active === "details"}
          aria-controls="tab-panel-details"
          onClick={() => setActive("details")}
          className={`h-11 rounded-lg text-sm font-medium transition-colors
            ${active === "details"
              ? "bg-blue-600 text-white shadow"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}
        >
          Voter Details
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "colony"}
          aria-controls="tab-panel-colony"
          onClick={() => setActive("colony")}
          className={`h-11 rounded-lg text-sm font-medium transition-colors
            ${active === "colony"
              ? "bg-blue-600 text-white shadow"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}
        >
          Colony wise Voter details
        </button>
      </div>

      {/* Panels */}
      <div
        id="tab-panel-details"
        role="tabpanel"
        hidden={active !== "details"}
        className="focus:outline-none"
      >
        {active === "details" && (
          <Allvoters colony={colony} colonyentry={colonyentry} voterentry={voterentry} />
        )}
      </div>

      <div
        id="tab-panel-colony"
        role="tabpanel"
        hidden={active !== "colony"}
        className="focus:outline-none"
      >
        {active === "colony" && (
          <ColonyWiseVoters colonyentry={colonyentry} voterentry={voterentry} />
        )}
      </div>
    </div>
  );
};

export default VoterTabs;