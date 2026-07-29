import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { ShieldCheck, Lock, User, KeyRound, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [forcePasswordMode, setForcePasswordMode] = useState(false);

  const { login, changePassword } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/admin';

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const adminUser = await login(username, password);
      toast.success('Logged in successfully!');
      
      if (adminUser.mustChangePassword) {
        setForcePasswordMode(true);
        toast.error('First login detected: Please set a new secure password.', { duration: 5000 });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid username or password';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(password, newPassword);
      toast.success('Password updated successfully!');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-brand-600 to-indigo-500 rounded-2xl mx-auto flex items-center justify-center shadow-glow mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h1>
          <p className="text-sm text-slate-400 mt-1">Roriri Workspace Control Panel</p>
        </div>

        <div className="glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!forcePasswordMode ? (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label htmlFor="admin-username" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    id="admin-username"
                    name="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder="Enter admin username"
                    className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    id="admin-password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter admin password"
                    className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-glow flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {submitting ? 'Authenticating...' : 'Sign In to Admin Panel'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordChangeSubmit} className="space-y-5">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs leading-relaxed">
                Security requirement: You are using initial default credentials. Please set your new password before continuing.
              </div>

              <div>
                <label htmlFor="admin-new-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">New Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    id="admin-new-password"
                    name="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-confirm-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Confirm New Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    id="admin-confirm-password"
                    name="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Repeat new password"
                    className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-xl transition-all shadow-glow flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {submitting ? 'Updating...' : 'Update Password & Access Dashboard'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-8 text-center">
          <a href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Return to Public Tools Workspace
          </a>
        </div>
      </div>
    </div>
  );
}
