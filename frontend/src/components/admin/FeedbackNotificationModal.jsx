import React, { useState, useEffect } from 'react';
import adminApi from '../../services/adminApi';
import { Bell, X, Star, CheckCircle, Trash2, Mail, MessageSquare, Tag, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FeedbackNotificationModal({ isOpen, onClose, onUnreadCountChange }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, UNREAD, READ

  useEffect(() => {
    if (isOpen) {
      fetchFeedbacks();
    }
  }, [isOpen]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/feedback');
      setFeedbacks(res.data);
      const unreadCount = res.data.filter(f => !f.isRead).length;
      if (onUnreadCountChange) onUnreadCountChange(unreadCount);
    } catch (err) {
      toast.error('Failed to load user feedback notifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await adminApi.put(`/feedback/${id}/read`);
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, isRead: true } : f));
      const newUnread = feedbacks.filter(f => f.id !== id && !f.isRead).length;
      if (onUnreadCountChange) onUnreadCountChange(newUnread);
      toast.success('Marked as read');
    } catch (err) {
      toast.error('Failed to update feedback status.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminApi.delete(`/feedback/${id}`);
      setFeedbacks(prev => prev.filter(f => f.id !== id));
      const newUnread = feedbacks.filter(f => f.id !== id && !f.isRead).length;
      if (onUnreadCountChange) onUnreadCountChange(newUnread);
      toast.success('Feedback entry deleted.');
    } catch (err) {
      toast.error('Failed to delete feedback.');
    }
  };

  if (!isOpen) return null;

  const filteredFeedbacks = feedbacks.filter(f => {
    if (filter === 'UNREAD') return !f.isRead;
    if (filter === 'READ') return f.isRead;
    return true;
  });

  const unreadCount = feedbacks.filter(f => !f.isRead).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-lg animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">User Feedback Notifications</h2>
              <p className="text-xs text-slate-400">Live submissions from site visitors and public users.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/50 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            {['ALL', 'UNREAD', 'READ'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  filter === f
                    ? 'bg-brand-600 text-white shadow-glow'
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
              >
                {f} {f === 'UNREAD' && unreadCount > 0 ? `(${unreadCount})` : ''}
              </button>
            ))}
          </div>
          <span className="text-slate-500">{filteredFeedbacks.length} items</span>
        </div>

        {/* Feedback List */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-xs animate-pulse">
              Loading feedback notifications...
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-700 mx-auto" />
              <p className="text-sm font-semibold text-slate-400">No feedback entries found.</p>
              <p className="text-xs text-slate-600">Submissions from public visitors will appear here.</p>
            </div>
          ) : (
            filteredFeedbacks.map((f) => (
              <div
                key={f.id}
                className={`p-4 rounded-2xl border transition-all ${
                  !f.isRead
                    ? 'bg-slate-900/80 border-brand-500/30 shadow-md'
                    : 'bg-slate-950/40 border-slate-800/80 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white">{f.name || 'Anonymous User'}</span>
                      {!f.isRead && (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          New
                        </span>
                      )}
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                        {f.category?.replace('_', ' ')}
                      </span>
                    </div>

                    {f.email && (
                      <div className="flex items-center space-x-1 text-xs text-slate-400">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{f.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Star Rating */}
                  <div className="flex items-center space-x-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= (f.rating || 5)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-3 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                  "{f.message}"
                </p>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-[11px] text-slate-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-600" />
                    <span>{f.createdAt ? new Date(f.createdAt).toLocaleString() : 'Just now'}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!f.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(f.id)}
                        className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Mark Read</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete feedback"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
