import React from 'react';
import { LogOut, X, ShieldAlert, User } from 'lucide-react';

export default function LogoutConfirmationModal({ isOpen, onClose, onConfirm, username, email }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg">
            <LogOut className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Sign Out of Admin Dashboard</h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Are you sure you want to end your administrator session? You will need to log in again to access control features.
            </p>
          </div>

          {username && (
            <div className="w-full bg-slate-950/70 rounded-2xl p-3 border border-slate-800 flex items-center space-x-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">{username}</div>
                <div className="text-[10px] text-slate-400 truncate">{email}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 w-full pt-3 border-t border-slate-800/80">
            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-glow transition-all flex items-center justify-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
