import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';
import UploadArea from '../common/UploadArea';
import FileCard from '../common/FileCard';
import ProgressBar from '../common/ProgressBar';
import PdfPageVisualizer from '../common/PdfPageVisualizer';
import useUpload from '../../hooks/useUpload';
import useProcessing from '../../hooks/useProcessing';
import useDownload from '../../hooks/useDownload';
import api from '../../services/api';
import {
  Lock, Unlock, EyeOff, Wrench, GitCompare, ScanText, FileEdit,
  ArrowLeft, Play, Sliders, KeyRound, Shield, Download, Eye, CheckCircle2, FileCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

const SECURITY_CONFIGS = {
  'protect': {
    name: 'Protect PDF',
    description: 'Secure PDF documents with passwords and restricted permissions.',
    icon: Lock,
    endpoint: '/pdf/protect'
  },
  'unlock': {
    name: 'Unlock PDF',
    description: 'Remove password restrictions from protected PDF files.',
    icon: Unlock,
    endpoint: '/pdf/unlock'
  },
  'redact': {
    name: 'Redact PDF',
    description: 'Permanently sanitize and purge sensitive text or content regions.',
    icon: EyeOff,
    endpoint: '/pdf/redact'
  },
  'repair': {
    name: 'Repair PDF',
    description: 'Recover readable content from damaged or corrupted PDF files.',
    icon: Wrench,
    endpoint: '/pdf/repair'
  },
  'compare': {
    name: 'Compare PDF',
    description: 'Compare two PDF documents side-by-side and highlight structural differences.',
    icon: GitCompare,
    endpoint: '/pdf/compare'
  },
  'ocr': {
    name: 'OCR PDF',
    description: 'Perform optical character recognition to make scanned PDFs searchable.',
    icon: ScanText,
    endpoint: '/pdf/ocr'
  },
  'metadata-editor': {
    name: 'Metadata Editor',
    description: 'Edit title, author, subject, keywords, and creator metadata fields.',
    icon: FileEdit,
    endpoint: '/pdf/metadata-editor'
  }
};

export default function PdfSecurityToolView() {
  const { slug } = useParams();
  const config = SECURITY_CONFIGS[slug] || SECURITY_CONFIGS['protect'];
  const IconComponent = config.icon;

  const primaryUpload = useUpload(100, 1);
  const secondaryUpload = useUpload(100, 1);

  const { isProcessing, progress, startProcessing, updateProgress, finishProcessing, handleError } = useProcessing();
  const { downloadBlob, viewBlob } = useDownload();
  const [convertedResult, setConvertedResult] = useState(null);

  // Tool Specific Options State
  const [userPassword, setUserPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(true);

  const [unlockPassword, setUnlockPassword] = useState('');
  const [redactKeyword, setRedactKeyword] = useState('');
  const [ocrLang, setOcrLang] = useState('eng');

  const [metaTitle, setMetaTitle] = useState('');
  const [metaAuthor, setMetaAuthor] = useState('');
  const [metaSubject, setMetaSubject] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [metaCreator, setMetaCreator] = useState('Roriri Workspace');

  const handleSubmit = async () => {
    if (slug === 'compare') {
      if (!primaryUpload.hasFiles || !secondaryUpload.hasFiles) {
        toast.error('Please select both PDF files to perform comparison.');
        return;
      }
    } else if (!primaryUpload.hasFiles) {
      toast.error('Please select a PDF document first.');
      return;
    }

    startProcessing();

    try {
      const formData = new FormData();

      if (slug === 'compare') {
        formData.append('file1', primaryUpload.files[0]);
        formData.append('file2', secondaryUpload.files[0]);
      } else {
        formData.append('file', primaryUpload.files[0]);
      }

      if (slug === 'protect') {
        if (!userPassword) {
          toast.error('User password is required.');
          finishProcessing();
          return;
        }
        formData.append('userPassword', userPassword);
        formData.append('ownerPassword', ownerPassword || userPassword);
        formData.append('allowPrinting', allowPrinting);
        formData.append('allowCopying', allowCopying);
      } else if (slug === 'unlock') {
        if (!unlockPassword) {
          toast.error('Please enter the current password.');
          finishProcessing();
          return;
        }
        formData.append('password', unlockPassword);
      } else if (slug === 'redact') {
        if (!redactKeyword) {
          toast.error('Please enter a keyword to redact.');
          finishProcessing();
          return;
        }
        formData.append('keyword', redactKeyword);
      } else if (slug === 'ocr') {
        formData.append('language', ocrLang);
      } else if (slug === 'metadata-editor') {
        if (metaTitle) formData.append('title', metaTitle);
        if (metaAuthor) formData.append('author', metaAuthor);
        if (metaSubject) formData.append('subject', metaSubject);
        if (metaKeywords) formData.append('keywords', metaKeywords);
        if (metaCreator) formData.append('creator', metaCreator);
      }

      updateProgress(30);

      const response = await api.post(config.endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
        onUploadProgress: (evt) => {
          const percent = Math.round((evt.loaded * 60) / evt.total) + 20;
          updateProgress(percent);
        }
      });

      updateProgress(90);
      finishProcessing();

      const defaultFilename = `${slug}_output.pdf`;
      setConvertedResult({
        response,
        filename: defaultFilename
      });
      toast.success(`${config.name} execution completed successfully!`);
    } catch (err) {
      handleError(err, config.name);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10">
        <Link to="/" className="inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All PDF Tools</span>
        </Link>

        {/* Header */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center shadow-glow">
              <IconComponent className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{config.name}</h1>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">{config.description}</p>
            </div>
          </div>
        </div>

        {/* Completion Screen vs Processing/Upload Screen */}
        {convertedResult ? (
          <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-slate-800 text-center space-y-6 animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-glow">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Operation Complete!</h2>
              <p className="text-xs text-slate-400 mt-1">
                Your document has been statelessly processed by <span className="font-mono text-brand-300 font-bold">{config.name}</span>.
              </p>
            </div>

            <div className="inline-flex items-center space-x-3 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-xs text-slate-300">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-mono font-bold text-white">{convertedResult.filename}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={() => downloadBlob(convertedResult.response, convertedResult.filename)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-glow transition-all flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </button>

              <button
                onClick={() => viewBlob(convertedResult.response, convertedResult.filename)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white transition-all flex items-center justify-center space-x-2"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>View / Preview File</span>
              </button>

              <button
                onClick={() => {
                  setConvertedResult(null);
                  primaryUpload.clearFiles();
                  secondaryUpload.clearFiles();
                }}
                className="w-full sm:w-auto px-4 py-3.5 rounded-xl font-semibold text-xs text-slate-400 hover:text-white transition-colors"
              >
                Process Another File
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
          {slug === 'compare' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Original PDF Document (Doc 1)</h4>
                {!primaryUpload.hasFiles ? (
                  <UploadArea onFilesSelected={primaryUpload.addFiles} title="Select First PDF" />
                ) : (
                  <FileCard file={primaryUpload.files[0]} onRemove={primaryUpload.clearFiles} index={0} />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Modified PDF Document (Doc 2)</h4>
                {!secondaryUpload.hasFiles ? (
                  <UploadArea onFilesSelected={secondaryUpload.addFiles} title="Select Second PDF" />
                ) : (
                  <FileCard file={secondaryUpload.files[0]} onRemove={secondaryUpload.clearFiles} index={0} />
                )}
              </div>
            </div>
          ) : !primaryUpload.hasFiles ? (
            <UploadArea
              onFilesSelected={primaryUpload.addFiles}
              title={`Upload document for ${config.name}`}
              subtitle="Select PDF file"
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Visual Page Workspace Left Panel */}
              <div className="lg:col-span-2 space-y-4">
                <PdfPageVisualizer files={primaryUpload.files} mode="view" onAddFiles={(newFiles) => primaryUpload.addFiles(newFiles)} onRemoveFile={(idx) => primaryUpload.removeFile(idx)} />
              </div>

              {/* Options & Execute Action Panel */}
              <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-5 h-fit">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                  <Sliders className="w-4 h-4 text-brand-400" />
                  <h3 className="text-sm font-bold text-white">Tool Parameters</h3>
                </div>

                {slug === 'protect' && (
                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">User Password (Required)</label>
                      <input
                        type="password"
                        placeholder="Enter encryption password"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Owner Password (Optional)</label>
                      <input
                        type="password"
                        placeholder="Leave blank to match User pwd"
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white placeholder:text-slate-600"
                      />
                    </div>
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowPrinting}
                          onChange={(e) => setAllowPrinting(e.target.checked)}
                          className="accent-brand-500"
                        />
                        <span className="text-slate-300">Allow High-Resolution Printing</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowCopying}
                          onChange={(e) => setAllowCopying(e.target.checked)}
                          className="accent-brand-500"
                        />
                        <span className="text-slate-300">Allow Text Content Copying</span>
                      </label>
                    </div>
                  </div>
                )}

                {slug === 'unlock' && (
                  <div className="space-y-3 text-xs">
                    <label className="block text-slate-400 font-semibold mb-1">Current Password</label>
                    <input
                      type="password"
                      placeholder="Enter current password to remove protection"
                      value={unlockPassword}
                      onChange={(e) => setUnlockPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                    />
                  </div>
                )}

                {slug === 'redact' && (
                  <div className="space-y-3 text-xs">
                    <label className="block text-slate-400 font-semibold mb-1">Text Keyword to Purge</label>
                    <input
                      type="text"
                      placeholder="e.g. CONFIDENTIAL, SSN"
                      value={redactKeyword}
                      onChange={(e) => setRedactKeyword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                    />
                    <p className="text-[11px] text-slate-500">
                      Matching occurrences will be permanently purged from text streams and covered with black boxes.
                    </p>
                  </div>
                )}

                {slug === 'metadata-editor' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-1">Title</span>
                      <input
                        type="text"
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Author</span>
                      <input
                        type="text"
                        value={metaAuthor}
                        onChange={(e) => setMetaAuthor(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Subject</span>
                      <input
                        type="text"
                        value={metaSubject}
                        onChange={(e) => setMetaSubject(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Keywords</span>
                      <input
                        type="text"
                        value={metaKeywords}
                        onChange={(e) => setMetaKeywords(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>
                )}

                {slug === 'ocr' && (
                  <div className="space-y-3 text-xs">
                    <label className="block text-slate-400 font-semibold mb-1">OCR Language Pack</label>
                    <select
                      value={ocrLang}
                      onChange={(e) => setOcrLang(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                    >
                      <option value="eng">English (eng)</option>
                      <option value="spa">Spanish (spa)</option>
                      <option value="deu">German (deu)</option>
                      <option value="fra">French (fra)</option>
                      <option value="hin">Hindi (hin)</option>
                      <option value="chi_sim">Chinese Simplified (chi_sim)</option>
                    </select>
                    <p className="text-[11px] text-slate-500">
                      Select the primary language of your scanned PDF to generate a high-accuracy searchable text layer.
                    </p>
                  </div>
                )}

                {isProcessing && <ProgressBar progress={progress} statusText={`Processing ${config.name}...`} />}

                <button
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-glow flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Execute {config.name}</span>
                </button>
              </div>
            </div>
          )}

          {slug === 'compare' && (primaryUpload.hasFiles && secondaryUpload.hasFiles) && (
            <div className="max-w-md mx-auto pt-6">
              {isProcessing && <ProgressBar progress={progress} statusText="Comparing documents..." />}
              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-glow flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Generate PDF Comparison Report</span>
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
