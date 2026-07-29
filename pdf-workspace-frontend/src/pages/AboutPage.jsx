import React from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { ShieldCheck, HardDrive, Cpu, Zap, Lock } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-2 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Stateless & Confidential Architecture</span>
          </div>

          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            About Roriri Workspace
          </h1>
          <p className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
            An internal PDF utility platform inspired by modern workflow design, built for maximum performance, privacy, and team efficiency.
          </p>
        </div>

        {/* Core Principles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">No Account Needed for Regular Usage</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Anyone on the internal network can open Roriri Workspace and use all 36 enabled tools immediately without signups, passwords, or login prompts.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Zero File Byte Persistence</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Uploaded PDFs are processed in isolated per-request UUID working directories and purged immediately after the response stream completes or after a 15-minute TTL.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Apache PDFBox & POI Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Powered by Spring Boot 3.3, Java 21, and Apache PDFBox 3.x for high-throughput, non-proprietary PDF operations.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Admin Control & Feature Flags</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Administrators manage feature flags, view anonymous usage telemetry, and configure system parameters via a secured `/admin` portal.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
