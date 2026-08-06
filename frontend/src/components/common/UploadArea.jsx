import React from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, PlusCircle } from 'lucide-react';

export default function UploadArea({
  onFilesSelected,
  accept = { 'application/pdf': ['.pdf'] },
  multiple = true,
  maxSizeMb = 100,
  title = "Select PDF Files",
  subtitle = "or drag & drop PDFs here"
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    accept,
    multiple
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
        isDragActive
          ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
          : 'border-slate-800 hover:border-brand-500/50 bg-slate-900/40 hover:bg-slate-900/80'
      }`}
    >
      <input {...getInputProps()} />
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600/20 to-indigo-500/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-4 text-brand-400">
        {isDragActive ? <PlusCircle className="w-8 h-8 animate-bounce" /> : <UploadCloud className="w-8 h-8" />}
      </div>
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400 mb-4">{subtitle}</p>
      <div className="inline-flex items-center space-x-2 text-xs text-slate-500 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
        <FileText className="w-3.5 h-3.5" />
        <span>Max file size: {maxSizeMb}MB</span>
      </div>
    </div>
  );
}
