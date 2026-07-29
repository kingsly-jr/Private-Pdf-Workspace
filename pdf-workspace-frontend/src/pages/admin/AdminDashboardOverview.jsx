import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import { ToggleLeft, History, Settings, Users, ArrowUpRight, Plus, Sliders, ShieldCheck, Sparkles } from 'lucide-react';

export default function AdminDashboardOverview() {
  const [featureCount, setFeatureCount] = useState(36);
  const [historyCount, setHistoryCount] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        const [featRes, histRes] = await Promise.all([
          adminApi.get('/features'),
          adminApi.get('/history?size=1')
        ]);
        setFeatureCount(featRes.data.length);
        setHistoryCount(histRes.data.totalElements || 0);
      } catch (err) {
        console.error('Failed to fetch dashboard overview metrics:', err);
      }
    };
    fetchOverviewData();
  }, []);

  const quickActions = [
    {
      title: 'Add New Feature Flag',
      description: 'Register and enable a new PDF tool feature in real-time.',
      icon: Sparkles,
      color: 'from-amber-500/20 to-brand-500/20 text-amber-400 border-amber-500/30',
      path: '/admin/features?action=new',
      highlight: true
    },
    {
      title: 'Manage Feature Flags',
      description: 'Enable or disable individual tools across the platform live.',
      icon: Sliders,
      color: 'from-brand-500/20 to-indigo-500/20 text-brand-400 border-brand-500/30',
      path: '/admin/features'
    },
    {
      title: 'Inspect Telemetry Logs',
      description: 'View anonymous tool usage history, processing times & error status.',
      icon: History,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
      path: '/admin/history'
    },
    {
      title: 'Admin Account & Security',
      description: 'Manage admin user accounts, change passwords, and scope access.',
      icon: ShieldCheck,
      color: 'from-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/30',
      path: '/admin/accounts'
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Dashboard Overview</h1>
        <p className="text-xs text-slate-400 mt-1">System status and live operational control indicators.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl">
            <ToggleLeft className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Registered Tools</div>
            <div className="text-xl font-bold text-white mt-0.5">{featureCount} Tools</div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Runs</div>
            <div className="text-xl font-bold text-white mt-0.5">{historyCount} Executions</div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Admin Auth</div>
            <div className="text-xl font-bold text-white mt-0.5">JWT Scoped</div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">System TTL</div>
            <div className="text-xl font-bold text-white mt-0.5">15 Minutes</div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="space-y-4 pt-2">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Quick Actions</h2>
          <p className="text-xs text-slate-400">Shortcuts to perform frequent administrative operations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <div
                key={idx}
                onClick={() => navigate(action.path)}
                className={`glass-card p-5 rounded-2xl border cursor-pointer group transition-all hover:scale-[1.02] flex flex-col justify-between ${
                  action.highlight
                    ? 'border-brand-500/40 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-brand-950/20'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${action.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {action.description}
                  </p>
                </div>

                {action.highlight && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-amber-400">
                    <span>Create Feature</span>
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
