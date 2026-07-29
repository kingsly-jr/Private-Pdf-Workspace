import React, { useState } from 'react';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';
import UploadArea from '../common/UploadArea';
import FileCard from '../common/FileCard';
import ProgressBar from '../common/ProgressBar';
import useUpload from '../../hooks/useUpload';
import useProcessing from '../../hooks/useProcessing';
import api from '../../services/api';
import { Sparkles, Copy, Download, FileText, Check, ListChecks, Key, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PdfAiSummaryToolView() {
  const { files, addFiles, removeFile, clearFiles, hasFiles } = useUpload(100, 1);
  const { isProcessing, progress, startProcessing, updateProgress, finishProcessing, handleError } = useProcessing();

  const [summaryData, setSummaryData] = useState(null);
  const [activeTab, setActiveTab] = useState('executive');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!hasFiles) {
      toast.error('Please select a PDF document to summarize.');
      return;
    }

    startProcessing();

    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      updateProgress(40);

      const response = await api.post('/pdf/ai-summary', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 40) / progressEvent.total) + 20;
          updateProgress(percent);
        }
      });

      updateProgress(90);
      setSummaryData(response.data);
      finishProcessing();
      toast.success('AI Document Summary generated successfully!');

    } catch (err) {
      handleError(err, 'AI Summarizer');
    }
  };

  const handleCopy = () => {
    if (!summaryData) return;
    navigator.clipboard.writeText(summaryData.rawMarkdown);
    setCopied(true);
    toast.success('Summary copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!summaryData) return;
    const blob = new Blob([summaryData.rawMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `summary_${summaryData.fileName.replace(/\.pdf$/i, '')}.md`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded summary Markdown!');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center mx-auto shadow-glow">
            <Sparkles className="w-6 h-6 text-brand-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">AI Document Summarizer</h1>
          <p className="text-xs text-slate-400 max-w-xl mx-auto">
            Extract key insights, executive summaries, bullet points, keywords, and action items from your PDFs.
          </p>
        </div>

        {summaryData ? (
          /* Summary Results Display Panel */
          <div className="glass-card p-6 md:p-8 rounded-3xl border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <span className="text-xs font-bold text-brand-400 uppercase tracking-wider block">Document Analysis</span>
                <h2 className="text-xl font-extrabold text-white mt-0.5">{summaryData.fileName}</h2>
                <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                  <span>{summaryData.pageCount} Pages</span>
                  <span>•</span>
                  <span>{summaryData.wordCount.toLocaleString()} Words</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold rounded-xl text-slate-200 hover:text-white transition-all flex items-center space-x-2"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownloadTxt}
                  className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-xs font-bold rounded-xl text-white shadow-glow transition-all flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download (.md)</span>
                </button>
                <button
                  onClick={() => { setSummaryData(null); clearFiles(); }}
                  className="px-3 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Summarize Another
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-800 overflow-x-auto">
              {[
                { id: 'executive', label: 'Executive Summary', icon: FileText },
                { id: 'highlights', label: 'Key Highlights', icon: ListChecks },
                { id: 'keywords', label: 'Keywords', icon: Key },
                { id: 'actions', label: 'Action Items', icon: Sparkles }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-brand-500 text-brand-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 min-h-[220px]">
              {activeTab === 'executive' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Executive Overview</h3>
                  <p className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">{summaryData.executiveSummary}</p>
                </div>
              )}

              {activeTab === 'highlights' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Key Highlights & Findings</h3>
                  <ul className="space-y-2">
                    {summaryData.bulletPoints.map((item, idx) => (
                      <li key={idx} className="flex items-start space-x-2 text-xs text-slate-200">
                        <span className="text-brand-400 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === 'keywords' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Frequent Terms & Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {summaryData.keywords.map((kw, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-brand-500/10 text-brand-300 border border-brand-500/20 text-xs font-bold rounded-lg">
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identified Action Items</h3>
                  {summaryData.actionItems.length === 0 ? (
                    <p className="text-xs text-slate-500">No explicit deadline action items detected.</p>
                  ) : (
                    <ul className="space-y-2">
                      {summaryData.actionItems.map((act, idx) => (
                        <li key={idx} className="flex items-start space-x-2 text-xs text-amber-300">
                          <span className="font-bold">➔</span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* File Upload & Start State */
          <div className="glass-card p-6 md:p-8 rounded-3xl border border-slate-800 space-y-6">
            {!hasFiles ? (
              <UploadArea
                onFilesSelected={addFiles}
                accept={{ 'application/pdf': ['.pdf'] }}
                multiple={false}
                title="Upload PDF for AI Summarizer"
                subtitle="Drag & drop your PDF file or click to select"
              />
            ) : (
              <div className="space-y-6">
                <FileCard file={files[0]} onRemove={() => removeFile(0)} />

                {isProcessing && <ProgressBar progress={progress} statusText="Analyzing document text & generating summary..." />}

                <button
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className="w-full py-4 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-glow flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 fill-white" />
                  <span>Generate AI Summary</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
