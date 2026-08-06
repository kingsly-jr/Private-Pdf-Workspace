import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw,
  Info, CheckCircle2, Download, Eye, Play, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import useProcessing from '../../hooks/useProcessing';
import useDownload from '../../hooks/useDownload';
import api from '../../services/api';
import ProgressBar from './ProgressBar';

export default function PdfCropCanvas({ file, onBack }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);

  // Pages selection: 'all' | 'current'
  const [pagesMode, setPagesMode] = useState('all');

  // Crop rectangle state (stored as relative percentages 0..1 of original page dimensions)
  // { x: 0.05, y: 0.05, width: 0.90, height: 0.90 }
  const [cropRectRel, setCropRectRel] = useState({ x: 0.05, y: 0.05, width: 0.90, height: 0.90 });

  // Canvas pixel dimensions for current page
  const [pageDim, setPageDim] = useState({ width: 600, height: 800 });

  // Mouse drag state: null | 'new' | 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  const [dragMode, setDragMode] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rectStart, setRectStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const { isProcessing, progress, startProcessing, updateProgress, finishProcessing, handleError } = useProcessing();
  const { downloadBlob, viewBlob } = useDownload();
  const [cropResult, setCropResult] = useState(null);

  const pdfCanvasRef = useRef(null);
  const overlayRef = useRef(null);
  const containerRef = useRef(null);

  // Load PDF.js
  useEffect(() => {
    let isMounted = true;
    const loadPdf = async () => {
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve();
          };
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      if (!file || !isMounted) return;
      try {
        setLoading(true);
        const buf = await file.arrayBuffer();
        const doc = await window.pdfjsLib.getDocument({ data: buf }).promise;
        if (isMounted) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setLoading(false);
        }
      } catch (err) {
        toast.error('Failed to render PDF page.');
        setLoading(false);
      }
    };
    loadPdf();
    return () => { isMounted = false; };
  }, [file]);

  // Render PDF page to canvas
  useEffect(() => {
    if (!pdfDoc || loading || cropResult) return;
    let renderTask = null;

    const run = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const viewport = page.getViewport({ scale: scale * 1.25 });

        const pdfCanvas = pdfCanvasRef.current;
        if (!pdfCanvas) return;

        pdfCanvas.width = viewport.width;
        pdfCanvas.height = viewport.height;
        setPageDim({ width: viewport.width, height: viewport.height, unscaledW: unscaledViewport.width, unscaledH: unscaledViewport.height });

        const ctx = pdfCanvas.getContext('2d');
        renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;
      } catch (err) {
        if (err.name !== 'RenderingCancelledException') console.warn(err);
      }
    };

    run();
    return () => { if (renderTask) renderTask.cancel(); };
  }, [pdfDoc, currentPage, scale, loading, cropResult]);

  // Convert relative crop rect to current canvas pixels
  const cropPixel = {
    x: cropRectRel.x * pageDim.width,
    y: cropRectRel.y * pageDim.height,
    width: cropRectRel.width * pageDim.width,
    height: cropRectRel.height * pageDim.height,
  };

  // Convert mouse event coords relative to overlay container
  const getCanvasCoords = (e) => {
    const r = overlayRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(pageDim.width, e.clientX - r.left)),
      y: Math.max(0, Math.min(pageDim.height, e.clientY - r.top))
    };
  };

  // Mouse events for creating & resizing crop box
  const handleMouseDown = (e, mode = 'new') => {
    e.stopPropagation();
    const c = getCanvasCoords(e);
    setDragMode(mode);
    setDragStart(c);
    setRectStart({ ...cropPixel });

    if (mode === 'new') {
      setCropRectRel({
        x: c.x / pageDim.width,
        y: c.y / pageDim.height,
        width: 0,
        height: 0
      });
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragMode || !overlayRef.current) return;
    const c = getCanvasCoords(e);
    const dx = c.x - dragStart.x;
    const dy = c.y - dragStart.y;

    let nextX = rectStart.x;
    let nextY = rectStart.y;
    let nextW = rectStart.width;
    let nextH = rectStart.height;

    if (dragMode === 'new') {
      const x1 = Math.min(dragStart.x, c.x);
      const y1 = Math.min(dragStart.y, c.y);
      const w = Math.abs(c.x - dragStart.x);
      const h = Math.abs(c.y - dragStart.y);
      nextX = x1; nextY = y1; nextW = w; nextH = h;
    } else if (dragMode === 'move') {
      nextX = Math.max(0, Math.min(pageDim.width - rectStart.width, rectStart.x + dx));
      nextY = Math.max(0, Math.min(pageDim.height - rectStart.height, rectStart.y + dy));
    } else {
      // Handles: nw, n, ne, e, se, s, sw, w
      if (dragMode.includes('e')) nextW = Math.max(30, Math.min(pageDim.width - rectStart.x, rectStart.width + dx));
      if (dragMode.includes('s')) nextH = Math.max(30, Math.min(pageDim.height - rectStart.y, rectStart.height + dy));
      if (dragMode.includes('w')) {
        const possibleW = rectStart.width - dx;
        if (possibleW >= 30) {
          nextX = Math.max(0, rectStart.x + dx);
          nextW = possibleW;
        }
      }
      if (dragMode.includes('n')) {
        const possibleH = rectStart.height - dy;
        if (possibleH >= 30) {
          nextY = Math.max(0, rectStart.y + dy);
          nextH = possibleH;
        }
      }
    }

    setCropRectRel({
      x: nextX / pageDim.width,
      y: nextY / pageDim.height,
      width: nextW / pageDim.width,
      height: nextH / pageDim.height
    });
  }, [dragMode, dragStart, rectStart, pageDim]);

  const handleMouseUp = useCallback(() => {
    setDragMode(null);
  }, []);

  useEffect(() => {
    if (dragMode) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragMode, handleMouseMove, handleMouseUp]);

  // Reset to full page
  const handleResetAll = () => {
    setCropRectRel({ x: 0, y: 0, width: 1.0, height: 1.0 });
    toast.success('Crop box reset to full page.');
  };

  // Submit crop execution
  const handleExecuteCrop = async () => {
    startProcessing();
    try {
      updateProgress(20);

      // Convert relative crop box to points (PDF 72 DPI points)
      // Margin calculations in points from edges
      const unscaledW = pageDim.unscaledW || 595.28;
      const unscaledH = pageDim.unscaledH || 841.89;

      const cropX = cropRectRel.x * unscaledW;
      const cropY = cropRectRel.y * unscaledH;
      const cropW = cropRectRel.width * unscaledW;
      const cropH = cropRectRel.height * unscaledH;

      const left = Math.max(0, Math.round(cropX));
      const top = Math.max(0, Math.round(cropY));
      const right = Math.max(0, Math.round(unscaledW - (cropX + cropW)));
      const bottom = Math.max(0, Math.round(unscaledH - (cropY + cropH)));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('top', top);
      formData.append('bottom', bottom);
      formData.append('left', left);
      formData.append('right', right);
      if (pagesMode === 'current') {
        formData.append('pageNum', currentPage);
      }

      updateProgress(50);

      const response = await api.post('/pdf/crop', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
        onUploadProgress: (evt) => {
          const percent = Math.round((evt.loaded * 40) / evt.total) + 50;
          updateProgress(percent);
        }
      });

      updateProgress(100);
      finishProcessing();

      setCropResult({
        response,
        filename: `cropped_${file.name}`
      });

      toast.success('PDF cropped successfully!');
    } catch (err) {
      handleError(err, 'Crop PDF');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">

      {/* Main Workspace Split View */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Interactive Canvas Region */}
        <div className="flex-1 overflow-auto p-8 flex flex-col items-center justify-start custom-scrollbar bg-slate-950/90 relative">

          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 my-auto">
              <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Loading document pages...</p>
            </div>
          ) : (
            <>
              {/* Completion Overlay Backdrop when Crop Result exists */}
              {cropResult && (
                <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
                  <div className="glass-card p-8 rounded-3xl border border-slate-800 max-w-lg w-full text-center space-y-6">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-white">PDF Cropped Successfully!</h2>
                      <p className="text-xs text-slate-400 mt-1">Target pages cropped to your selection.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        onClick={() => downloadBlob(cropResult.response, cropResult.filename)}
                        className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center gap-2 shadow-glow-rose"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Cropped PDF</span>
                      </button>
                      <button
                        onClick={() => viewBlob(cropResult.response, cropResult.filename)}
                        className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs bg-slate-900 border border-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4 text-amber-400" />
                        <span>View / Preview</span>
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setCropResult(null);
                        setCropRectRel({ x: 0.05, y: 0.05, width: 0.90, height: 0.90 });
                      }}
                      className="text-xs text-slate-400 hover:text-white block mx-auto pt-2 transition-colors"
                    >
                      Crop Again
                    </button>
                  </div>
                </div>
              )}

              {/* PDF Document Canvas Viewport */}
              <div
                ref={containerRef}
                className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-700 bg-white select-none"
                style={{ width: `${pageDim.width}px`, height: `${pageDim.height}px` }}
              >
                {/* Underneath PDF Page Canvas */}
                <canvas ref={pdfCanvasRef} className="block" />

                {/* Interactive Drag-to-Crop Overlay Layer */}
                <div
                  ref={overlayRef}
                  onMouseDown={(e) => handleMouseDown(e, 'new')}
                  className="absolute inset-0 z-10 cursor-crosshair"
                >
                  {/* Outer Dark Mask (Top, Bottom, Left, Right around crop box) */}
                  <div
                    className="absolute bg-slate-950/60 pointer-events-none"
                    style={{ left: 0, top: 0, width: '100%', height: `${cropPixel.y}px` }}
                  />
                  <div
                    className="absolute bg-slate-950/60 pointer-events-none"
                    style={{ left: 0, top: `${cropPixel.y + cropPixel.height}px`, width: '100%', height: `${pageDim.height - (cropPixel.y + cropPixel.height)}px` }}
                  />
                  <div
                    className="absolute bg-slate-950/60 pointer-events-none"
                    style={{ left: 0, top: `${cropPixel.y}px`, width: `${cropPixel.x}px`, height: `${cropPixel.height}px` }}
                  />
                  <div
                    className="absolute bg-slate-950/60 pointer-events-none"
                    style={{ left: `${cropPixel.x + cropPixel.width}px`, top: `${cropPixel.y}px`, width: `${pageDim.width - (cropPixel.x + cropPixel.width)}px`, height: `${cropPixel.height}px` }}
                  />

                  {/* Active Crop Box Selection Window */}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                    className="absolute border-2 border-dashed border-rose-500 bg-transparent cursor-move group"
                    style={{
                      left: `${cropPixel.x}px`,
                      top: `${cropPixel.y}px`,
                      width: `${cropPixel.width}px`,
                      height: `${cropPixel.height}px`,
                      boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)'
                    }}
                  >
                    {/* Inner subtle grid lines */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-rose-500/20">
                      <div className="border-r border-b border-rose-500/20" />
                      <div className="border-r border-b border-rose-500/20" />
                      <div className="border-b border-rose-500/20" />
                      <div className="border-r border-b border-rose-500/20" />
                      <div className="border-r border-b border-rose-500/20" />
                      <div className="border-b border-rose-500/20" />
                    </div>

                    {/* 8 Drag & Resize Handles */}
                    {[
                      { h: 'nw', pos: '-top-1.5 -left-1.5 cursor-nwse-resize' },
                      { h: 'n', pos: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
                      { h: 'ne', pos: '-top-1.5 -right-1.5 cursor-nesw-resize' },
                      { h: 'e', pos: 'top-1/2 -translate-y-1/2 -right-1.5 cursor-ew-resize' },
                      { h: 'se', pos: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
                      { h: 's', pos: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
                      { h: 'sw', pos: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
                      { h: 'w', pos: 'top-1/2 -translate-y-1/2 -left-1.5 cursor-ew-resize' }
                    ].map(handle => (
                      <div
                        key={handle.h}
                        onMouseDown={(e) => handleMouseDown(e, handle.h)}
                        className={`absolute w-3.5 h-3.5 bg-white border-2 border-rose-500 rounded-sm shadow-md ${handle.pos}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Canvas Control Toolbar (matching Image 2) */}
              <div className="mt-6 flex items-center gap-4 bg-slate-900/90 backdrop-blur border border-slate-800 px-4 py-2 rounded-2xl shadow-xl z-20 text-xs">
                {/* Page Navigation */}
                <div className="flex items-center gap-1.5 border-r border-slate-800 pr-4">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-white px-2 font-mono">{currentPage} / {numPages || 1}</span>
                  <button
                    disabled={currentPage >= numPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2 border-r border-slate-800 pr-4">
                  <button onClick={() => setScale(s => Math.max(0.5, s - 0.15))} className="p-1 text-slate-400 hover:text-white">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-slate-300 font-mono text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
                  <button onClick={() => setScale(s => Math.min(2.5, s + 0.15))} className="p-1 text-slate-400 hover:text-white">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <button onClick={() => setScale(1.0)} className="p-1 text-slate-400 hover:text-white" title="Reset Zoom">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar Control Panel (matching Reference Image 2 exactly) */}
        <div className="w-80 bg-white text-slate-900 border-l border-slate-200 p-6 flex flex-col justify-between hidden md:flex shadow-2xl">
          <div className="space-y-6">

            {/* Title */}
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Crop PDF</h2>
            </div>

            {/* Blue Alert Banner (matching Reference Image 2) */}
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-sky-900">
              <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">
                Click and drag to select the area you want to keep. Resize if needed.
              </p>
            </div>

            {/* Reset All Link */}
            <div className="flex justify-end">
              <button
                onClick={handleResetAll}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 underline transition-colors"
              >
                Reset all
              </button>
            </div>

            {/* Pages Selector (matching Reference Image 2) */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">Pages:</label>
              <div className="flex items-center gap-6 text-xs font-semibold text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pagesMode"
                    value="all"
                    checked={pagesMode === 'all'}
                    onChange={() => setPagesMode('all')}
                    className="w-4 h-4 text-rose-500 accent-rose-500 cursor-pointer"
                  />
                  <span>All pages</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pagesMode"
                    value="current"
                    checked={pagesMode === 'current'}
                    onChange={() => setPagesMode('current')}
                    className="w-4 h-4 text-rose-500 accent-rose-500 cursor-pointer"
                  />
                  <span>Current page</span>
                </label>
              </div>
            </div>
          </div>

          {/* Bottom Action Section */}
          <div className="space-y-4 pt-6 border-t border-slate-100">
            {isProcessing && <ProgressBar progress={progress} statusText="Cropping PDF pages..." />}

            {/* Big Action Button (matching Reference Image 2 exactly) */}
            <button
              onClick={handleExecuteCrop}
              disabled={isProcessing || loading}
              className="w-full py-4 bg-rose-400 hover:bg-rose-500 text-white font-extrabold text-base rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <span>Crop PDF</span>
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
