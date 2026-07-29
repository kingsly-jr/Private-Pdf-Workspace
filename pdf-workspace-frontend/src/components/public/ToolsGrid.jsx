import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Layers, Split, RotateCw, Trash2, ArrowRightLeft, Crop, Maximize2, Image,
  FileCode, FileSpreadsheet, Presentation, FileImage, FileText, Lock, Unlock,
  EyeOff, Wrench, GitCompare, ScanText, FileEdit, Stamp, Hash, PenTool, Minimize, Camera, Globe, FileCheck, Sparkles, Languages, Edit3
} from 'lucide-react';

const ICON_MAP = {
  'merge': Layers,
  'split': Split,
  'rotate': RotateCw,
  'delete-pages': Trash2,
  'organize': ArrowRightLeft,
  'crop': Crop,
  'resize': Maximize2,
  'extract-images': Image,
  'pdf-to-word': FileCode,
  'word-to-pdf': FileCode,
  'pdf-to-excel': FileSpreadsheet,
  'excel-to-pdf': FileSpreadsheet,
  'pdf-to-powerpoint': Presentation,
  'powerpoint-to-pdf': Presentation,
  'pdf-to-jpg': FileImage,
  'jpg-to-pdf': FileImage,
  'extract-text': FileText,
  'pdf-to-markdown': FileCode,
  'scan-to-pdf': Camera,
  'html-to-pdf': Globe,
  'pdf-to-pdfa': FileCheck,
  'ai-summary': Sparkles,
  'translate': Languages,
  'pdf-forms': FileEdit,
  'protect': Lock,
  'unlock': Unlock,
  'redact': EyeOff,
  'repair': Wrench,
  'compare': GitCompare,
  'ocr': ScanText,
  'metadata-editor': FileEdit,
  'watermark': Stamp,
  'page-numbers': Hash,
  'sign-pdf': PenTool,
  'edit-pdf': Edit3,
  'compress': Minimize
};

const DEFAULT_TOOLS = [
  // Page Operations
  { toolKey: 'merge', name: 'Merge PDF', description: 'Combine multiple PDFs into a single cohesive document.', category: 'PAGE_OPERATIONS', enabled: true },
  { toolKey: 'split', name: 'Split PDF', description: 'Extract selected pages, split by range, or split into individual page files.', category: 'PAGE_OPERATIONS', enabled: true },
  { toolKey: 'rotate', name: 'Rotate PDF', description: 'Rotate specific or all pages in your PDF document.', category: 'PAGE_OPERATIONS', enabled: true },
  { toolKey: 'delete-pages', name: 'Delete Pages', description: 'Remove unwanted pages from your PDF file.', category: 'PAGE_OPERATIONS', enabled: true },
  { toolKey: 'organize', name: 'Organize PDF', description: 'Reorder, rotate, delete, or insert blank pages in your PDF.', category: 'PAGE_OPERATIONS', enabled: true },
  { toolKey: 'crop', name: 'Crop PDF', description: 'Trim margins or crop specific areas of your PDF pages.', category: 'PAGE_OPERATIONS', enabled: true },
  { toolKey: 'resize', name: 'Resize PDF', description: 'Adjust page dimensions, margins, and scaling factors.', category: 'PAGE_OPERATIONS', enabled: true },
  { toolKey: 'extract-images', name: 'Extract Images', description: 'Pull all embedded high-resolution images out of your PDF as a ZIP archive.', category: 'PAGE_OPERATIONS', enabled: true },

  // Conversion
  { toolKey: 'pdf-to-word', name: 'PDF to Word', description: 'Convert PDF documents to editable Microsoft Word (.docx) files.', category: 'CONVERSION', enabled: true },
  { toolKey: 'word-to-pdf', name: 'Word to PDF', description: 'Convert Microsoft Word (.docx) documents into clean PDF files.', category: 'CONVERSION', enabled: true },
  { toolKey: 'pdf-to-excel', name: 'PDF to Excel', description: 'Extract tabular data from PDF into Microsoft Excel (.xlsx) spreadsheets.', category: 'CONVERSION', enabled: true },
  { toolKey: 'excel-to-pdf', name: 'Excel to PDF', description: 'Transform Excel (.xlsx) sheets into standard PDF documents.', category: 'CONVERSION', enabled: true },
  { toolKey: 'pdf-to-powerpoint', name: 'PDF to PowerPoint', description: 'Convert PDF pages into editable PowerPoint (.pptx) presentations.', category: 'CONVERSION', enabled: true },
  { toolKey: 'powerpoint-to-pdf', name: 'PowerPoint to PDF', description: 'Turn PowerPoint (.pptx) slide decks into PDF files.', category: 'CONVERSION', enabled: true },
  { toolKey: 'pdf-to-jpg', name: 'PDF to JPG', description: 'Render each PDF page as a high-quality JPG image.', category: 'CONVERSION', enabled: true },
  { toolKey: 'jpg-to-pdf', name: 'JPG to PDF', description: 'Combine multiple JPG/PNG images into a single PDF document.', category: 'CONVERSION', enabled: true },
  { toolKey: 'extract-text', name: 'Extract Text', description: 'Extract all raw readable text from PDF into TXT or Word format.', category: 'CONVERSION', enabled: true },
  { toolKey: 'pdf-to-markdown', name: 'PDF to Markdown', description: 'Extract PDF document text into structured Markdown (.md) format.', category: 'CONVERSION', enabled: true },
  { toolKey: 'scan-to-pdf', name: 'Scan to PDF', description: 'Capture photos using webcam or phone camera and convert into a PDF document.', category: 'CONVERSION', enabled: true },
  { toolKey: 'html-to-pdf', name: 'HTML to PDF', description: 'Convert HTML files or website URLs into clean PDF documents.', category: 'CONVERSION', enabled: true },
  { toolKey: 'pdf-to-pdfa', name: 'PDF to PDF/A', description: 'Convert PDF documents into ISO PDF/A-1b archival standard format.', category: 'CONVERSION', enabled: true },
  { toolKey: 'ai-summary', name: 'AI Summarizer', description: 'Analyze PDF documents and generate executive summaries, key bullet points, and action items.', category: 'CONVERSION', enabled: true },
  { toolKey: 'translate', name: 'Translate PDF', description: 'Extract PDF text and translate document into your target language of choice.', category: 'CONVERSION', enabled: true },
  { toolKey: 'pdf-forms', name: 'PDF Forms', description: 'Add fillable text fields and interactive checkboxes to PDF documents.', category: 'CONVERSION', enabled: true },

  // Security
  { toolKey: 'protect', name: 'Protect PDF', description: 'Secure PDF documents with passwords and restricted permissions.', category: 'SECURITY', enabled: true },
  { toolKey: 'unlock', name: 'Unlock PDF', description: 'Remove password restrictions from protected PDF files.', category: 'SECURITY', enabled: true },
  { toolKey: 'redact', name: 'Redact PDF', description: 'Permanently sanitize and purge sensitive text or content regions.', category: 'SECURITY', enabled: true },
  { toolKey: 'repair', name: 'Repair PDF', description: 'Recover readable content from damaged or corrupted PDF files.', category: 'SECURITY', enabled: true },
  { toolKey: 'compare', name: 'Compare PDF', description: 'Compare two PDF documents side-by-side and highlight differences.', category: 'SECURITY', enabled: true },
  { toolKey: 'ocr', name: 'OCR PDF', description: 'Perform optical character recognition to make scanned PDFs searchable.', category: 'SECURITY', enabled: true },
  { toolKey: 'metadata-editor', name: 'Metadata Editor', description: 'Edit title, author, subject, keywords, and creator metadata fields.', category: 'SECURITY', enabled: true },

  // Annotation
  { toolKey: 'watermark', name: 'Watermark PDF', description: 'Apply text or image watermarks with custom positioning and opacity.', category: 'ANNOTATION', enabled: true },
  { toolKey: 'page-numbers', name: 'Page Numbers', description: 'Add customizable page numbers to header or footer regions.', category: 'ANNOTATION', enabled: true },
  { toolKey: 'sign-pdf', name: 'Sign PDF', description: 'Place drawn, typed, or image signatures anywhere on your document.', category: 'ANNOTATION', enabled: true },
  { toolKey: 'edit-pdf', name: 'Edit PDF', description: 'Add text overlays, draw highlights, insert stamps, and annotate PDF pages visually.', category: 'ANNOTATION', enabled: true },

  // Compression
  { toolKey: 'compress', name: 'Compress PDF', description: 'Optimize and compress PDF file size while maintaining visual quality.', category: 'COMPRESSION', enabled: true }
];

export default function ToolsGrid() {
  const [tools, setTools] = useState(DEFAULT_TOOLS);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const res = await api.get('/public/features');
        if (res.data && res.data.length > 0) {
          setTools(res.data);
        }
      } catch (err) {
        console.warn('Backend connection pending, showing static 36 tool grid:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTools();
  }, []);

  const categories = ['ALL', 'PAGE_OPERATIONS', 'CONVERSION', 'SECURITY', 'ANNOTATION', 'COMPRESSION'];

  const filteredTools = tools.filter(tool => {
    if (activeCategory === 'ALL') return true;
    return tool.category === activeCategory;
  });

  return (
    <div className="w-full max-w-7xl mx-auto py-12 px-6">
      {/* Category Filter Tabs */}
      <div className="flex items-center justify-center space-x-2 overflow-x-auto pb-4 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-brand-600 text-white shadow-glow'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Grid of PDF Tools */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredTools.map((tool) => {
          const IconComponent = ICON_MAP[tool.toolKey] || FileText;
          return (
            <Link
              key={tool.toolKey}
              to={`/tools/${tool.toolKey}`}
              className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between group hover:border-brand-500/40"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-brand-500/20 transition-all">
                  <IconComponent className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-1 group-hover:text-brand-300 transition-colors">
                  {tool.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {tool.description}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 group-hover:text-brand-400 transition-colors font-medium">
                <span>Use Tool</span>
                <span>→</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
