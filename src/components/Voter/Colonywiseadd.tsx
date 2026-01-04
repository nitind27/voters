"use client";
import React, { useState } from "react";
import Voteradddashboard from "./Voteradddashboard";

type Props = {
  onAdded?: () => void | Promise<void>;
};

const Colonywiseadd: React.FC<Props> = ({ onAdded }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  return (
    <div className="text-left">
      <button
        onClick={() => setIsAddOpen(true)}
        className="shrink-0 flex items-center gap-1 px-3 py-3 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-colors"
        title="Add voter to this house"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add
      </button>

      <Voteradddashboard
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={onAdded}
      />
    </div>
  );
};

export default Colonywiseadd;