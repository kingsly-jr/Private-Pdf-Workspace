import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import { ToggleLeft, ToggleRight, Search, Plus, Sparkles } from 'lucide-react';
import FeatureFlagFormModal from '../../components/admin/FeatureFlagFormModal';
import toast from 'react-hot-toast';

export default function AdminFeaturesPage() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchFeatures();
    if (searchParams.get('action') === 'new') {
      setIsModalOpen(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  const fetchFeatures = async () => {
    try {
      const res = await adminApi.get('/features');
      setFeatures(res.data);
    } catch (err) {
      toast.error('Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (toolKey, currentEnabled) => {
    const nextState = !currentEnabled;
    // Optimistic update
    setFeatures(prev => prev.map(f => f.toolKey === toolKey ? { ...f, enabled: nextState } : f));

    try {
      await adminApi.put(`/features/${toolKey}/toggle?enabled=${nextState}`);
      toast.success(`Tool [${toolKey}] ${nextState ? 'enabled' : 'disabled'} live on public site.`);
    } catch (err) {
      // Rollback
      setFeatures(prev => prev.map(f => f.toolKey === toolKey ? { ...f, enabled: currentEnabled } : f));
      toast.error('Failed to toggle feature flag.');
    }
  };

  const handleFeatureAdded = (newFeature) => {
    setFeatures(prev => [newFeature, ...prev]);
  };

  const categories = ['ALL', 'PAGE_OPERATIONS', 'CONVERSION', 'SECURITY', 'ANNOTATION', 'COMPRESSION'];

  const filteredFeatures = features.filter(f => {
    const matchesCat = activeCategory === 'ALL' || f.category === activeCategory;
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) || f.toolKey.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Feature Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Enable, disable, or add new PDF tool feature flags across the platform in real-time.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 text-xs font-bold bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl shadow-glow transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Feature</span>
        </button>
      </div>

      {/* Category Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-brand-600 text-white shadow-glow'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search tools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Features Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFeatures.map((f) => (
          <div
            key={f.toolKey}
            className={`glass-card p-5 rounded-2xl border transition-all ${
              f.enabled ? 'border-slate-800 bg-slate-900/40' : 'border-rose-500/20 bg-rose-500/5 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {f.category.replace('_', ' ')}
                </span>
                <h3 className="text-base font-bold text-white mt-2">{f.name}</h3>
              </div>

              <button
                onClick={() => handleToggle(f.toolKey, f.enabled)}
                className={`p-1 rounded-xl transition-all ${
                  f.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-600 hover:text-slate-400'
                }`}
                title={f.enabled ? 'Click to disable' : 'Click to enable'}
              >
                {f.enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed">
              {f.description}
            </p>
          </div>
        ))}
      </div>

      {/* Modal */}
      <FeatureFlagFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onFeatureAdded={handleFeatureAdded}
      />
    </div>
  );
}
