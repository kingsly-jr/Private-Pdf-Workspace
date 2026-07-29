import React, { useState, useEffect } from 'react';
import adminApi from '../../services/adminApi';
import { History, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminHistoryPage() {
  const [history, setHistory] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState('ALL');

  useEffect(() => {
    fetchHistory(currentPage, selectedTool);
  }, [currentPage, selectedTool]);

  const fetchHistory = async (page, tool) => {
    setLoading(true);
    try {
      const toolParam = tool !== 'ALL' ? `&toolKey=${tool}` : '';
      const res = await adminApi.get(`/history?page=${page}&size=15${toolParam}`);
      setHistory(res.data.content);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load telemetry history');
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Tool Usage History</h1>
          <p className="text-xs text-slate-400 mt-1">
            Anonymous telemetry log across all public user sessions. No IP or user identity is tracked.
          </p>
        </div>
        <button
          onClick={() => fetchHistory(currentPage, selectedTool)}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* History Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Tool</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Input Size</th>
                <th className="py-3.5 px-4">Output Size</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    No execution telemetry records found.
                  </td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white uppercase font-mono">{row.toolKey}</td>
                    <td className="py-3 px-4">
                      {row.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>SUCCESS</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                          <XCircle className="w-3 h-3" />
                          <span>{row.errorCode || 'FAILED'}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{formatSize(row.inputSizeBytes)}</td>
                    <td className="py-3 px-4 text-slate-300">{formatSize(row.outputSizeBytes)}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{row.durationMs} ms</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(row.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Page {currentPage + 1} of {totalPages}</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
