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
import {
  Stamp, Hash, PenTool, ArrowLeft, Play, Sliders, Download, Eye, CheckCircle2, FileCheck, Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';
import PdfEditorCanvas from '../common/PdfEditorCanvas';

const ANNOTATION_CONFIGS = {
  'watermark': {
    name: 'Watermark PDF',
    description: 'Apply text or image watermarks with custom positioning and opacity.',
    icon: Stamp,
    endpoint: '/pdf/watermark'
  },
  'page-numbers': {
    name: 'Page Numbers',
    description: 'Add customizable page numbers to header or footer regions.',
    icon: Hash,
    endpoint: '/pdf/page-numbers'
  },
  'sign-pdf': {
    name: 'Sign PDF',
    description: 'Place drawn, typed, or image signatures anywhere on your document.',
    icon: PenTool,
    endpoint: '/pdf/sign-pdf'
  },
  'edit-pdf': {
    name: 'Edit PDF',
    description: 'Add text overlays, draw highlights, insert stamps, and annotate PDF pages visually.',
    icon: Edit3,
    endpoint: '/pdf/watermark'
  }
};

export default function PdfAnnotationToolView() {
  const { slug } = useParams();
  const config = ANNOTATION_CONFIGS[slug] || ANNOTATION_CONFIGS['watermark'];
  const IconComponent = config.icon;

  const documentUpload = useUpload(100, 1);
  const signatureUpload = useUpload(20, 1);

  const { isProcessing, progress, startProcessing, updateProgress, finishProcessing, handleError } = useProcessing();
  const { downloadBlob, viewBlob } = useDownload();
  const [convertedResult, setConvertedResult] = useState(null);

  // Tool Options State
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [watermarkRotation, setWatermarkRotation] = useState(45);
  const [watermarkPosition, setWatermarkPosition] = useState('center');

  const [pageNumberPosition, setPageNumberPosition] = useState('footer');
  const [pageNumberAlignment, setPageNumberAlignment] = useState('center');
  const [pageNumberFormat, setPageNumberFormat] = useState('Page {n} of {total}');

  const [signPageNum, setSignPageNum] = useState(1);
  const [signPosX, setSignPosX] = useState(100);
  const [signPosY, setSignPosY] = useState(100);

  const handleSubmit = async () => {
    if (!documentUpload.hasFiles) {
      toast.error('Please select a PDF document first.');
      return;
    }

    if (slug === 'sign-pdf' && !signatureUpload.hasFiles) {
      toast.error('Please select a signature image file.');
      return;
    }

    startProcessing();

    try {
      const formData = new FormData();
      formData.append('file', documentUpload.files[0]);

      if (slug === 'watermark') {
        formData.append('text', watermarkText);
        formData.append('opacity', watermarkOpacity);
        formData.append('rotation', watermarkRotation);
        formData.append('position', watermarkPosition);
      } else if (slug === 'page-numbers') {
        formData.append('position', pageNumberPosition);
        formData.append('alignment', pageNumberAlignment);
        formData.append('format', pageNumberFormat);
      } else if (slug === 'sign-pdf') {
        formData.append('signatureFile', signatureUpload.files[0]);
        formData.append('pageNum', signPageNum);
        formData.append('posX', signPosX);
        formData.append('posY', signPosY);
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
                  documentUpload.clearFiles();
                  signatureUpload.clearFiles();
                }}
                className="w-full sm:w-auto px-4 py-3.5 rounded-xl font-semibold text-xs text-slate-400 hover:text-white transition-colors"
              >
                Process Another File
              </button>
            </div>
          </div>
        ) : slug === 'edit-pdf' && documentUpload.hasFiles ? (
          <PdfEditorCanvas file={documentUpload.files[0]} onBack={documentUpload.clearFiles} />
        ) : (
          <div className="space-y-6">
          {!documentUpload.hasFiles ? (
            <UploadArea
              onFilesSelected={documentUpload.addFiles}
              title={`Upload document for ${config.name}`}
              subtitle="Select PDF file"
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* File List Panel */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Target PDF</h3>
                  <button onClick={documentUpload.clearFiles} className="text-xs text-slate-400 hover:text-rose-400">Change File</button>
                </div>
                <FileCard file={documentUpload.files[0]} onRemove={documentUpload.clearFiles} index={0} />

                {slug === 'sign-pdf' && (
                  <div className="pt-4 border-t border-slate-800">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Signature Image</h3>
                    {!signatureUpload.hasFiles ? (
                      <UploadArea
                        onFilesSelected={signatureUpload.addFiles}
                        accept={{ 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] }}
                        title="Upload Signature Graphic"
                        subtitle="PNG or JPG image signature"
                      />
                    ) : (
                      <FileCard file={signatureUpload.files[0]} onRemove={signatureUpload.clearFiles} index={0} />
                    )}
                  </div>
                )}
              </div>

              {/* Options & Action Control Panel */}
              <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-5 h-fit">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                  <Sliders className="w-4 h-4 text-brand-400" />
                  <h3 className="text-sm font-bold text-white">Annotation Controls</h3>
                </div>

                {slug === 'watermark' && (
                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Watermark Text</label>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1 font-semibold">
                        <span>Opacity</span>
                        <span>{Math.round(watermarkOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                        className="w-full accent-brand-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1 font-semibold">
                        <span>Rotation</span>
                        <span>{watermarkRotation}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="15"
                        value={watermarkRotation}
                        onChange={(e) => setWatermarkRotation(parseInt(e.target.value))}
                        className="w-full accent-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-2">Position Anchor (3x3 Grid)</label>
                      <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                        {[
                          { id: 'top-left', label: 'Top Left' },
                          { id: 'top-center', label: 'Top Center' },
                          { id: 'top-right', label: 'Top Right' },
                          { id: 'center-left', label: 'Mid Left' },
                          { id: 'center', label: 'Center' },
                          { id: 'center-right', label: 'Mid Right' },
                          { id: 'bottom-left', label: 'Btm Left' },
                          { id: 'bottom-center', label: 'Btm Center' },
                          { id: 'bottom-right', label: 'Btm Right' }
                        ].map(pos => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => setWatermarkPosition(pos.id)}
                            className={`py-2 text-[11px] font-bold rounded-lg transition-all border ${
                              watermarkPosition === pos.id
                                ? 'bg-gradient-to-r from-brand-600 to-indigo-600 border-brand-500 text-white shadow-glow'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {slug === 'page-numbers' && (
                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Region Position</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['footer', 'header'].map(pos => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => setPageNumberPosition(pos)}
                            className={`py-2 rounded-lg font-bold capitalize border transition-all ${
                              pageNumberPosition === pos
                                ? 'bg-brand-600 text-white border-brand-500 shadow-glow'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Alignment</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['left', 'center', 'right'].map(align => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => setPageNumberAlignment(align)}
                            className={`py-2 rounded-lg font-bold capitalize border transition-all ${
                              pageNumberAlignment === align
                                ? 'bg-brand-600 text-white border-brand-500 shadow-glow'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Format Pattern</label>
                      <input
                        type="text"
                        value={pageNumberFormat}
                        onChange={(e) => setPageNumberFormat(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                      />
                    </div>
                  </div>
                )}

                {slug === 'sign-pdf' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Target Page Number</label>
                      <input
                        type="number"
                        min={1}
                        value={signPageNum}
                        onChange={(e) => setSignPageNum(parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block mb-1">X Coordinate</span>
                        <input
                          type="number"
                          value={signPosX}
                          onChange={(e) => setSignPosX(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1">Y Coordinate</span>
                        <input
                          type="number"
                          value={signPosY}
                          onChange={(e) => setSignPosY(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {isProcessing && <ProgressBar progress={progress} statusText={`Applying ${config.name}...`} />}

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
        </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
