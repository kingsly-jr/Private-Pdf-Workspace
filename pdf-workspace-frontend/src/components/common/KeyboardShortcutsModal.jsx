import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Command } from 'lucide-react';

const TOOLS_LIST = [
  { name: 'Merge PDF', slug: 'merge', category: 'Page Operations' },
  { name: 'Split PDF', slug: 'split', category: 'Page Operations' },
  { name: 'Rotate PDF', slug: 'rotate', category: 'Page Operations' },
  { name: 'Delete Pages', slug: 'delete-pages', category: 'Page Operations' },
  { name: 'Organize PDF', slug: 'organize', category: 'Page Operations' },
  { name: 'Crop PDF', slug: 'crop', category: 'Page Operations' },
  { name: 'Resize PDF', slug: 'resize', category: 'Page Operations' },
  { name: 'Extract Images', slug: 'extract-images', category: 'Page Operations' },
  { name: 'PDF to Word', slug: 'pdf-to-word', category: 'Conversion' },
  { name: 'Word to PDF', slug: 'word-to-pdf', category: 'Conversion' },
  { name: 'PDF to Excel', slug: 'pdf-to-excel', category: 'Conversion' },
  { name: 'Excel to PDF', slug: 'excel-to-pdf', category: 'Conversion' },
  { name: 'PDF to PowerPoint', slug: 'pdf-to-powerpoint', category: 'Conversion' },
  { name: 'PowerPoint to PDF', slug: 'powerpoint-to-pdf', category: 'Conversion' },
  { name: 'PDF to JPG', slug: 'pdf-to-jpg', category: 'Conversion' },
  { name: 'JPG to PDF', slug: 'jpg-to-pdf', category: 'Conversion' },
  { name: 'Extract Text', slug: 'extract-text', category: 'Conversion' },
  { name: 'Protect PDF', slug: 'protect', category: 'Security' },
  { name: 'Unlock PDF', slug: 'unlock', category: 'Security' },
  { name: 'Redact PDF', slug: 'redact', category: 'Security' },
  { name: 'Repair PDF', slug: 'repair', category: 'Security' },
  { name: 'Compare PDF', slug: 'compare', category: 'Security' },
  { name: 'OCR PDF', slug: 'ocr', category: 'Security' },
  { name: 'Metadata Editor', slug: 'metadata-editor', category: 'Security' },
  { name: 'Watermark PDF', slug: 'watermark', category: 'Annotation' },
  { name: 'Page Numbers', slug: 'page-numbers', category: 'Annotation' },
  { name: 'Sign PDF', slug: 'sign-pdf', category: 'Annotation' },
  { name: 'Compress PDF', slug: 'compress', category: 'Compression' }
];

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = TOOLS_LIST.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.slug.toLowerCase().includes(query.toLowerCase()) ||
    t.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (slug) => {
    onClose();
    setQuery('');
    navigate(`/tools/${slug}`);
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-start justify-center pt-20 p-4"
    >
      <div className="glass-panel w-full max-w-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-800 flex items-center space-x-3">
          <Search className="w-5 h-5 text-brand-300" />
          <input
            type="text"
            autoFocus
            placeholder="Search all 36 PDF tools... (e.g. merge, compress, markdown, ai)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-cream-100 text-sm focus:outline-none placeholder:text-slate-400"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">No matching PDF tools found.</div>
          ) : (
            filtered.map((tool) => (
              <button
                key={tool.slug}
                onClick={() => handleSelect(tool.slug)}
                className="w-full p-3 rounded-xl flex items-center justify-between text-left hover:bg-slate-800/60 group transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-cream-100 group-hover:text-brand-200">{tool.name}</div>
                  <div className="text-[10px] text-slate-400">{tool.category}</div>
                </div>
                <span className="text-[10px] text-brand-300 group-hover:text-white font-mono">/tools/{tool.slug}</span>
              </button>
            ))
          )}
        </div>

        <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 px-4">
          <span className="flex items-center space-x-1.5 font-mono">
            <kbd className="bg-slate-800 border border-slate-700 text-brand-300 px-1 py-0.5 rounded text-[10px]">Ctrl</kbd>
            <span>+</span>
            <kbd className="bg-slate-800 border border-slate-700 text-brand-300 px-1 py-0.5 rounded text-[10px]">K</kbd>
            <span className="ml-1 text-slate-400">or</span>
            <kbd className="bg-slate-800 border border-slate-700 text-brand-300 px-1 py-0.5 rounded text-[10px]">?</kbd>
            <span className="ml-1">to toggle</span>
          </span>
          <span className="font-mono">Esc to close</span>
        </div>
      </div>
    </div>
  );
}
