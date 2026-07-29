import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';
import UploadArea from '../common/UploadArea';
import FileCard from '../common/FileCard';
import ProgressBar from '../common/ProgressBar';
import PdfPageVisualizer from '../common/PdfPageVisualizer';
import PdfCropCanvas from '../common/PdfCropCanvas';
import useUpload from '../../hooks/useUpload';
import useProcessing from '../../hooks/useProcessing';
import useDownload from '../../hooks/useDownload';
import api from '../../services/api';
import {
  Layers, Split, RotateCw, Trash2, ArrowRightLeft, Crop, Maximize2, Image,
  ArrowLeft, ArrowUp, ArrowDown, Play, CheckCircle2, Sliders, Download, Eye, FileCheck, Info, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const TOOL_CONFIGS = {
  'merge': {
    name: 'Merge PDF',
    description: 'Combine multiple PDF documents into a single organized file.',
    icon: Layers,
    multiple: true,
    endpoint: '/pdf/merge'
  },
  'split': {
    name: 'Split PDF',
    description: 'Extract specific pages, split into individual page PDFs, or split by ranges.',
    icon: Split,
    multiple: false,
    endpoint: '/pdf/split'
  },
  'rotate': {
    name: 'Rotate PDF',
    description: 'Rotate all or selected pages by 90°, 180°, or 270°.',
    icon: RotateCw,
    multiple: false,
    endpoint: '/pdf/rotate'
  },
  'delete-pages': {
    name: 'Remove pages',
    description: 'Remove unnecessary pages from your PDF document.',
    icon: Trash2,
    multiple: false,
    endpoint: '/pdf/delete-pages'
  },
  'organize': {
    name: 'Organize PDF',
    description: 'Reorder, rotate, or delete pages in your document.',
    icon: ArrowRightLeft,
    multiple: false,
    endpoint: '/pdf/organize'
  },
  'crop': {
    name: 'Crop PDF',
    description: 'Trim margins or crop specific areas of your PDF pages.',
    icon: Crop,
    multiple: false,
    endpoint: '/pdf/crop'
  },
  'resize': {
    name: 'Resize PDF',
    description: 'Adjust page dimensions (A4, Letter, Legal, A3) and orientation.',
    icon: Maximize2,
    multiple: false,
    endpoint: '/pdf/resize'
  },
  'extract-images': {
    name: 'Extract Images',
    description: 'Pull all embedded high-resolution images out of your PDF as a ZIP archive.',
    icon: Image,
    multiple: false,
    endpoint: '/pdf/extract-images'
  }
};

// Converts array of numbers e.g. [1, 2, 3, 5, 7, 8] to string "1-3, 5, 7-8"
function formatPageNumbers(pages) {
  if (!pages || pages.length === 0) return '';
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let end = start;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = start;
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(', ');
}

// Parses string e.g. "1, 3-5, 8" into array of page numbers [1, 3, 4, 5, 8]
function parsePageString(str, totalPages) {
  if (!str) return [];
  const pages = new Set();
  const parts = str.split(',');

  for (let part of parts) {
    part = part.trim();
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(totalPages, Math.max(start, end));
        for (let i = from; i <= to; i++) {
          pages.add(i);
        }
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        pages.add(pageNum);
      }
    }
  }

  return [...pages].sort((a, b) => a - b);
}

export default function PdfPageToolView() {
  const { slug } = useParams();
  const config = TOOL_CONFIGS[slug] || TOOL_CONFIGS['merge'];
  const IconComponent = config.icon;

  const { files, setFiles, addFiles, removeFile, clearFiles, hasFiles } = useUpload(100, config.multiple ? 20 : 1);
  const { isProcessing, progress, startProcessing, updateProgress, finishProcessing, handleError } = useProcessing();
  const { downloadBlob, viewBlob } = useDownload();
  const [convertedResult, setConvertedResult] = useState(null);

  // Delete Pages state & visualizer
  const [totalPages, setTotalPages] = useState(0);
  const [selectedDeletePages, setSelectedDeletePages] = useState([]);
  const [deletePageNums, setDeletePageNums] = useState('');

  // Tool Specific Options State
  const [splitMode, setSplitMode] = useState('all');
  const [splitRanges, setSplitRanges] = useState('1-3');
  const [splitInterval, setSplitInterval] = useState(2);

  const [rotateAngle, setRotateAngle] = useState(90);
  const [rotatePages, setRotatePages] = useState('');

  const [cropTop, setCropTop] = useState(36);
  const [cropBottom, setCropBottom] = useState(36);
  const [cropLeft, setCropLeft] = useState(36);
  const [cropRight, setCropRight] = useState(36);

  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');

  // Handle selection changes from visualizer grid clicks
  const handleVisualizerSelection = (pagesArray) => {
    setSelectedDeletePages(pagesArray);
    setDeletePageNums(formatPageNumbers(pagesArray));
  };

  // Handle user typing in "Pages to remove" text input box
  const handleDeleteInputTextChange = (text) => {
    setDeletePageNums(text);
    const parsed = parsePageString(text, totalPages || 100);
    setSelectedDeletePages(parsed);
  };

  // File Reordering for Merge
  const moveFile = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= files.length) return;
    const updated = [...files];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setFiles(updated);
  };

  const handleSubmit = async () => {
    if (!hasFiles) {
      toast.error('Please select file(s) before processing.');
      return;
    }

    if (slug === 'delete-pages' && !deletePageNums.trim()) {
      toast.error('Please select or specify page numbers to remove.');
      return;
    }

    startProcessing();

    try {
      const formData = new FormData();

      if (slug === 'merge') {
        files.forEach(f => formData.append('files', f));
      } else {
        formData.append('file', files[0]);
      }

      // Add specific options
      if (slug === 'split') {
        formData.append('splitMode', splitMode);
        if (splitMode === 'range') formData.append('ranges', splitRanges);
        if (splitMode === 'interval') formData.append('interval', splitInterval);
      } else if (slug === 'rotate') {
        formData.append('angle', rotateAngle);
        if (rotatePages) formData.append('pages', rotatePages);
      } else if (slug === 'delete-pages') {
        formData.append('pages', deletePageNums);
      } else if (slug === 'crop') {
        formData.append('top', cropTop);
        formData.append('bottom', cropBottom);
        formData.append('left', cropLeft);
        formData.append('right', cropRight);
      } else if (slug === 'resize') {
        formData.append('pageSize', pageSize);
        formData.append('orientation', orientation);
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

      const defaultFilename = (slug === 'split' || slug === 'extract-images')
        ? `${slug}_results.zip`
        : `${slug}_processed.pdf`;

      setConvertedResult({
        response,
        filename: defaultFilename
      });

      toast.success(`${config.name} completed successfully!`);
    } catch (err) {
      handleError(err, config.name);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10">
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
                  clearFiles();
                  setSelectedDeletePages([]);
                  setDeletePageNums('');
                }}
                className="w-full sm:w-auto px-4 py-3.5 rounded-xl font-semibold text-xs text-slate-400 hover:text-white transition-colors"
              >
                Process Another File
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
          {!hasFiles ? (
            <UploadArea
              onFilesSelected={addFiles}
              multiple={config.multiple}
              title={`Upload for ${config.name}`}
              subtitle={config.multiple ? "Select multiple PDFs or drag them here" : "Select PDF document"}
            />
          ) : slug === 'crop' ? (
            <PdfCropCanvas file={files[0]} onBack={clearFiles} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Main Workspace Panel */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {slug === 'delete-pages' ? 'Select Pages to Delete' : `Selected Files (${files.length})`}
                  </h3>
                  <button
                    onClick={() => {
                      clearFiles();
                      setSelectedDeletePages([]);
                      setDeletePageNums('');
                    }}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    Change File
                  </button>
                </div>

                {/* Show Visualizer Grid for Delete Pages */}
                {slug === 'delete-pages' ? (
                  <PdfPageVisualizer
                    file={files[0]}
                    selectedPages={selectedDeletePages}
                    onSelectionChange={handleVisualizerSelection}
                    onTotalPagesChange={setTotalPages}
                  />
                ) : (
                  <div className="space-y-3">
                    {files.map((file, idx) => (
                      <div key={idx} className="relative group">
                        <FileCard file={file} onRemove={() => removeFile(idx)} index={idx} />
                        {slug === 'merge' && files.length > 1 && (
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
                )}
              </div>

              {/* Right Sidebar Control Panel */}
              <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6 h-fit">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                  <Sliders className="w-4 h-4 text-brand-400" />
                  <h3 className="text-sm font-bold text-white">
                    {slug === 'delete-pages' ? 'Remove pages' : 'Tool Options'}
                  </h3>
                </div>

                {/* Delete Pages Control Panel */}
                {slug === 'delete-pages' ? (
                  <div className="space-y-5">
                    {/* Information Alert Pill */}
                    <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-sky-300">
                      <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sky-200">Click on pages to remove</p>
                        <p className="text-[11px] text-sky-400/80 mt-0.5 leading-relaxed">
                          Click any page thumbnail on the left to toggle removal, or use 'Shift' key to set ranges.
                        </p>
                      </div>
                    </div>

                    {/* Total Pages Indicator */}
                    <div className="text-xs text-slate-300 font-medium">
                      Total pages: <span className="font-extrabold text-white text-sm ml-1">{totalPages || '...'}</span>
                    </div>

                    {/* Pages to Remove Input Field */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-white">Pages to remove:</label>
                      <input
                        type="text"
                        placeholder="example: 1, 5-8"
                        value={deletePageNums}
                        onChange={(e) => handleDeleteInputTextChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl p-3 text-white text-xs font-mono transition-all"
                      />
                      <p className="text-[11px] text-slate-500">
                        {selectedDeletePages.length === 0 ? (
                          'No pages selected yet.'
                        ) : (
                          <span className="text-rose-400 font-medium">
                            {selectedDeletePages.length} {selectedDeletePages.length === 1 ? 'page' : 'pages'} will be purged.
                          </span>
                        )}
                      </p>
                    </div>

                    {isProcessing && <ProgressBar progress={progress} statusText="Removing specified pages..." />}

                    {/* Prominent Action Button */}
                    <button
                      onClick={handleSubmit}
                      disabled={isProcessing || !deletePageNums.trim()}
                      className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-sm rounded-xl transition-all shadow-glow-rose flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <span>Remove pages</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    {slug === 'split' && (
                      <div className="space-y-4 text-xs">
                        <label className="block text-slate-400 font-semibold uppercase tracking-wider">Split Mode</label>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-white cursor-pointer">
                            <input
                              type="radio"
                              name="splitMode"
                              value="all"
                              checked={splitMode === 'all'}
                              onChange={() => setSplitMode('all')}
                              className="accent-brand-500"
                            />
                            <span>Extract all pages into separate PDFs (ZIP)</span>
                          </label>
                          <label className="flex items-center space-x-2 text-white cursor-pointer">
                            <input
                              type="radio"
                              name="splitMode"
                              value="range"
                              checked={splitMode === 'range'}
                              onChange={() => setSplitMode('range')}
                              className="accent-brand-500"
                            />
                            <span>Split by custom page ranges</span>
                          </label>
                          <label className="flex items-center space-x-2 text-white cursor-pointer">
                            <input
                              type="radio"
                              name="splitMode"
                              value="interval"
                              checked={splitMode === 'interval'}
                              onChange={() => setSplitMode('interval')}
                              className="accent-brand-500"
                            />
                            <span>Split by fixed interval</span>
                          </label>
                        </div>

                        {splitMode === 'range' && (
                          <div>
                            <label className="block text-slate-400 mb-1">Page Ranges (e.g. 1-3, 5-8)</label>
                            <input
                              type="text"
                              value={splitRanges}
                              onChange={(e) => setSplitRanges(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                            />
                          </div>
                        )}

                        {splitMode === 'interval' && (
                          <div>
                            <label className="block text-slate-400 mb-1">Interval (Pages per file)</label>
                            <input
                              type="number"
                              min={1}
                              value={splitInterval}
                              onChange={(e) => setSplitInterval(parseInt(e.target.value) || 1)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {slug === 'rotate' && (
                      <div className="space-y-4 text-xs">
                        <label className="block text-slate-400 font-semibold uppercase tracking-wider">Rotation Angle</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[90, 180, 270].map(deg => (
                            <button
                              key={deg}
                              type="button"
                              onClick={() => setRotateAngle(deg)}
                              className={`py-2 rounded-lg font-bold border transition-all ${
                                rotateAngle === deg
                                  ? 'bg-brand-600 text-white border-brand-500 shadow-glow'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                              }`}
                            >
                              {deg}°
                            </button>
                          ))}
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Target Pages (Leave empty for all)</label>
                          <input
                            type="text"
                            placeholder="e.g. 1, 3-5"
                            value={rotatePages}
                            onChange={(e) => setRotatePages(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white placeholder:text-slate-600"
                          />
                        </div>
                      </div>
                    )}

                    {slug === 'crop' && (
                      <div className="space-y-3 text-xs">
                        <label className="block text-slate-400 font-semibold uppercase tracking-wider">Crop Margins (Points)</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-slate-400 block mb-1">Top</span>
                            <input
                              type="number"
                              value={cropTop}
                              onChange={(e) => setCropTop(parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                            />
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-1">Bottom</span>
                            <input
                              type="number"
                              value={cropBottom}
                              onChange={(e) => setCropBottom(parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                            />
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-1">Left</span>
                            <input
                              type="number"
                              value={cropLeft}
                              onChange={(e) => setCropLeft(parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                            />
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-1">Right</span>
                            <input
                              type="number"
                              value={cropRight}
                              onChange={(e) => setCropRight(parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {slug === 'resize' && (
                      <div className="space-y-4 text-xs">
                        <div>
                          <label className="block text-slate-400 font-semibold uppercase tracking-wider mb-2">Paper Size</label>
                          <select
                            value={pageSize}
                            onChange={(e) => setPageSize(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                          >
                            <option value="A4">A4 (210 x 297 mm)</option>
                            <option value="LETTER">US Letter (8.5 x 11 in)</option>
                            <option value="LEGAL">US Legal (8.5 x 14 in)</option>
                            <option value="A3">A3 (297 x 420 mm)</option>
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

                    {isProcessing && <ProgressBar progress={progress} statusText={`Executing ${config.name}...`} />}

                    <button
                      onClick={handleSubmit}
                      disabled={isProcessing}
                      className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-glow flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Execute {config.name}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
