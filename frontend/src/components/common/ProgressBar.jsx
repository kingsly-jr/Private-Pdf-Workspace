import React from 'react';
import { Loader2 } from 'lucide-react';

export default function ProgressBar({ progress, statusText = "Processing document..." }) {
  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-brand-400 flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{statusText}</span>
        </span>
        <span className="text-white font-mono">{progress}%</span>
      </div>
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-indigo-400 transition-all duration-300 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
