import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ToolsGrid from '../components/public/ToolsGrid';
import UploadArea from '../components/common/UploadArea';
import FileCard from '../components/common/FileCard';
import ProgressBar from '../components/common/ProgressBar';
import useUpload from '../hooks/useUpload';
import useProcessing from '../hooks/useProcessing';
import useDownload from '../hooks/useDownload';
import api from '../services/api';
import { ArrowRight, ShieldCheck, Zap, RefreshCw, Lock, HardDrive, Cpu, HelpCircle, ChevronDown, MessageSquare, Star, Send } from 'lucide-react';
import toast from 'react-hot-toast';

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
    a: 'By default, the file upload limit is 100MB per file. This limit is configurable by administrators in the system settings.'
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

export default function PublicHomePage() {
  const { files, addFiles, removeFile, clearFiles, hasFiles } = useUpload(100, 1);
  const { isProcessing, progress, startProcessing, updateProgress, finishProcessing, handleError } = useProcessing();
  const { downloadBlob } = useDownload();
  const [testResultSuccess, setTestResultSuccess] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Feedback Form State
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackCategory, setFeedbackCategory] = useState('GENERAL');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const scrollTarget = params.get('scroll');
    if (scrollTarget) {
      setTimeout(() => {
        const el = document.getElementById(scrollTarget);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location]);

  const handleRunEchoTest = async () => {
    if (!hasFiles) {
      toast.error('Please select a file to test the public processing pipe.');
      return;
    }

    startProcessing();
    setTestResultSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      updateProgress(40);

      const response = await api.post('/pdf/echo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 60) / progressEvent.total) + 10;
          updateProgress(percent);
        }
      });

      updateProgress(90);
      downloadBlob(response.data, `echo_${files[0].name}`);
      finishProcessing();
      setTestResultSuccess(true);
      toast.success('Public pipe test passed! Stateless echo response received.');

    } catch (err) {
      handleError(err, 'Echo Pipe Test');
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) {
      toast.error('Please enter your feedback message.');
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      await api.post('/feedback', {
        name: feedbackName.trim(),
        email: feedbackEmail.trim(),
        rating: feedbackRating,
        category: feedbackCategory,
        message: feedbackMessage.trim(),
      });

      toast.success('Thank you! Your feedback has been sent directly to the Admin Panel.');
      setFeedbackName('');
      setFeedbackEmail('');
      setFeedbackRating(5);
      setFeedbackCategory('GENERAL');
      setFeedbackMessage('');
    } catch (err) {
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-16 pb-12 px-6 text-center overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-brand-600/15 via-indigo-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-4xl mx-auto relative z-10">
            <div className="inline-flex items-center space-x-2 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 mb-6">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Stateless & Confidential PDF Suite</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
              Every PDF Tool You Need. <br />
              <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                Private. Stateless. Immediate.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
              No account required. Open to all users on our network. Files are processed statelessly in temporary working directories and wiped immediately.
            </p>
          </div>
        </section>

        {/* Live Public Pipe Test Area */}
        <section className="max-w-3xl mx-auto px-6 mb-16">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Public Processing Pipe Test</h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                Stateless / Echo Endpoint
              </span>
            </div>

            {!hasFiles ? (
              <UploadArea onFilesSelected={addFiles} title="Upload PDF to test public pipe" />
            ) : (
              <div className="space-y-4">
                <FileCard file={files[0]} onRemove={clearFiles} index={0} />

                {isProcessing && <ProgressBar progress={progress} statusText="Processing stateless echo pipe..." />}

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    onClick={clearFiles}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleRunEchoTest}
                    disabled={isProcessing}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-glow transition-all flex items-center space-x-2 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        <span>Test Pipe & Download</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Dynamic 36 PDF Tools Grid */}
        <section className="bg-slate-950/80 border-t border-slate-900 py-12">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-extrabold text-white">All 36 PDF Tools</h2>
            <p className="text-xs text-slate-400 mt-1">Select any tool to start processing statelessly</p>
          </div>
          <ToolsGrid />
        </section>

        {/* Embedded About Section */}
        <section id="about" className="py-20 px-6 max-w-5xl mx-auto border-t border-slate-900">
          <div className="text-center space-y-4 mb-12">
            <div className="inline-flex items-center space-x-2 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Stateless & Confidential Architecture</span>
            </div>

            <h2 className="text-3xl font-extrabold text-white tracking-tight">About Roriri Workspace</h2>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
              An internal PDF utility platform inspired by modern workflow design, built for maximum performance, privacy, and team efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">No Account Required</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Anyone on the internal network can open Roriri Workspace and use all 36 enabled tools immediately without signups or login prompts.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Zero File Byte Persistence</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Uploaded PDFs are processed in isolated per-request UUID working directories and purged immediately after response streaming.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Apache PDFBox & POI Engine</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Powered by Spring Boot 3.3, Java 21, and Apache PDFBox 3.x for high-throughput, non-proprietary PDF operations.
              </p>
            </div>
          </div>
        </section>

        {/* Embedded FAQ Section */}
        <section id="faq" className="py-20 px-6 max-w-3xl mx-auto border-t border-slate-900">
          <div className="text-center space-y-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-400">Everything you need to know about Roriri Workspace privacy and usage.</p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="glass-card rounded-2xl border border-slate-800 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaqIndex(prev => (prev === idx ? null : idx))}
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
        </section>

        {/* User Feedback Section (Right Below FAQ) */}
        <section id="feedback" className="py-20 px-6 max-w-3xl mx-auto border-t border-slate-900">
          <div className="text-center space-y-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Share Your Feedback</h2>
            <p className="text-xs text-slate-400">We value your thoughts! Send your suggestions, feature requests, or bug reports directly to the team.</p>
          </div>

          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl">
            <form onSubmit={handleFeedbackSubmit} className="space-y-5">
              {/* Rating Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Rate your experience
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className="p-1 text-slate-600 hover:text-amber-400 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= feedbackRating
                            ? 'text-amber-400 fill-amber-400 shadow-glow'
                            : 'text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-brand-300 font-bold ml-2">
                    {feedbackRating === 5 ? 'Excellent 🌟' : feedbackRating === 4 ? 'Good 👍' : feedbackRating === 3 ? 'Average 👌' : feedbackRating === 2 ? 'Fair 😐' : 'Poor 👎'}
                  </span>
                </div>
              </div>

              {/* Feedback Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Feedback Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'GENERAL', label: 'General' },
                    { id: 'FEATURE_REQUEST', label: 'Feature Request' },
                    { id: 'BUG_REPORT', label: 'Bug Report' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFeedbackCategory(cat.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                        feedbackCategory === cat.id
                          ? 'bg-brand-600 text-white border-brand-500 shadow-glow'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Email Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={feedbackName}
                    onChange={(e) => setFeedbackName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Your Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Message Textarea */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Your Message *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tell us what you like or what we can improve..."
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-glow transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmittingFeedback ? 'Sending...' : 'Submit Feedback'}</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
