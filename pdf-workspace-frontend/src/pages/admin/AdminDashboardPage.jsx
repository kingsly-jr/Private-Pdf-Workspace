import React, { useState } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck, Settings, ToggleLeft, History, Users } from 'lucide-react';
import LogoutConfirmationModal from '../../components/admin/LogoutConfirmationModal';
import toast from 'react-hot-toast';

export default function AdminDashboardPage() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleConfirmLogout = () => {
    logout();
    toast.success('Logged out successfully.');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Admin Top Navigation */}
      <header className="border-b border-slate-800 glass-panel px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-glow">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Admin Portal</h1>
            <p className="text-xs text-slate-400">Roriri Workspace Internal Management</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-white">{user?.username}</div>
            <div className="text-xs text-slate-400">{user?.email}</div>
          </div>
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center space-x-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl transition-all border border-slate-700"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Admin Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
          <p className="text-slate-400 text-sm mt-1">Welcome back, {user?.username}. System controls and feature flag management are active.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center space-x-4">
            <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl">
              <ToggleLeft className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Feature Flags</div>
              <div className="text-xl font-bold text-white mt-0.5">36 PDF Tools</div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Telemetry</div>
              <div className="text-xl font-bold text-white mt-0.5">Anonymous Logging</div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Admin Users</div>
              <div className="text-xl font-bold text-white mt-0.5">Secured Scope</div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center space-x-4">
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">App Settings</div>
              <div className="text-xl font-bold text-white mt-0.5">100MB / 15m TTL</div>
            </div>
          </div>
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        username={user?.username}
        email={user?.email}
      />
    </div>
  );
}
