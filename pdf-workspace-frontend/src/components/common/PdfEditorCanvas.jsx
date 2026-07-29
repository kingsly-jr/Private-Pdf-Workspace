import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Type, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Save, Trash2, CheckCircle2, Download, Eye, Sparkles, Edit,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  Undo2, Redo2, Copy, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import useProcessing from '../../hooks/useProcessing';
import useDownload from '../../hooks/useDownload';
import api from '../../services/api';
import ProgressBar from './ProgressBar';

// ── Font family options ───────────────────────────────────────────────────────
const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Impact', value: 'Impact, sans-serif' },
];

// ── Default color history ─────────────────────────────────────────────────────
const DEFAULT_COLORS = ['#000000', '#1e293b', '#dc2626', '#2563eb', '#16a34a', '#d97706'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function blockInlineStyle(block) {
  return {
    fontFamily: block.fontFamily || 'Arial, sans-serif',
    fontWeight: block.bold ? 'bold' : 'normal',
    fontStyle: block.italic ? 'italic' : 'normal',
    textDecoration: [block.underline && 'underline', block.strikethrough && 'line-through'].filter(Boolean).join(' ') || 'none',
    textAlign: block.textAlign || 'left',
    fontSize: `${block.fontSize}px`,
    color: block.color || '#000000',
  };
}

function defaultBlockStyle() {
  return {
    fontFamily: 'Arial, sans-serif',
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    textAlign: 'left',
  };
}

export default function PdfEditorCanvas({ file, onBack }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.25);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState('edit-text');
  const [activeTool, setActiveTool] = useState('select');
  const [textColor, setTextColor] = useState('#000000');
  const [textSize, setTextSize] = useState(16);
  const [penColor, setPenColor] = useState('#ef4444');
  const [penWidth, setPenWidth] = useState(3);

  // Per-page text spans: { [pageNum]: [ { id, text, origText, x, y, width, height, fontSize, color, fontFamily, bold, italic, underline, strikethrough, textAlign, isExisting } ] }
  const [textBlocks, setTextBlocks] = useState({});
  const [selectedBlockId, setSelectedBlockId] = useState(null);

  // Undo / Redo stacks (store full textBlocks snapshots)
  const [blockHistory, setBlockHistory] = useState([]);
  const [blockFuture, setBlockFuture] = useState([]);

  // Custom color history palette
  const [colorHistory, setColorHistory] = useState([...DEFAULT_COLORS]);

  const [annotations, setAnnotations] = useState({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);

  const { isProcessing, progress, startProcessing, updateProgress, finishProcessing, handleError } = useProcessing();
  const { downloadBlob, viewBlob } = useDownload();
  const [editedResult, setEditedResult] = useState(null);

  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const containerRef = useRef(null);

  // ── Load PDF.js ──────────────────────────────────────────────────────────────
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
        if (isMounted) { setPdfDoc(doc); setNumPages(doc.numPages); setLoading(false); }
      } catch (err) {
        toast.error('Failed to render PDF.');
        setLoading(false);
      }
    };
    loadPdf();
    return () => { isMounted = false; };
  }, [file]);

  // ── Render page + extract individual text spans ───────────────────────────
  useEffect(() => {
    if (!pdfDoc || loading) return;
    let renderTask = null;

    const run = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });

        const pdfCanvas = pdfCanvasRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        if (!pdfCanvas || !overlayCanvas) return;

        pdfCanvas.width = viewport.width;
        pdfCanvas.height = viewport.height;
        overlayCanvas.width = viewport.width;
        overlayCanvas.height = viewport.height;

        const ctx = pdfCanvas.getContext('2d');
        renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;

        if (!textBlocks[currentPage]) {
          const content = await page.getTextContent();
          const spans = [];

          content.items.forEach((item, idx) => {
            if (!item.str || !item.str.trim()) return;

            const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
            const fontH = Math.abs(Math.hypot(tx[2], tx[3]));
            const x = tx[4];
            const y = tx[5] - fontH;
            const w = Math.max(20, item.width * scale);
            const h = Math.max(fontH, fontH * 1.2);

            spans.push({
              id: `span_${currentPage}_${idx}`,
              isExisting: true,
              text: item.str,
              origText: item.str,
              x: Math.max(0, x),
              y: Math.max(0, y),
              width: w,
              height: h,
              fontSize: Math.max(8, Math.round(fontH)),
              color: '#000000',
              ...defaultBlockStyle()
            });
          });

          setTextBlocks(prev => ({ ...prev, [currentPage]: spans }));
        }

        redrawOverlay();
      } catch (err) {
        if (err.name !== 'RenderingCancelledException') console.warn(err);
      }
    };

    run();
    return () => { if (renderTask) renderTask.cancel(); };
  }, [pdfDoc, currentPage, scale, loading]);

  // ── Overlay canvas ───────────────────────────────────────────────────────
  const redrawOverlay = () => {
    const oc = overlayCanvasRef.current;
    if (!oc) return;
    const ctx = oc.getContext('2d');
    ctx.clearRect(0, 0, oc.width, oc.height);

    (annotations[currentPage] || []).forEach(ann => {
      ctx.save();
      if (ann.type === 'pen') {
        ctx.strokeStyle = ann.color; ctx.lineWidth = ann.width;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        ann.points.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
      } else if (ann.type === 'highlight') {
        ctx.fillStyle = 'rgba(253,224,71,0.45)';
        ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
      } else if (ann.type === 'whiteout') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
      } else if (ann.type === 'image' && ann.imgElement) {
        ctx.drawImage(ann.imgElement, ann.x, ann.y, ann.width, ann.height);
      }
      ctx.restore();
    });

    if (isDrawing && currentPath.length > 0) {
      ctx.save();
      ctx.strokeStyle = penColor; ctx.lineWidth = penWidth; ctx.lineCap = 'round';
      ctx.beginPath();
      currentPath.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
      ctx.stroke(); ctx.restore();
    }
  };

  useEffect(() => { redrawOverlay(); }, [annotations, currentPath, isDrawing, currentPage]);

  const canvasCoords = (e) => {
    const r = overlayCanvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  // ── Text block update with undo history ──────────────────────────────────
  const updateBlock = useCallback((id, field, value) => {
    setBlockHistory(h => [...h.slice(-30), textBlocks]);
    setBlockFuture([]);
    setTextBlocks(prev => ({
      ...prev,
      [currentPage]: (prev[currentPage] || []).map(b => b.id === id ? { ...b, [field]: value } : b)
    }));
  }, [textBlocks, currentPage]);

  // Batch update multiple fields at once (e.g. toggle bold)
  const updateBlockFields = useCallback((id, fields) => {
    setBlockHistory(h => [...h.slice(-30), textBlocks]);
    setBlockFuture([]);
    setTextBlocks(prev => ({
      ...prev,
      [currentPage]: (prev[currentPage] || []).map(b => b.id === id ? { ...b, ...fields } : b)
    }));
  }, [textBlocks, currentPage]);

  const handleUndo = () => {
    if (!blockHistory.length) return;
    const prev = blockHistory[blockHistory.length - 1];
    setBlockFuture(f => [textBlocks, ...f.slice(0, 29)]);
    setBlockHistory(h => h.slice(0, -1));
    setTextBlocks(prev);
  };

  const handleRedo = () => {
    if (!blockFuture.length) return;
    const next = blockFuture[0];
    setBlockHistory(h => [...h.slice(-30), textBlocks]);
    setBlockFuture(f => f.slice(1));
    setTextBlocks(next);
  };

  // ── Color history management ─────────────────────────────────────────────
  const addToColorHistory = (hex) => {
    setColorHistory(prev => {
      const filtered = prev.filter(c => c.toLowerCase() !== hex.toLowerCase());
      return [hex, ...filtered].slice(0, 12);
    });
  };

  const handleColorChange = (id, hex) => {
    updateBlock(id, 'color', hex);
    addToColorHistory(hex);
  };

  // ── Annotation handlers ──────────────────────────────────────────────────
  const addAnnotation = (ann) => setAnnotations(p => ({ ...p, [currentPage]: [...(p[currentPage] || []), ann] }));

  const handleMouseDown = (e) => {
    if (mode === 'annotate' && activeTool === 'pen') {
      setIsDrawing(true); setCurrentPath([canvasCoords(e)]);
    } else if (mode === 'annotate' && activeTool === 'highlight') {
      const c = canvasCoords(e);
      addAnnotation({ id: Date.now(), type: 'highlight', x: c.x, y: c.y, width: 160, height: 20 });
    } else if (mode === 'annotate' && activeTool === 'whiteout') {
      const c = canvasCoords(e);
      addAnnotation({ id: Date.now(), type: 'whiteout', x: c.x, y: c.y, width: 140, height: 24 });
    }
  };
  const handleMouseMove = (e) => {
    if (isDrawing && activeTool === 'pen') setCurrentPath(p => [...p, canvasCoords(e)]);
  };
  const handleMouseUp = () => {
    if (isDrawing && activeTool === 'pen') {
      if (currentPath.length > 1) addAnnotation({ id: Date.now(), type: 'pen', points: currentPath, color: penColor, width: penWidth });
      setIsDrawing(false); setCurrentPath([]);
    }
  };

  const handleCanvasClick = (e) => {
    if (mode !== 'annotate' || activeTool !== 'text') return;
    if (e.target.tagName === 'INPUT') return;
    const c = canvasCoords(e);
    const id = `user_${Date.now()}`;
    setTextBlocks(p => ({
      ...p,
      [currentPage]: [...(p[currentPage] || []), {
        id, isExisting: false, text: 'New text', origText: '',
        x: c.x, y: c.y, width: 120, height: 20,
        fontSize: textSize, color: textColor,
        ...defaultBlockStyle()
      }]
    }));
    setSelectedBlockId(id);
  };

  const deleteBlock = (id) => {
    setBlockHistory(h => [...h.slice(-30), textBlocks]);
    setBlockFuture([]);
    setTextBlocks(p => ({ ...p, [currentPage]: (p[currentPage] || []).filter(b => b.id !== id) }));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const handleImageUpload = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => addAnnotation({ id: Date.now(), type: 'image', x: 80, y: 80, width: Math.min(200, img.width), height: Math.min(150, (img.height / img.width) * 200), imgElement: img });
      img.src = ev.target.result;
    };
    reader.readAsDataURL(f);
  };

  // ── Save / export ─────────────────────────────────────────────────────────
  const handleSaveChanges = async () => {
    startProcessing();
    try {
      updateProgress(10);
      const blobs = [];
      const expScale = 3.5;

      for (let p = 1; p <= numPages; p++) {
        const page = await pdfDoc.getPage(p);
        const vp = page.getViewport({ scale: expScale });
        const ec = document.createElement('canvas');
        ec.width = vp.width; ec.height = vp.height;
        const ctx = ec.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ec.width, ec.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;

        const sf = expScale / scale;
        const blocks = textBlocks[p] || [];

        blocks.filter(b => b.isExisting && b.text !== b.origText).forEach(b => {
          ctx.save(); ctx.fillStyle = '#fff';
          ctx.fillRect((b.x - 2) * sf, (b.y - 2) * sf, (b.width + 6) * sf, (b.height + 4) * sf);
          ctx.restore();
        });
        blocks.filter(b => b.text !== b.origText || !b.isExisting).forEach(b => {
          if (!b.text.trim()) return;
          ctx.save();
          ctx.fillStyle = b.color || '#000';
          const style = blockInlineStyle(b);
          ctx.font = `${style.fontStyle} ${style.fontWeight} ${b.fontSize * sf}px ${b.fontFamily || 'Arial'}`;
          ctx.fillText(b.text, b.x * sf, (b.y + b.fontSize) * sf);
          ctx.restore();
        });

        (annotations[p] || []).forEach(ann => {
          ctx.save();
          if (ann.type === 'pen') {
            ctx.strokeStyle = ann.color; ctx.lineWidth = ann.width * sf; ctx.lineCap = 'round';
            ctx.beginPath();
            ann.points.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x * sf, pt.y * sf) : ctx.lineTo(pt.x * sf, pt.y * sf));
            ctx.stroke();
          } else if (ann.type === 'highlight') {
            ctx.fillStyle = 'rgba(253,224,71,0.45)';
            ctx.fillRect(ann.x * sf, ann.y * sf, ann.width * sf, ann.height * sf);
          } else if (ann.type === 'whiteout') {
            ctx.fillStyle = '#fff';
            ctx.fillRect(ann.x * sf, ann.y * sf, ann.width * sf, ann.height * sf);
          } else if (ann.type === 'image' && ann.imgElement) {
            ctx.drawImage(ann.imgElement, ann.x * sf, ann.y * sf, ann.width * sf, ann.height * sf);
          }
          ctx.restore();
        });

        const blob = await new Promise(res => ec.toBlob(res, 'image/png'));
        blobs.push(new File([blob], `page_${p}.png`, { type: 'image/png' }));
        updateProgress(10 + Math.round((p / numPages) * 70));
      }

      const fd = new FormData();
      blobs.forEach(f => fd.append('files', f));
      const res = await api.post('/pdf/jpg-to-pdf', fd, { headers: { 'Content-Type': 'multipart/form-data' }, responseType: 'blob' });

      updateProgress(100); finishProcessing();
      setEditedResult({ response: res.data, filename: `edited_${file.name}` });
      toast.success('PDF saved successfully!');
    } catch (err) { handleError(err, 'PDF Edit'); }
  };

  const currentPageBlocks = textBlocks[currentPage] || [];
  const selectedBlock = currentPageBlocks.find(b => b.id === selectedBlockId);

  // ── Icon toggle button helper ─────────────────────────────────────────────
  const FormatBtn = ({ active, onClick, title, children }) => (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all border ${
        active
          ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {children}
    </button>
  );

  const AlignBtn = ({ align, current, onClick }) => (
    <button
      onClick={onClick}
      title={`Align ${align}`}
      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all border ${
        current === align
          ? 'bg-blue-600 border-blue-500 text-white'
          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {align === 'left' && <AlignLeft className="w-4 h-4" />}
      {align === 'center' && <AlignCenter className="w-4 h-4" />}
      {align === 'right' && <AlignRight className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">

      {/* ── Toolbar ── */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40 shadow-xl">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-extrabold text-white truncate max-w-xs">{file.name}</h1>
            <span className="text-[11px] text-slate-400">Interactive PDF Text Stream Editor</span>
          </div>
        </div>

        {/* Mode switch */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => { setMode('edit-text'); setActiveTool('select'); }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${mode === 'edit-text' ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-glow' : 'text-slate-400 hover:text-white'}`}
          >
            <Edit className="w-4 h-4" /><span>TI Edit Text</span>
          </button>
          <button
            onClick={() => { setMode('annotate'); setActiveTool('text'); }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${mode === 'annotate' ? 'bg-brand-600 text-white shadow-glow' : 'text-slate-400 hover:text-white'}`}
          >
            <Type className="w-4 h-4" /><span>Annotate</span>
          </button>
        </div>

        {/* Annotate sub-tools */}
        {mode === 'annotate' && (
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            {['text', 'pen', 'highlight', 'whiteout'].map(t => (
              <button key={t} onClick={() => setActiveTool(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize ${activeTool === t ? 'bg-brand-600 text-white' : 'text-slate-400'}`}>
                {t === 'text' ? '+ Add Text' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
            <label className="px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:text-white cursor-pointer">
              + Image <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* Page nav & Zoom */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1.5 rounded-xl border border-slate-800">
            <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1 text-slate-400 hover:text-white disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-bold text-white px-2">{currentPage} / {numPages || 1}</span>
            <button disabled={currentPage >= numPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1 text-slate-400 hover:text-white disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1.5 rounded-xl border border-slate-800">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.15))} className="p-1 text-slate-400 hover:text-white"><ZoomOut className="w-4 h-4" /></button>
            <span className="text-slate-400 text-xs px-1 min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.15))} className="p-1 text-slate-400 hover:text-white"><ZoomIn className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* ── Main body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Canvas viewport */}
        <div className="flex-1 overflow-auto p-8 flex items-start justify-center custom-scrollbar bg-slate-950/90">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Extracting PDF text spans...</p>
            </div>
          ) : editedResult ? (
            <div className="glass-card p-8 rounded-3xl border border-slate-800 max-w-lg w-full text-center space-y-6 my-auto">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white">PDF Text Edits Saved!</h2>
                <p className="text-xs text-slate-400 mt-1">Your changes have been applied.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={() => downloadBlob(editedResult.response, editedResult.filename)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-red-600 to-rose-600 text-white flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /><span>Download Edited PDF</span>
                </button>
                <button onClick={() => viewBlob(editedResult.response, editedResult.filename)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs bg-slate-900 border border-slate-700 text-slate-200 flex items-center justify-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" /><span>View / Preview</span>
                </button>
              </div>
              <button onClick={() => setEditedResult(null)} className="text-xs text-slate-400 hover:text-white block mx-auto pt-2">
                Continue Editing
              </button>
            </div>
          ) : (
            <div ref={containerRef} onClick={handleCanvasClick} className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-700 bg-white">
              <canvas ref={pdfCanvasRef} className="block" />
              <canvas
                ref={overlayCanvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="absolute inset-0 z-10 pointer-events-auto"
              />

              {/* Per-span dashed blue bounding boxes */}
              {mode === 'edit-text' && currentPageBlocks.map(block => {
                const isSelected = block.id === selectedBlockId;
                const isModified = block.text !== block.origText;

                return (
                  <div
                    key={block.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); }}
                    style={{
                      position: 'absolute',
                      left: `${block.x - 1}px`,
                      top: `${block.y - 1}px`,
                      width: `${block.width + 2}px`,
                      height: `${block.height + 2}px`,
                      zIndex: isSelected ? 30 : 20,
                      cursor: 'text',
                      boxSizing: 'border-box',
                      background: isSelected ? 'rgba(255,255,255,0.97)' : isModified ? 'rgba(209,250,229,0.92)' : 'transparent',
                      border: isSelected ? '2px solid #2563eb' : isModified ? '1.5px dashed #10b981' : '1px dashed #60a5fa',
                      borderRadius: '2px',
                    }}
                  >
                    {(isSelected || isModified) && (
                      <input
                        autoFocus={isSelected}
                        type="text"
                        value={block.text}
                        onChange={(e) => updateBlock(block.id, 'text', e.target.value)}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          outline: 'none',
                          background: 'white',
                          padding: '0 2px',
                          boxSizing: 'border-box',
                          ...blockInlineStyle(block),
                        }}
                      />
                    )}
                  </div>
                );
              })}

              {/* Annotate mode new text blocks */}
              {mode === 'annotate' && currentPageBlocks.filter(b => !b.isExisting).map(block => (
                <div
                  key={block.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); }}
                  style={{ position: 'absolute', left: `${block.x}px`, top: `${block.y}px`, zIndex: 25, cursor: 'text' }}
                >
                  <input
                    type="text"
                    value={block.text}
                    onChange={(e) => updateBlock(block.id, 'text', e.target.value)}
                    style={{
                      border: '1px dashed #60a5fa', outline: 'none',
                      background: 'rgba(255,255,255,0.9)',
                      padding: '0 3px', minWidth: '100px',
                      ...blockInlineStyle(block),
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right Sidebar: Rich Text Styles Panel ── */}
        <div className="w-72 bg-slate-900 border-l border-slate-800 overflow-y-auto custom-scrollbar hidden md:flex flex-col">
          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b border-slate-800">
            <h2 className="text-base font-extrabold text-white">Text Styles</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Edit extracted document text in-place</p>
          </div>

          {selectedBlock ? (
            <div className="flex-1 flex flex-col px-5 py-4 space-y-5">

              {/* ── Header: Span label + delete ── */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider">
                  {selectedBlock.isExisting ? 'PDF Text Span' : 'Added Text'}
                </span>
                <button onClick={() => deleteBlock(selectedBlock.id)} className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-400/10" title="Delete span">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* ── Text Content ── */}
              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1.5">Text Content</label>
                <input
                  type="text"
                  value={selectedBlock.text}
                  onChange={(e) => updateBlock(selectedBlock.id, 'text', e.target.value)}
                  className="w-full bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="border-t border-slate-800" />

              {/* ── Font Family + Font Size (row) ── */}
              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1.5">Font</label>
                <div className="flex gap-2">
                  <select
                    value={selectedBlock.fontFamily || 'Arial, sans-serif'}
                    onChange={(e) => updateBlock(selectedBlock.id, 'fontFamily', e.target.value)}
                    className="flex-1 min-w-0 bg-slate-800 text-white text-[11px] px-2 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
                  >
                    {FONT_FAMILIES.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={6}
                    max={144}
                    value={selectedBlock.fontSize}
                    onChange={(e) => updateBlock(selectedBlock.id, 'fontSize', Math.max(6, Math.min(144, Number(e.target.value))))}
                    className="w-16 bg-slate-800 text-white text-xs px-2 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 text-center"
                  />
                </div>
              </div>

              {/* ── Bold / Italic / Underline / Strikethrough ── */}
              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1.5">Style</label>
                <div className="flex gap-2">
                  <FormatBtn active={selectedBlock.bold} title="Bold" onClick={() => updateBlock(selectedBlock.id, 'bold', !selectedBlock.bold)}>
                    <Bold className="w-4 h-4" />
                  </FormatBtn>
                  <FormatBtn active={selectedBlock.italic} title="Italic" onClick={() => updateBlock(selectedBlock.id, 'italic', !selectedBlock.italic)}>
                    <Italic className="w-4 h-4" />
                  </FormatBtn>
                  <FormatBtn active={selectedBlock.underline} title="Underline" onClick={() => updateBlock(selectedBlock.id, 'underline', !selectedBlock.underline)}>
                    <Underline className="w-4 h-4" />
                  </FormatBtn>
                  <FormatBtn active={selectedBlock.strikethrough} title="Strikethrough" onClick={() => updateBlock(selectedBlock.id, 'strikethrough', !selectedBlock.strikethrough)}>
                    <Strikethrough className="w-4 h-4" />
                  </FormatBtn>
                </div>
              </div>

              {/* ── Text Alignment ── */}
              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1.5">Alignment</label>
                <div className="flex gap-2">
                  <AlignBtn align="left" current={selectedBlock.textAlign || 'left'} onClick={() => updateBlock(selectedBlock.id, 'textAlign', 'left')} />
                  <AlignBtn align="center" current={selectedBlock.textAlign || 'left'} onClick={() => updateBlock(selectedBlock.id, 'textAlign', 'center')} />
                  <AlignBtn align="right" current={selectedBlock.textAlign || 'left'} onClick={() => updateBlock(selectedBlock.id, 'textAlign', 'right')} />
                </div>
              </div>

              <div className="border-t border-slate-800" />

              {/* ── Current Color ── */}
              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-2">Current Color</label>
                <div className="flex items-center gap-3">
                  {/* Color circle swatch */}
                  <div
                    className="w-9 h-9 rounded-full border-2 border-white shadow-lg cursor-pointer flex-shrink-0 ring-2 ring-blue-500/40"
                    style={{ background: selectedBlock.color || '#000000' }}
                    title="Current color"
                  />
                  <span className="text-xs font-mono text-slate-300 flex-1">{(selectedBlock.color || '#000000').toUpperCase()}</span>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(selectedBlock.color || '#000000'); toast.success('Color copied!'); }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Copy color"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ── Custom Colors palette ── */}
              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-2">Custom Colors</label>
                <div className="flex flex-wrap gap-2">
                  {colorHistory.map((c, i) => (
                    <button
                      key={`${c}-${i}`}
                      onClick={() => updateBlock(selectedBlock.id, 'color', c)}
                      title={c}
                      className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                        (selectedBlock.color || '#000000').toLowerCase() === c.toLowerCase()
                          ? 'border-blue-400 ring-2 ring-blue-400/40 scale-110'
                          : 'border-slate-600 hover:border-slate-400'
                      }`}
                      style={{ background: c }}
                    />
                  ))}

                  {/* + Add custom color */}
                  <label
                    className="w-7 h-7 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors text-slate-400 hover:text-blue-400"
                    title="Add custom color"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <input
                      type="color"
                      value={selectedBlock.color || '#000000'}
                      onChange={(e) => handleColorChange(selectedBlock.id, e.target.value)}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-800" />

              {/* ── Undo / Redo ── */}
              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1.5">History</label>
                <div className="flex gap-2">
                  <button
                    onClick={handleUndo}
                    disabled={!blockHistory.length}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Undo"
                  >
                    <Undo2 className="w-4 h-4" />
                    <span>Undo</span>
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={!blockFuture.length}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Redo"
                  >
                    <Redo2 className="w-4 h-4" />
                    <span>Redo</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 px-5 py-6">
              <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-brand-300 text-xs font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Roriri Workspace Text Stream Editor</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Click any dashed blue box in the PDF to select a text span and see full styling options here.
                </p>
              </div>
            </div>
          )}

          {/* ── Save Button ── */}
          <div className="px-5 py-5 border-t border-slate-800 space-y-3">
            {isProcessing && <ProgressBar progress={progress} statusText="Saving PDF changes..." />}
            <button
              onClick={handleSaveChanges}
              disabled={isProcessing || loading}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Save changes ➔</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
