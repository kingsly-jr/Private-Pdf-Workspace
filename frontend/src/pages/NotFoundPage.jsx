import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { AlertCircle, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md glass-card p-10 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-2">404</h1>
          <h2 className="text-lg font-bold text-slate-200 mb-3">Page Not Found</h2>
          <p className="text-xs text-slate-400 mb-8 leading-relaxed">
            The tool or page you requested does not exist or has been disabled by an administrator.
          </p>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-glow"
          >
            <Home className="w-4 h-4" />
            <span>Return to Roriri Workspace</span>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
