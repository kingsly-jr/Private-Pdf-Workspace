import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Info, Check, FileText, RotateCw, ZoomIn, Eye, ArrowLeft, ArrowRight, Plus, X, RotateCcw, File } from 'lucide-react';

function PdfFileCardItem({ file, index, onRotate, onRemove }) {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const renderFirstPage = async () => {
      if (!file || !canvasRef.current) return;
      if (file.type && file.type.startsWith('image/')) return;

      try {
        if (!window.pdfjsLib) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
              if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
              }
              resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        const pdfjs = window.pdfjsLib;
        if (!pdfjs) return;
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 0.4 });

        if (canvasRef.current && isMounted) {
          canvasRef.current.width = viewport.width;
          canvasRef.current.height = viewport.height;
          const ctx = canvasRef.current.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
      } catch (err) {
        console.warn('File card render note:', err);
      }
    };

    renderFirstPage();
    return () => {
      isMounted = false;
    };
  }, [file]);

  const handleRotateClick = (e) => {
    e.stopPropagation();
    setRotation(prev => (prev + 90) % 360);
    if (onRotate) onRotate(index);
  };

  const handleRemoveClick = (e) => {
    e.stopPropagation();
    if (onRemove) onRemove(index);
  };

  const fileName = file?.name || 'Uploaded File';

  return (
    <div className="relative group bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all duration-200 flex flex-col items-center select-none w-56 sm:w-64">
      {/* Top-Right Floating Action Icons (Rotate + Remove) */}
      <div className="absolute top-3 right-3 z-20 flex items-center space-x-1.5">
        <button
          type="button"
          onClick={handleRotateClick}
          className="w-8 h-8 rounded-full bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:text-brand-500 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-md transition-all hover:scale-110"
          title="Rotate page +90°"
        >
          <RotateCw className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={handleRemoveClick}
            className="w-8 h-8 rounded-full bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:text-rose-500 hover:bg-rose-500/10 border border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-md transition-all hover:scale-110"
            title="Remove file"
          >
            <X className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        )}
      </div>

      {/* Thumbnail Container */}
      <div className="w-full aspect-[1/1.3] bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-800 p-2 shadow-inner">
        {file?.type && file.type.startsWith('image/') ? (
          <img
            src={URL.createObjectURL(file)}
            alt={fileName}
            className="w-full h-full object-contain transition-transform duration-200"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain transition-transform duration-200"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        )}
      </div>

      {/* Centered Filename Label */}
      <div className="mt-3.5 w-full text-center px-1">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate" title={fileName}>
          {fileName}
        </p>
      </div>
    </div>
  );
}

function PdfPageCanvasItem({ pdfDoc, pageNum, rotation, isDeleted, isSelected }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current || !pageNum) return;
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.35 });
        if (canvasRef.current && isMounted) {
          canvasRef.current.width = viewport.width;
          canvasRef.current.height = viewport.height;
          const ctx = canvasRef.current.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
      } catch (err) {
        console.warn(`Failed rendering canvas for page ${pageNum}:`, err);
      }
    };

    renderPage();

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, pageNum]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full object-contain transition-all duration-200 ${
        isDeleted || isSelected ? 'opacity-30 grayscale' : 'opacity-100'
      }`}
      style={{ transform: `rotate(${rotation}deg)` }}
    />
  );
}

export default function PdfPageVisualizer({
  file,
  files = [],
  selectedPages = [],
  onSelectionChange,
  onTotalPagesChange,
  onAddFiles,
  onRemoveFile,
  mode = 'view', // 'view' | 'select' | 'rotate' | 'organize'
  rotations = {},
  onRotatePage,
  pageOrder = [],
  onMovePage,
  deletedPages = [],
  onToggleDeletePage,
  actionBadge = 'Remove'
}) {
  const activeFiles = files && files.length > 0 ? files : (file ? [file] : []);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const currentFile = activeFiles[activeFileIndex] || activeFiles[0];

  const safePageOrder = Array.isArray(pageOrder) ? pageOrder : [];
  const safeDeletedPages = Array.isArray(deletedPages) ? deletedPages : [];
  const safeSelectedPages = Array.isArray(selectedPages) ? selectedPages : [];
  const safeRotations = rotations || {};

  const [numPages, setNumPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [lastClickedPage, setLastClickedPage] = useState(null);

  // Clamp active index if files array shrinks
  useEffect(() => {
    if (activeFileIndex >= activeFiles.length && activeFiles.length > 0) {
      setActiveFileIndex(activeFiles.length - 1);
    }
  }, [activeFiles.length, activeFileIndex]);

  // Load PDF.js dynamically
  useEffect(() => {
    let isMounted = true;

    const loadPdfJs = async () => {
      if (!currentFile || !isMounted) {
        setLoading(false);
        return;
      }

      // Handle raw image preview directly
      if (currentFile.type && currentFile.type.startsWith('image/')) {
        setPdfDoc(null);
        setNumPages(1);
        if (onTotalPagesChange) onTotalPagesChange(1);
        setLoading(false);
        return;
      }

      // Handle non-PDF documents e.g. .docx, .xlsx, .pptx
      if (currentFile.name && !currentFile.name.toLowerCase().endsWith('.pdf')) {
        setPdfDoc(null);
        setNumPages(1);
        if (onTotalPagesChange) onTotalPagesChange(1);
        setLoading(false);
        return;
      }

      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = () => {
            if (window.pdfjsLib) {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            resolve();
          };
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      try {
        setLoading(true);
        const arrayBuffer = await currentFile.arrayBuffer();
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;

        if (isMounted) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          if (onTotalPagesChange) onTotalPagesChange(doc.numPages);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Document preview rendering note:', err);
        if (isMounted) {
          setPdfDoc(null);
          setNumPages(1);
          if (onTotalPagesChange) onTotalPagesChange(1);
          setLoading(false);
        }
      }
    };

    loadPdfJs();

    return () => {
      isMounted = false;
    };
  }, [currentFile]);

  const handlePageClick = (pageNum, e) => {
    if (mode === 'organize' && onToggleDeletePage) {
      onToggleDeletePage(pageNum);
      return;
    }

    if (mode === 'view' || !onSelectionChange) return;

    let updated = [...safeSelectedPages];
    if (e.shiftKey && lastClickedPage !== null) {
      const start = Math.min(lastClickedPage, pageNum);
      const end = Math.max(lastClickedPage, pageNum);
      const range = [];
      for (let i = start; i <= end; i++) range.push(i);

      const isSelecting = !safeSelectedPages.includes(pageNum);
      if (isSelecting) {
        updated = Array.from(new Set([...updated, ...range]));
      } else {
        updated = updated.filter(p => !range.includes(p));
      }
    } else {
      if (updated.includes(pageNum)) {
        updated = updated.filter(p => p !== pageNum);
      } else {
        updated.push(pageNum);
      }
    }

    setLastClickedPage(pageNum);
    onSelectionChange(updated.sort((a, b) => a - b));
  };

  if (!currentFile && activeFiles.length === 0) {
    return (
      <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
        No document file selected.
      </div>
    );
  }

  // MULTI-FILE GRID VIEW (Reference Image 2 layout)
  if (activeFiles.length > 1) {
    return (
      <div className="space-y-6">
        {/* Header Status */}
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white uppercase tracking-wider">
              Uploaded Files ({activeFiles.length})
            </span>
          </div>

          {onAddFiles && (
            <label className="px-3.5 py-2 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/40 text-brand-300 hover:text-white font-bold text-xs cursor-pointer transition-all flex items-center space-x-1.5 shadow-glow-sm">
              <Plus className="w-4 h-4 text-brand-400" />
              <span>Add Files</span>
              <input
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onAddFiles(Array.from(e.target.files));
                  }
                }}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Visual File Cards Grid with top-right rotate and remove buttons */}
        <div className="flex flex-wrap gap-6 items-start">
          {activeFiles.map((f, idx) => (
            <PdfFileCardItem
              key={idx}
              file={f}
              index={idx}
              onRotate={onRotatePage}
              onRemove={onRemoveFile}
            />
          ))}

          {/* Add Files Card Button */}
          {onAddFiles && (
            <label className="w-56 sm:w-64 h-[300px] rounded-2xl border-2 border-dashed border-slate-700 hover:border-brand-500 bg-slate-900/40 hover:bg-brand-500/10 cursor-pointer transition-all flex flex-col items-center justify-center p-6 text-center space-y-3 group">
              <div className="w-12 h-12 rounded-full bg-brand-500/20 text-brand-400 group-hover:scale-110 transition-transform flex items-center justify-center shadow-glow-sm">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-300 group-hover:text-white">Add More Files</span>
              <input
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onAddFiles(Array.from(e.target.files));
                  }
                }}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>
    );
  }

  // SINGLE FILE PAGE GRID VIEW
  if (loading) {
    return (
      <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-mono">Rendering document pages for visual preview...</p>
      </div>
    );
  }

  const currentFileName = currentFile ? currentFile.name : 'Document';

  const displayPages = (mode === 'organize' && safePageOrder.length > 0)
    ? safePageOrder
    : Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Top Banner Status */}
      <div className="flex items-center justify-between text-xs px-1 gap-2 flex-wrap">
        <span className="text-slate-400 font-medium flex items-center space-x-2">
          <span className="font-bold text-white uppercase tracking-wider">{currentFileName}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{numPages} {numPages === 1 ? 'Page' : 'Pages'}</span>
          {mode === 'select' && safeSelectedPages.length > 0 && (
            <>
              <span className="text-slate-500">•</span>
              <span className="text-rose-400 font-bold">{safeSelectedPages.length} marked</span>
            </>
          )}
          {mode === 'organize' && safeDeletedPages.length > 0 && (
            <>
              <span className="text-slate-500">•</span>
              <span className="text-rose-400 font-bold">{safeDeletedPages.length} deleted</span>
            </>
          )}
        </span>

        <div className="flex items-center space-x-2">
          {/* Prominent + Add Files Button */}
          {onAddFiles && (
            <label className="px-3 py-1.5 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/40 text-brand-300 hover:text-white font-bold text-xs cursor-pointer transition-all flex items-center space-x-1.5 shadow-glow-sm">
              <Plus className="w-3.5 h-3.5 text-brand-400" />
              <span>Add Files</span>
              <input
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onAddFiles(Array.from(e.target.files));
                  }
                }}
                className="hidden"
              />
            </label>
          )}

          {/* Prominent Remove File Trash Icon Button */}
          {onRemoveFile && (
            <button
              type="button"
              onClick={() => onRemoveFile(activeFileIndex)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 font-bold text-xs transition-all flex items-center space-x-1.5 shadow-glow-rose-sm"
              title="Remove this uploaded file"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Remove File</span>
            </button>
          )}

          {mode === 'select' && safeSelectedPages.length > 0 && (
            <button
              onClick={() => onSelectionChange([])}
              className="text-xs text-slate-400 hover:text-white transition-colors ml-1"
            >
              Deselect All
            </button>
          )}
        </div>
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar p-1">
        {displayPages.map((pageNum, idx) => {
          const isSelected = safeSelectedPages.includes(pageNum);
          const isDeleted = mode === 'organize' && safeDeletedPages.includes(pageNum);
          const rotation = safeRotations[pageNum] || 0;

          return (
            <div
              key={`${pageNum}-${idx}`}
              onClick={(e) => handlePageClick(pageNum, e)}
              className={`relative group rounded-2xl border transition-all duration-200 p-3 flex flex-col items-center select-none ${
                mode === 'select' || mode === 'organize' ? 'cursor-pointer' : ''
              } ${
                isDeleted
                  ? 'bg-rose-950/20 border-rose-600/60 ring-1 ring-rose-500/30'
                  : isSelected
                  ? 'bg-rose-950/20 border-rose-500 ring-2 ring-rose-500/40 shadow-glow-rose'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              {/* Thumbnail Container */}
              <div className="relative w-full aspect-[1/1.3] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800/80 shadow-md">
                {currentFile && currentFile.type && currentFile.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(currentFile)}
                    alt="Preview"
                    className={`w-full h-full object-contain ${isDeleted ? 'opacity-30 grayscale' : 'opacity-100'}`}
                    style={{ transform: `rotate(${rotation}deg)` }}
                  />
                ) : (
                  <PdfPageCanvasItem
                    pdfDoc={pdfDoc}
                    pageNum={pageNum}
                    rotation={rotation}
                    isDeleted={isDeleted}
                    isSelected={isSelected}
                  />
                )}

                {/* Deleted Overlay Banner */}
                {isDeleted && (
                  <div className="absolute inset-0 bg-rose-950/70 backdrop-blur-[1px] flex flex-col items-center justify-center space-y-2 p-2">
                    <div className="w-9 h-9 rounded-full bg-rose-600/80 text-white flex items-center justify-center shadow-lg">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-rose-200 uppercase tracking-wider">Deleted</span>
                    {onToggleDeletePage && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleDeletePage(pageNum);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-rose-300 border border-rose-500/40 transition-all flex items-center space-x-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Undo</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Overlay Badge when Selected */}
                {!isDeleted && isSelected && (
                  <div className="absolute inset-0 bg-rose-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center space-y-1">
                    <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg animate-in zoom-in-75 duration-150">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-rose-200 uppercase tracking-wider">{actionBadge}</span>
                  </div>
                )}

                {/* Action Buttons overlay for mode rotate or organize */}
                {!isDeleted && (mode === 'rotate' || mode === 'organize') && (
                  <div className="absolute top-2 right-2 flex items-center space-x-1 z-10">
                    {/* Rotate Button (🔄) */}
                    {onRotatePage && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRotatePage(pageNum);
                        }}
                        className="p-1.5 rounded-xl bg-slate-900/90 text-slate-200 hover:text-brand-400 hover:bg-slate-800 border border-slate-700 shadow-md transition-all hover:scale-110"
                        title="Rotate page +90°"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-brand-400" />
                      </button>
                    )}

                    {/* Delete Button (🗑️) for Organize mode */}
                    {mode === 'organize' && onToggleDeletePage && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleDeletePage(pageNum);
                        }}
                        className="p-1.5 rounded-xl bg-slate-900/90 text-slate-200 hover:text-rose-400 hover:bg-rose-950/80 border border-slate-700 shadow-md transition-all hover:scale-110"
                        title="Delete page"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Page Label & Reorder Controls (← Page N →) */}
              <div className="mt-3.5 flex items-center justify-between w-full px-1">
                {mode === 'organize' && onMovePage ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onMovePage(idx, idx - 1)}
                      disabled={idx === 0}
                      className="p-1 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Move page left"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                        isDeleted
                          ? 'bg-rose-900/30 text-rose-400 border border-rose-800/50'
                          : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
                      }`}
                    >
                      Page {pageNum} {rotation > 0 && `(${rotation}°)`}
                    </span>

                    <button
                      type="button"
                      onClick={() => onMovePage(idx, idx + 1)}
                      disabled={idx === displayPages.length - 1}
                      className="p-1 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Move page right"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                        isSelected
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-slate-800/80 text-slate-300 border border-slate-700/60 group-hover:text-white'
                      }`}
                    >
                      Page {pageNum}
                    </span>

                    {rotation > 0 && (
                      <span className="text-[10px] text-brand-400 font-mono font-semibold">{rotation}°</span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
