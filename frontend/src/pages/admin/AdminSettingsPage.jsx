import React, { useState, useEffect } from 'react';
import adminApi from '../../services/adminApi';
import { Settings, Save, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [maxUploadSize, setMaxUploadSize] = useState('100');
  const [tempTtl, setTempTtl] = useState('15');
  const [siteTitle, setSiteTitle] = useState('Roriri Workspace');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await adminApi.get('/settings');
      const settingsMap = {};
      res.data.forEach(s => { settingsMap[s.key] = s.value; });

      if (settingsMap['max_upload_size_mb']) setMaxUploadSize(settingsMap['max_upload_size_mb']);
      if (settingsMap['temp_file_ttl_minutes']) setTempTtl(settingsMap['temp_file_ttl_minutes']);
      if (settingsMap['site_title']) setSiteTitle(settingsMap['site_title']);
      if (settingsMap['maintenance_mode']) setMaintenanceMode(settingsMap['maintenance_mode'] === 'true');
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.put('/settings', {
        'max_upload_size_mb': maxUploadSize,
        'temp_file_ttl_minutes': tempTtl,
        'site_title': siteTitle,
        'maintenance_mode': String(maintenanceMode)
      });
      toast.success('App settings updated successfully!');
    } catch (err) {
      toast.error('Failed to save app settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">App-Wide Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Configure upload limits, temp storage TTLs, and site metadata.</p>
      </div>

      <form onSubmit={handleSave} className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Max Upload File Size (MB)</label>
          <input
            type="number"
            value={maxUploadSize}
            onChange={(e) => setMaxUploadSize(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm"
          />
          <p className="text-[11px] text-slate-500 mt-1">Enforced across all public PDF upload tools.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Temp File Cleanup TTL (Minutes)</label>
          <input
            type="number"
            value={tempTtl}
            onChange={(e) => setTempTtl(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm"
          />
          <p className="text-[11px] text-slate-500 mt-1">Scheduled background cleanup interval for orphaned working directories.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Site Header Title</label>
          <input
            type="text"
            value={siteTitle}
            onChange={(e) => setSiteTitle(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-glow flex items-center space-x-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Settings...' : 'Save Settings'}</span>
        </button>
      </form>
    </div>
  );
}
