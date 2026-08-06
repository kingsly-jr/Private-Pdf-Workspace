import React from 'react';
import { FileText, X, HardDrive } from 'lucide-react';

export default function FileCard({ file, onRemove, index }) {
  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="glass-card p-4 rounded-xl border border-slate-800 flex items-center justify-between space-x-4">
      <div className="flex items-center space-x-3 overflow-hidden">
        <div className="w-10 h-10 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0 border border-brand-500/20">
          <FileText className="w-5 h-5" />
        </div>
        <div className="truncate">
          <div className="text-sm font-semibold text-white truncate">{file.name}</div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
            <span className="flex items-center space-x-1">
              <HardDrive className="w-3 h-3 text-slate-500" />
              <span>{formatSize(file.size)}</span>
            </span>
          </div>
        </div>
      </div>

      {onRemove && (
        <button
          onClick={() => onRemove(index)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Remove file"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
