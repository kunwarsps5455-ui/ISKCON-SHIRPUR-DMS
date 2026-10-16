import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Settings as SettingsIcon, Save, Key, Globe, MessageSquare } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>({
    ORG_NAME: '',
    ORG_DEITY: '',
    AUTO_SMS_ENABLED: 'false',
    AI_ENABLED: 'false',
    SMS_TIME: '08:00',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  if (user?.role !== 'ADMIN') {
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch (error) {
      console.error("Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    if (type === 'checkbox') {
      setSettings({ ...settings, [name]: (e.target as HTMLInputElement).checked ? 'true' : 'false' });
    } else {
      setSettings({ ...settings, [name]: value });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', settings);
      alert('Settings saved successfully');
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-temple-900 flex items-center">
            <SettingsIcon size={24} className="mr-3 text-saffron-500" />
            System Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">Configure application behavior and integrations.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-4 py-2 bg-saffron-600 text-white rounded-lg hover:bg-saffron-700 transition-colors shadow-sm disabled:opacity-70"
        >
          <Save size={18} className="mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Organization Settings */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-temple-900 flex items-center mb-4">
            <Globe size={20} className="mr-2 text-blue-500" />
            Organization Identity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Organization Name</label>
              <input type="text" name="ORG_NAME" value={settings.ORG_NAME || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-saffron-500 focus:border-saffron-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Primary Deity Reference</label>
              <input type="text" name="ORG_DEITY" value={settings.ORG_DEITY || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-saffron-500 focus:border-saffron-500" />
            </div>
          </div>
        </div>

        {/* Automation Settings */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-temple-900 flex items-center mb-4">
            <MessageSquare size={20} className="mr-2 text-green-500" />
            Birthday Automation
          </h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <input type="checkbox" name="AUTO_SMS_ENABLED" checked={settings.AUTO_SMS_ENABLED === 'true'} onChange={handleChange} className="h-4 w-4 text-saffron-600 focus:ring-saffron-500 border-gray-300 rounded" />
              <label className="ml-2 block text-sm font-medium text-gray-700">Enable Daily Automated Birthday SMS</label>
            </div>
            <div className="flex items-center">
              <input type="checkbox" name="AI_ENABLED" checked={settings.AI_ENABLED === 'true'} onChange={handleChange} className="h-4 w-4 text-saffron-600 focus:ring-saffron-500 border-gray-300 rounded" />
              <label className="ml-2 block text-sm font-medium text-gray-700">Enable AI Generated Messages (Requires configuration)</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Execution Time (IST)</label>
              <input type="time" name="SMS_TIME" value={settings.SMS_TIME || '08:00'} onChange={handleChange} className="mt-1 block w-48 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-saffron-500 focus:border-saffron-500" />
              <p className="text-xs text-gray-500 mt-1">Note: The cron job script relies on this time.</p>
            </div>
          </div>
        </div>

        {/* Integration Status */}
        <div className="p-6 bg-gray-50">
          <h2 className="text-lg font-bold text-temple-900 flex items-center mb-4">
            <Key size={20} className="mr-2 text-purple-500" />
            System Integrations Health
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white rounded border border-gray-200">
              <span className="text-sm font-medium">SMS Provider</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">Configured</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded border border-gray-200">
              <span className="text-sm font-medium">AI Service (Gemini)</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">Pending Configuration</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded border border-gray-200">
              <span className="text-sm font-medium">Database (SQLite/Prisma)</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
