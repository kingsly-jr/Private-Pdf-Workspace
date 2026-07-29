import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';
import UploadArea from '../common/UploadArea';
import FileCard from '../common/FileCard';
import ProgressBar from '../common/ProgressBar';
import useUpload from '../../hooks/useUpload';
import useProcessing from '../../hooks/useProcessing';
import useDownload from '../../hooks/useDownload';
import api from '../../services/api';
import CameraScanModal from '../common/CameraScanModal';
import {
  FileText, FileOutput, FileSpreadsheet, Presentation, Image as ImageIcon,
  FileCode, Play, ArrowLeft, Sliders, ArrowUp, ArrowDown, Download, Eye, CheckCircle2, FileCheck, Camera, Globe, Languages, FileEdit
} from 'lucide-react';
import toast from 'react-hot-toast';

const CONVERSION_CONFIGS = {
  'pdf-to-word': {
    name: 'PDF to Word',
    description: 'Convert PDF documents into editable Microsoft Word (.docx) files.',
    icon: FileText,
    accept: { 'application/pdf': ['.pdf'] },
    endpoint: '/pdf/pdf-to-word',
    outputExt: 'docx',
    multiple: false,
  },
  'word-to-pdf': {
    name: 'Word to PDF',
    description: 'Convert Microsoft Word (.docx) documents into clean PDF files.',
    icon: FileOutput,
    accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    endpoint: '/pdf/word-to-pdf',
    outputExt: 'pdf',
    multiple: false,
  },
  'pdf-to-excel': {
    name: 'PDF to Excel',
    description: 'Extract tabular data from PDF into Microsoft Excel (.xlsx) spreadsheets.',
    icon: FileSpreadsheet,
    accept: { 'application/pdf': ['.pdf'] },
    endpoint: '/pdf/pdf-to-excel',
    outputExt: 'xlsx',
    multiple: false,
  },
  'excel-to-pdf': {
    name: 'Excel to PDF',
    description: 'Transform Excel (.xlsx) sheets into standard PDF documents.',
    icon: FileSpreadsheet,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    endpoint: '/pdf/excel-to-pdf',
    outputExt: 'pdf',
    multiple: false,
  },
  'pdf-to-powerpoint': {
    name: 'PDF to PowerPoint',
    description: 'Convert PDF pages into editable PowerPoint (.pptx) presentations.',
    icon: Presentation,
    accept: { 'application/pdf': ['.pdf'] },
    endpoint: '/pdf/pdf-to-powerpoint',
    outputExt: 'pptx',
    multiple: false,
  },
  'powerpoint-to-pdf': {
    name: 'PowerPoint to PDF',
    description: 'Turn PowerPoint (.pptx) slide decks into PDF files.',
    icon: Presentation,
    accept: { 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'] },
    endpoint: '/pdf/powerpoint-to-pdf',
    outputExt: 'pdf',
    multiple: false,
  },
  'pdf-to-jpg': {
    name: 'PDF to JPG',
    description: 'Render each PDF page as a high-quality JPG image inside a ZIP archive.',
    icon: ImageIcon,
    accept: { 'application/pdf': ['.pdf'] },
    endpoint: '/pdf/pdf-to-jpg',
    outputExt: 'zip',
    multiple: false,
  },
  'jpg-to-pdf': {
    name: 'JPG to PDF',
    description: 'Combine multiple JPG/PNG images into a single PDF document.',
    icon: ImageIcon,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    endpoint: '/pdf/jpg-to-pdf',
    outputExt: 'pdf',
    multiple: true,
  },
  'extract-text': {
    name: 'Extract Text',
    description: 'Extract raw text from PDF documents into plain text (.txt) or Word (.docx).',
    icon: FileCode,
    accept: { 'application/pdf': ['.pdf'] },
    endpoint: '/pdf/extract-text',
    outputExt: 'txt',
    multiple: false,
  },
  'pdf-to-markdown': {
    name: 'PDF to Markdown',
    description: 'Extract PDF document text while preserving headings, lists, paragraphs, and structure as Markdown (.md).',
    icon: FileCode,
    accept: { 'application/pdf': ['.pdf'] },
    endpoint: '/pdf/pdf-to-markdown',
    outputExt: 'md',
    multiple: false,
  },
  'scan-to-pdf': {
    name: 'Scan to PDF',
    description: 'Capture photos using webcam or mobile camera, rotate/crop pages, and combine into a clean PDF document.',
    icon: Camera,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    endpoint: '/pdf/scan-to-pdf',
    outputExt: 'pdf',
    multiple: true,
  },
  'html-to-pdf': {
    name: 'HTML to PDF',
    description: 'Convert HTML files or website URLs into clean PDF documents.',
    icon: Globe,
    accept: { 'text/html': ['.html', '.htm'] },
    endpoint: '/pdf/html-to-pdf',
    outputExt: 'pdf',
    multiple: false,
  },
  'pdf-to-pdfa': {
    name: 'PDF to PDF/A',
    description: 'Convert PDF documents into ISO-standard PDF/A-1b format for long-term digital archiving.',
    icon: FileCheck,
    accept: { 'application/pdf': ['.pdf'] },
    endpoint: '/pdf/pdf-to-pdfa',
    outputExt: 'pdf',
    multiple: false,
  },
  'translate': {
    name: 'Translate PDF',
    description: 'Extract PDF text and translate document into your choice of target languages.',
    icon: Languages,
    accept: { 'application/pdf': ['.pdf'] },
    endpoint: '/pdf/translate',
    outputExt: 'pdf',
    multiple: false,
  },
  'pdf-forms': {
    name: 'PDF Forms',
    description: 'Add fillable text fields and interactive checkboxes to PDF documents.',
    icon: FileEdit,
    accept: { 'application/pdf': ['.pdf'] },
    endpoint: '/pdf/create-form',
    outputExt: 'pdf',
    multiple: false,
  }
};

export default function PdfConversionToolView() {
  const { slug } = useParams();
  const config = CONVERSION_CONFIGS[slug] || CONVERSION_CONFIGS['pdf-to-word'];
  const IconComponent = config.icon;

  const { files, setFiles, addFiles, removeFile, clearFiles, hasFiles } = useUpload(100, config.multiple ? 30 : 1);
  const { isProcessing, progress, startProcessing, updateProgress, finishProcessing, handleError } = useProcessing();
  const { downloadBlob, viewBlob } = useDownload();

  const [convertedResult, setConvertedResult] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [webUrl, setWebUrl] = useState('');

  // Tool Specific Options State
  const [jpgDpi, setJpgDpi] = useState(200);
  const [textFormat, setTextFormat] = useState('txt');
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [targetLang, setTargetLang] = useState('es');

  // File Reordering for JPG to PDF
  const moveFile = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= files.length) return;
    const updated = [...files];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setFiles(updated);
  };

  const handleSubmit = async () => {
    if (!hasFiles && slug === 'html-to-pdf' && !webUrl.trim()) {
      toast.error('Please upload an HTML file or enter a website URL.');
      return;
    } else if (!hasFiles && slug !== 'html-to-pdf') {
      toast.error('Please select file(s) before conversion.');
      return;
    }

    startProcessing();

    try {
      const formData = new FormData();

      if (slug === 'html-to-pdf' && webUrl.trim() && !hasFiles) {
        formData.append('url', webUrl.trim());
      } else if (hasFiles) {
        if (slug === 'jpg-to-pdf' || slug === 'scan-to-pdf') {
          files.forEach(f => formData.append('files', f));
          formData.append('pageSize', pageSize);
          formData.append('orientation', orientation);
        } else {
          formData.append('file', files[0]);
        }
      }

      if (slug === 'pdf-to-jpg') {
        formData.append('dpi', jpgDpi);
      } else if (slug === 'extract-text') {
        formData.append('format', textFormat);
      } else if (slug === 'translate') {
        formData.append('targetLang', targetLang);
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

      const outputExtension = slug === 'extract-text' ? textFormat : config.outputExt;
      const defaultFilename = `${slug}_converted.${outputExtension}`;

      setConvertedResult({
        response,
        filename: defaultFilename
      });

      toast.success(`${config.name} conversion completed successfully!`);
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
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Conversion Complete!</h2>
              <p className="text-xs text-slate-400 mt-1">
                Your file has been statelessly converted into <span className="font-mono text-brand-300 font-bold">.{convertedResult.filename.split('.').pop()}</span> format.
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
                  clearFiles();
                }}
                className="w-full sm:w-auto px-4 py-3.5 rounded-xl font-semibold text-xs text-slate-400 hover:text-white transition-colors"
              >
                Convert Another File
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {!hasFiles ? (
              <div className="space-y-4">
                <UploadArea
                  onFilesSelected={addFiles}
                  accept={config.accept}
                  multiple={config.multiple}
                  title={`Upload document for ${config.name}`}
                  subtitle={config.multiple ? "Select images or drag them here" : "Select input file"}
                />

                {slug === 'scan-to-pdf' && (
                  <div className="text-center">
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-slate-800"></div>
                      <span className="flex-shrink mx-4 text-xs font-bold text-slate-500 uppercase tracking-wider">OR USE CAMERA</span>
                      <div className="flex-grow border-t border-slate-800"></div>
                    </div>

                    <button
                      onClick={() => setIsCameraOpen(true)}
                      className="mt-2 px-6 py-3.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-glow flex items-center justify-center space-x-2 mx-auto"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Open Camera Scanner</span>
                    </button>
                  </div>
                )}

                {slug === 'html-to-pdf' && (
                  <div className="space-y-3 pt-2">
                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-slate-800"></div>
                      <span className="flex-shrink mx-4 text-xs font-bold text-slate-500 uppercase tracking-wider">OR ENTER WEBSITE URL</span>
                      <div className="flex-grow border-t border-slate-800"></div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          placeholder="https://example.com"
                          value={webUrl}
                          onChange={(e) => setWebUrl(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-brand-500 rounded-xl pl-9 pr-3 py-3 text-xs text-white placeholder:text-slate-600 font-mono transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* File List Panel */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Selected Input Files ({files.length})
                    </h3>
                    <button
                      onClick={clearFiles}
                      className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-3">
                    {files.map((file, idx) => (
                      <div key={idx} className="relative group">
                        <FileCard file={file} onRemove={() => removeFile(idx)} index={idx} />
                        {slug === 'jpg-to-pdf' && files.length > 1 && (
                          <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                            <button
                              onClick={() => moveFile(idx, idx - 1)}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              title="Move up"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveFile(idx, idx + 1)}
                              disabled={idx === files.length - 1}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              title="Move down"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Options & Convert Action Panel */}
                <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6 h-fit">
                  <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                    <Sliders className="w-4 h-4 text-brand-400" />
                    <h3 className="text-sm font-bold text-white">Conversion Settings</h3>
                  </div>

                  {slug === 'pdf-to-jpg' && (
                    <div className="space-y-3 text-xs">
                      <label className="block text-slate-400 font-semibold uppercase tracking-wider">Image Quality (DPI)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[150, 200, 300].map(dpi => (
                          <button
                            key={dpi}
                            type="button"
                            onClick={() => setJpgDpi(dpi)}
                            className={`py-2 rounded-lg font-bold border transition-all ${
                              jpgDpi === dpi
                                ? 'bg-brand-600 text-white border-brand-500 shadow-glow'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}
                          >
                            {dpi} DPI
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {slug === 'jpg-to-pdf' && (
                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="block text-slate-400 font-semibold uppercase tracking-wider mb-2">Page Size</label>
                        <select
                          value={pageSize}
                          onChange={(e) => setPageSize(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                        >
                          <option value="A4">A4 (Standard)</option>
                          <option value="LETTER">US Letter</option>
                          <option value="LEGAL">US Legal</option>
                          <option value="A3">A3</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold uppercase tracking-wider mb-2">Orientation</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['portrait', 'landscape'].map(o => (
                            <button
                              key={o}
                              type="button"
                              onClick={() => setOrientation(o)}
                              className={`py-2 rounded-lg font-bold capitalize border transition-all ${
                                orientation === o
                                  ? 'bg-brand-600 text-white border-brand-500 shadow-glow'
                                  : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}
                            >
                              {o}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {slug === 'extract-text' && (
                    <div className="space-y-3 text-xs">
                      <label className="block text-slate-400 font-semibold uppercase tracking-wider">Output Format</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['txt', 'docx'].map(fmt => (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => setTextFormat(fmt)}
                            className={`py-2 rounded-lg font-bold uppercase border transition-all ${
                              textFormat === fmt
                                ? 'bg-brand-600 text-white border-brand-500 shadow-glow'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}
                          >
                            .{fmt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {slug === 'translate' && (
                    <div className="space-y-3 text-xs">
                      <label className="block text-slate-400 font-semibold uppercase tracking-wider">Target Language</label>
                      <select
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs text-white"
                      >
                        <option value="es">Spanish (Español)</option>
                        <option value="fr">French (Français)</option>
                        <option value="de">German (Deutsch)</option>
                        <option value="it">Italian (Italiano)</option>
                        <option value="pt">Portuguese (Português)</option>
                        <option value="zh">Chinese (中文)</option>
                        <option value="ja">Japanese (日本語)</option>
                        <option value="hi">Hindi (हिन्दी)</option>
                        <option value="ar">Arabic (العربية)</option>
                        <option value="ru">Russian (Русский)</option>
                      </select>
                    </div>
                  )}

                  {slug === 'pdf-to-pdfa' && (
                    <div className="space-y-3 text-xs">
                      <label className="block text-slate-400 font-semibold uppercase tracking-wider">PDF/A ISO Conformance Variant</label>
                      <select
                        defaultValue="PDF/A-1b"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs text-white"
                      >
                        <option value="PDF/A-1b">PDF/A-1b (Level B Basic Conformance)</option>
                        <option value="PDF/A-2b">PDF/A-2b (ISO 19005-2 Long-Term Archiving)</option>
                        <option value="PDF/A-3b">PDF/A-3b (Embedded Binary Attachments)</option>
                      </select>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Convert PDF to ISO 19005 compliant archival format for long-term digital preservation.
                      </p>
                    </div>
                  )}

                  {isProcessing && <ProgressBar progress={progress} statusText={`Converting document...`} />}

                  <button
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-glow flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Start {config.name}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <CameraScanModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onComplete={(scannedFiles) => addFiles(scannedFiles)}
      />

      <Footer />
    </div>
  );
}
