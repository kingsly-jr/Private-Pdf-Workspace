import React, { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQS = [
  {
    q: 'Do I need an account to use the PDF tools?',
    a: 'No! Regular users need no account. Anyone on our network can open the site and use every enabled tool immediately with zero login or signup prompts.'
  },
  {
    q: 'Are my uploaded PDF files saved on the server?',
    a: 'Never. Uploaded PDFs are processed statelessly in temporary UUID working directories and deleted immediately after the response is sent. Any orphaned temporary files are automatically wiped by a scheduled 15-minute background sweep.'
  },
  {
    q: 'What is the maximum allowed file upload size?',
    a: 'By default, the file upload limit is 100MB per file. This limit is configurable by administrators in the Admin Panel settings.'
  },
  {
    q: 'How does the Admin Panel work?',
    a: 'Only administrators log in at /admin/login. The Admin Panel allows toggling tools on/off (feature flags), viewing anonymous usage telemetry across sessions, configuring upload size limits, and managing admin user accounts.'
  },
  {
    q: 'Are encrypted or password-protected PDFs supported?',
    a: 'Yes! For protected PDFs, use the "Unlock PDF" tool by entering your current document password. Tools will gracefully detect password-protected PDFs and surface clean error prompts if a password is required.'
  },
  {
    q: 'Which technology stack powers Roriri Workspace?',
    a: 'The backend is built with Spring Boot 3.3, Java 21 LTS, PostgreSQL, Apache PDFBox 3.x, and Apache POI. The frontend is built with React 19, Vite, and Tailwind CSS.'
  }
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleAccordion = (idx) => {
    setOpenIndex(prev => (prev === idx ? null : idx));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-12 space-y-8">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Frequently Asked Questions</h1>
          <p className="text-xs text-slate-400">Everything you need to know about Roriri Workspace privacy and usage.</p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="glass-card rounded-2xl border border-slate-800 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleAccordion(idx)}
                  className="w-full p-5 text-left flex items-center justify-between font-bold text-sm text-white hover:text-brand-300 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-brand-400' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
