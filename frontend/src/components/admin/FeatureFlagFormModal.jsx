import React, { useState } from 'react';
import { X, Plus, Sparkles, Check, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { id: 'PAGE_OPERATIONS', label: 'Page Operations' },
  { id: 'CONVERSION', label: 'Conversion' },
  { id: 'SECURITY', label: 'Security' },
  { id: 'ANNOTATION', label: 'Annotation' },
  { id: 'COMPRESSION', label: 'Compression' },
];

export default function FeatureFlagFormModal({ isOpen, onClose, onFeatureAdded }) {
  const [name, setName] = useState('');
  const [toolKey, setToolKey] = useState('');
  const [category, setCategory] = useState('PAGE_OPERATIONS');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSlug, setIsAutoSlug] = useState(true);

  if (!isOpen) return null;

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (isAutoSlug) {
      const slug = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      setToolKey(slug);
    }
  };

  const handleToolKeyChange = (e) => {
    setToolKey(e.target.value);
    setIsAutoSlug(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !toolKey.trim()) {
      toast.error('Tool Name and Tool Key are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/admin/features', {
        name: name.trim(),
        toolKey: toolKey.trim().toLowerCase(),
        category,
        description: description.trim(),
        enabled,
        maxFileSizeMb: Number(maxFileSizeMb) || 100,
      });

      toast.success(`Feature "${response.data.name}" created successfully!`);
      if (onFeatureAdded) onFeatureAdded(response.data);
      onClose();
      // Reset form
      setName('');
      setToolKey('');
      setDescription('');
      setEnabled(true);
      setMaxFileSizeMb(100);
      setIsAutoSlug(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create feature flag.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Add New PDF Feature</h2>
              <p className="text-xs text-slate-400">Register a new tool feature flag dynamically.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Tool Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Watermark PDF"
              value={name}
              onChange={handleNameChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-all placeholder:text-slate-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tool Key (Unique Slug) *
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {isAutoSlug ? 'Auto-generated' : 'Custom'}
              </span>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. watermark"
              value={toolKey}
              onChange={handleToolKeyChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-brand-300 focus:outline-none focus:border-brand-500 transition-all placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-all"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Describe what this PDF tool accomplishes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-all placeholder:text-slate-600 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Max File Size (MB)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={maxFileSizeMb}
                onChange={(e) => setMaxFileSizeMb(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Initial Status
              </label>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`w-full py-2.5 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                  enabled
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                <Check className={`w-4 h-4 ${enabled ? 'opacity-100' : 'opacity-0'}`} />
                <span>{enabled ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-glow transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Add Feature'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
