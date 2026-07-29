import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Info, Check, FileText } from 'lucide-react';

export default function PdfPageVisualizer({
  file,
  selectedPages = [],
  onSelectionChange,
  onTotalPagesChange
}) {
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [lastClickedPage, setLastClickedPage] = useState(null);
  const canvasRefs = useRef({});

  // Dynamically load PDF.js from CDN if not already present
  useEffect(() => {
    let isMounted = true;

    const loadPdfJs = async () => {
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

      if (!file || !isMounted) return;

      try {
        setLoading(true);
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;

        if (isMounted) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          if (onTotalPagesChange) onTotalPagesChange(doc.numPages);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to parse PDF pages with PDF.js:', err);
        setLoading(false);
      }
    };

    loadPdfJs();

    return () => {
      isMounted = false;
    };
  }, [file]);

  // Render canvas thumbnail for a page
  const renderPageCanvas = async (pageNum, canvasEl) => {
    if (!pdfDoc || !canvasEl) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.3 }); // Small thumbnail scale
      canvasEl.width = viewport.width;
      canvasEl.height = viewport.height;
      const ctx = canvasEl.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.warn(`Failed rendering page ${pageNum}:`, err);
    }
  };

  // Toggle page selection with Shift + Click support
  const handlePageClick = (pageNum, e) => {
    let updated = [...selectedPages];

    if (e.shiftKey && lastClickedPage !== null) {
      const start = Math.min(lastClickedPage, pageNum);
      const end = Math.max(lastClickedPage, pageNum);
      const range = [];
      for (let i = start; i <= end; i++) range.push(i);

      // If pageNum is being selected, select whole range; if deselecting, deselect range
      const isSelecting = !selectedPages.includes(pageNum);
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

  if (loading) {
    return (
      <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-mono">Rendering document pages for visual preview...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Banner Status */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-slate-400 font-medium">
          {selectedPages.length === 0 ? (
            <span className="text-slate-400">Click pages to mark for deletion</span>
          ) : (
            <span className="text-rose-400 font-bold">
              {selectedPages.length} {selectedPages.length === 1 ? 'page' : 'pages'} marked for removal
            </span>
          )}
        </span>

        {selectedPages.length > 0 && (
          <button
            onClick={() => onSelectionChange([])}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Deselect All
          </button>
        )}
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[620px] overflow-y-auto pr-1 custom-scrollbar">
        {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => {
          const isSelected = selectedPages.includes(pageNum);

          return (
            <div
              key={pageNum}
              onClick={(e) => handlePageClick(pageNum, e)}
              className={`relative group cursor-pointer rounded-2xl border transition-all duration-200 p-3 flex flex-col items-center select-none ${
                isSelected
                  ? 'bg-rose-950/20 border-rose-500 ring-2 ring-rose-500/40 shadow-glow-rose'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              {/* Thumbnail Container */}
              <div className="relative w-full aspect-[1/1.3] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800/80 shadow-md">
                <canvas
                  ref={el => {
                    if (el && !canvasRefs.current[pageNum]) {
                      canvasRefs.current[pageNum] = el;
                      renderPageCanvas(pageNum, el);
                    }
                  }}
                  className={`w-full h-full object-contain transition-opacity duration-200 ${
                    isSelected ? 'opacity-40 grayscale' : 'opacity-100'
                  }`}
                />

                {/* Overlay Badge when Selected */}
                {isSelected && (
                  <div className="absolute inset-0 bg-rose-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center space-y-1">
                    <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg animate-in zoom-in-75 duration-150">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-rose-200 uppercase tracking-wider">Remove</span>
                  </div>
                )}
              </div>

              {/* Page Number Label */}
              <div className="mt-3.5 flex items-center justify-center">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    isSelected
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-800/80 text-slate-300 border border-slate-700/60 group-hover:text-white'
                  }`}
                >
                  Page {pageNum}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
