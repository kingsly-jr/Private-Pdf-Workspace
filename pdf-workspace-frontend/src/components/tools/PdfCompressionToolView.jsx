import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';
import UploadArea from '../common/UploadArea';
import FileCard from '../common/FileCard';
import ProgressBar from '../common/ProgressBar';
import useUpload from '../../hooks/useUpload';
import useProcessing from '../../hooks/useProcessing';
import useDownload from '../../hooks/useDownload';
import api from '../../services/api';
import { Minimize, ArrowLeft, Play, Sliders, CheckCircle2, Zap, ArrowDownRight, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PdfCompressionToolView() {
  const { files, addFiles, clearFiles, hasFiles } = useUpload(100, 1);
  const { isProcessing, progress, startProcessing, updateProgress, finishProcessing, handleError } = useProcessing();
  const { downloadBlob, viewBlob } = useDownload();

  const [preset, setPreset] = useState('recommended'); // 'low', 'recommended', 'high'
  const [compressionResult, setCompressionResult] = useState(null);

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCompress = async () => {
    if (!hasFiles) {
      toast.error('Please select a PDF file to compress.');
      return;
    }

    startProcessing();
    setCompressionResult(null);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('preset', preset);

      updateProgress(30);

      const response = await api.post('/pdf/compress', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
        onUploadProgress: (evt) => {
          const percent = Math.round((evt.loaded * 60) / evt.total) + 20;
          updateProgress(percent);
        }
      });

      updateProgress(90);
      finishProcessing();

      const origSize = parseInt(response.headers['x-original-size-bytes']) || files[0].size;
      const compSize = parseInt(response.headers['x-compressed-size-bytes']) || response.data.size;
      const savedPercent = parseFloat(response.headers['x-reduction-percent']) || 0;

      setCompressionResult({
        originalSize: origSize,
        compressedSize: compSize,
        percentSaved: savedPercent,
        filename: `compressed_${files[0].name}`,
        responseBlob: response
      });

      toast.success(`PDF Compressed! Saved ${savedPercent}% of file size.`);
    } catch (err) {
      handleError(err, 'Compress PDF');
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
              <Minimize className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Compress PDF</h1>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Optimize and compress PDF file size while preserving document visual quality.
              </p>
            </div>
          </div>
        </div>

        {/* Workspace */}
        <div className="space-y-6">
          {!hasFiles ? (
            <UploadArea
              onFilesSelected={addFiles}
              title="Upload PDF document to compress"
              subtitle="Select PDF file"
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Target File Panel */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Target PDF</h3>
                  <button onClick={clearFiles} className="text-xs text-slate-400 hover:text-rose-400">Change File</button>
                </div>
                <FileCard file={files[0]} onRemove={clearFiles} index={0} />

                {/* Compression Statistics & Download/View Card */}
                {compressionResult && (
                  <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-5 animate-in fade-in duration-300">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Compression Complete!</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Original</div>
                        <div className="text-sm font-bold text-white mt-1">{formatSize(compressionResult.originalSize)}</div>
                      </div>
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Compressed</div>
                        <div className="text-sm font-bold text-emerald-400 mt-1">{formatSize(compressionResult.compressedSize)}</div>
                      </div>
                      <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30 flex flex-col justify-center items-center">
                        <div className="text-[10px] text-emerald-300 font-semibold uppercase">Reduction</div>
                        <div className="text-base font-extrabold text-emerald-400 mt-0.5 flex items-center">
                          <ArrowDownRight className="w-4 h-4 mr-0.5" />
                          <span>-{compressionResult.percentSaved}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() => downloadBlob(compressionResult.responseBlob, compressionResult.filename)}
                        className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-glow transition-all flex items-center justify-center space-x-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download File</span>
                      </button>

                      <button
                        onClick={() => viewBlob(compressionResult.responseBlob, compressionResult.filename)}
                        className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white transition-all flex items-center justify-center space-x-2"
                      >
                        <Eye className="w-4 h-4 text-amber-400" />
                        <span>View / Preview File</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Compression Preset Selection */}
              <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-5 h-fit">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                  <Sliders className="w-4 h-4 text-brand-400" />
                  <h3 className="text-sm font-bold text-white">Compression Preset</h3>
                </div>

                <div className="space-y-3">
                  {[
                    { id: 'low', name: 'Low Compression', desc: 'High visual quality (~20% smaller)' },
                    { id: 'recommended', name: 'Recommended', desc: 'Optimal balance (~50% smaller)' },
                    { id: 'high', name: 'High Compression', desc: 'Smallest file size (~75% smaller)' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPreset(p.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                        preset === p.id
                          ? 'bg-brand-600/20 border-brand-500 text-white shadow-glow'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{p.name}</span>
                        {preset === p.id && <Zap className="w-3.5 h-3.5 text-brand-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{p.desc}</p>
                    </button>
                  ))}
                </div>

                {isProcessing && <ProgressBar progress={progress} statusText="Compressing PDF..." />}

                <button
                  onClick={handleCompress}
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-glow flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Compress PDF Now</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
