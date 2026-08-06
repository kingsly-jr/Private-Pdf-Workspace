import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-900 bg-slate-950 py-8 px-6 text-center text-xs text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Stateless & Confidential — No file persistence, auto-purged on response</span>
        </div>
        <div className="flex items-center space-x-4 text-slate-500">
          <span>Internal Network Roriri Workspace</span>
          <span>•</span>
          <span>High Performance Engine Active</span>
        </div>
      </div>
    </footer>
  );
}
