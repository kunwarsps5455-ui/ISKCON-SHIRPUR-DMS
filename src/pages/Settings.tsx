import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Settings as SettingsIcon,
  Save,
  Globe,
  MessageSquare,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle,
  Server,
  Sparkles
} from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>({
    ORG_NAME: 'ISKCON Shirpur',
    ORG_DEITY: 'श्री श्री राधा गोपीनाथ',
    AUTO_WHATSAPP_ENABLED: 'true',
    AUTO_RECEIPT_ENABLED: 'true',
    AUTO_SMS_ENABLED: 'true',
    AI_ENABLED: 'false',
    MESSAGING_TIME: '08:00',
    META_PHONE_NUMBER_ID: '',
    META_ACCESS_TOKEN: '',
    META_WABA_ID: '',
    META_BIRTHDAY_TEMPLATE: 'iskcon_birthday_blessing_hi',
    META_RECEIPT_TEMPLATE: 'iskcon_seva_receipt_hi',
    WHATSAPP_MODE: 'mock',
    ENABLE_FAMILY_MEMBER_MESSAGES: 'true',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFestivalsCatalog, setShowFestivalsCatalog] = useState(false);

  // Diagnostic Test State
  const [testPhone, setTestPhone] = useState('9822011111');
  const [testingWa, setTestingWa] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const festivalTemplatesList = [
    {
      name: 'Sri Krishna Janmashtami',
      hindi: 'श्री कृष्ण जन्माष्टमी महापर्व',
      templateName: 'iskcon_janmashtami_blessing_hi',
      preview: 'हरे कृष्ण {{name}} जी 🙏 इस्कॉन शिरपुर की ओर से आपको एवं आपके पूरे परिवार को श्री कृष्ण जन्माष्टमी के पावन महापर्व की अनन्त कोटि शुभकामनाएँ! 🪷'
    },
    {
      name: 'Radhashtami',
      hindi: 'श्री राधारानी प्राकट्योत्सव (राधाष्टमी)',
      templateName: 'iskcon_radhashtami_blessing_hi',
      preview: 'हरे कृष्ण {{name}} जी 🙏 वृंदावनेश्वरी करुणामयी श्री राधारानी के आविर्भाव दिवस (राधाष्टमी) के पावन अवसर पर इस्कॉन शिरपुर परिवार की ओर से आपको हार्दिक बधाई एवं भक्तिपूर्ण शुभकामनाएँ।'
    },
    {
      name: 'Gaura Purnima',
      hindi: 'श्री गौर पूर्णिमा (चैतन्य महाप्रभु प्राकट्योत्सव)',
      templateName: 'iskcon_gaura_purnima_blessing_hi',
      preview: 'हरे कृष्ण {{name}} जी 🙏 हरिनाम संकीर्तन के प्रवर्तक, परम करुणामय श्री चैतन्य महाप्रभु के आविर्भाव महापर्व "श्री गौर पूर्णिमा" की आपको सपरिवार हार्दिक शुभकामनाएँ! 🌸'
    },
    {
      name: 'Govardhan Puja & Diwali',
      hindi: 'दीपावली एवं श्री गिरिराज गोवर्धन अन्नकूट पूजा',
      templateName: 'iskcon_diwali_govardhan_hi',
      preview: 'हरे कृष्ण {{name}} जी 🙏 शुभ दीपावली एवं श्री गिरिराज गोवर्धन अन्नकूट पूजा के दिव्य पावन पर्व पर इस्कॉन शिरपुर की ओर से आपको व आपके परिवार को हार्दिक मंगलकामनाएँ! 🪔✨'
    },
    {
      name: 'Sri Rama Navami',
      hindi: 'श्री राम नवमी प्राकट्योत्सव',
      templateName: 'iskcon_ram_navami_blessing_hi',
      preview: 'हरे कृष्ण {{name}} जी 🙏 मर्यादा पुरुषोत्तम प्रभु श्री रामचंद्र जी के पावन अवतरण दिवस "श्री राम नवमी" के पावन पर्व पर आपको एवं आपके परिवार को हार्दिक शुभकामनाएँ! 🏹'
    },
    {
      name: 'Nrisimha Chaturdashi',
      hindi: 'श्री नृसिंह चतुर्दशी (भगवान नृसिंह प्राकट्योत्सव)',
      templateName: 'iskcon_nrisimha_chaturdashi_hi',
      preview: 'हरे कृष्ण {{name}} जी 🙏 भक्तवत्सल भगवान श्री नृसिंह देव के प्राकट्य दिवस "श्री नृसिंह चतुर्दशी" के महापर्व पर आपको हार्दिक शुभकामनाएँ! 🦁'
    },
    {
      name: 'Gita Jayanti & Mokshada Ekadashi',
      hindi: 'गीता जयंती एवं मोक्षदा एकादशी',
      templateName: 'iskcon_gita_jayanti_blessing_hi',
      preview: 'हरे कृष्ण {{name}} जी 🙏 श्रीमद्भगवद्गीता के दिव्य प्राकट्य दिवस "गीता जयंती" एवं मोक्षदा एकादशी की आपको सपरिवार पावन बधाई! 📖🪷'
    },
    {
      name: 'Sri Jagannath Ratha Yatra',
      hindi: 'श्री जगन्नाथ रथ यात्रा महोत्सव',
      templateName: 'iskcon_ratha_yatra_blessing_hi',
      preview: 'हरे कृष्ण {{name}} जी 🙏 विश्व प्रसिद्ध श्री जगन्नाथ रथ यात्रा के पावन एवं अलौकिक अवसर पर इस्कॉन शिरपुर की ओर से आपको हार्दिक शुभकामनाएँ! 🏵️🛞'
    }
  ];

  if (user?.role !== 'ADMIN') {
    return <div className="p-8 text-center text-red-500 font-bold">Access Denied: Admins Only</div>;
  }

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings((prev: any) => ({ ...prev, ...res.data }));
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
      alert('System Settings saved successfully!');
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWhatsApp = async () => {
    setTestingWa(true);
    setTestResult(null);
    try {
      const res = await api.post('/whatsapp/test-connection', { testPhone });
      setTestResult({ success: true, data: res.data });
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.response?.data?.error || error.message || 'Test failed'
      });
    } finally {
      setTestingWa(false);
    }
  };

  if (loading) return <div className="p-16 text-center text-slate-500">Loading Configuration...</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 flex items-center gap-2.5">
            <SettingsIcon size={24} className="text-saffron-500" />
            System & Meta WhatsApp Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage ISKCON Shirpur identity, Meta Cloud API credentials, Supabase database, and 15-minute sync.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-5 py-2.5 saffron-gradient hover:opacity-95 text-white text-xs font-semibold rounded-xl shadow-md shadow-orange-500/20 disabled:opacity-70 transition-all"
        >
          <Save size={16} className="mr-2" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Organization Identity */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Globe size={18} className="text-blue-500" />
            Temple & Devotional Identity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Organization Name</label>
              <input
                type="text"
                name="ORG_NAME"
                value={settings.ORG_NAME || ''}
                onChange={handleChange}
                className="w-full text-sm rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Primary Deity Reference</label>
              <input
                type="text"
                name="ORG_DEITY"
                value={settings.ORG_DEITY || ''}
                onChange={handleChange}
                className="w-full text-sm rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
              />
            </div>
          </div>
        </div>

        {/* Meta WhatsApp Cloud API Configuration */}
        <div className="glass-panel rounded-2xl p-6 border-2 border-emerald-500/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={18} className="text-emerald-600" />
              Meta WhatsApp Business Cloud API (Official)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Graph API v20.0
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-5">
            Configure your Meta for Developers credentials for automated WhatsApp birthday wishes & donation receipts.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Operation Mode</label>
                <select
                  name="WHATSAPP_MODE"
                  value={settings.WHATSAPP_MODE || 'mock'}
                  onChange={handleChange}
                  className="w-full text-xs rounded-xl border border-slate-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="mock">Mock Simulator (Safe Local Testing without API Key)</option>
                  <option value="production">Production Live (Sends Real Messages via Meta)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">WhatsApp Phone Number ID</label>
                <input
                  type="text"
                  placeholder="e.g. 104859628172648"
                  name="META_PHONE_NUMBER_ID"
                  value={settings.META_PHONE_NUMBER_ID || ''}
                  onChange={handleChange}
                  className="w-full text-xs font-mono rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Permanent Meta Access Token</label>
              <input
                type="password"
                placeholder="EAA..."
                name="META_ACCESS_TOKEN"
                value={settings.META_ACCESS_TOKEN || ''}
                onChange={handleChange}
                className="w-full text-xs font-mono rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">Obtained from Meta App Dashboard &rarr; WhatsApp &rarr; API Setup</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Birthday HSM Template Name</label>
                <input
                  type="text"
                  name="META_BIRTHDAY_TEMPLATE"
                  value={settings.META_BIRTHDAY_TEMPLATE || ''}
                  onChange={handleChange}
                  className="w-full text-xs rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Donation Receipt Template Name</label>
                <input
                  type="text"
                  name="META_RECEIPT_TEMPLATE"
                  value={settings.META_RECEIPT_TEMPLATE || ''}
                  onChange={handleChange}
                  className="w-full text-xs rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Diagnostic Test Tool */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Recipient Mobile (e.g. 9822011111)"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="text-xs rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-60"
                />
                <button
                  type="button"
                  onClick={handleTestWhatsApp}
                  disabled={testingWa}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 whitespace-nowrap shadow-sm disabled:opacity-50"
                >
                  <Send size={13} />
                  {testingWa ? 'Testing...' : 'Send Test WhatsApp'}
                </button>
              </div>

              {testResult && (
                <div className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {testResult.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  <span>{testResult.success ? 'Dispatch verified successfully!' : testResult.error}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Automated Workflows */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
            <RefreshCw size={18} className="text-amber-500" />
            Automated Schedules & Background Jobs
          </h2>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-3">
              <input
                type="checkbox"
                id="ENABLE_FAMILY_MEMBER_MESSAGES"
                name="ENABLE_FAMILY_MEMBER_MESSAGES"
                checked={settings.ENABLE_FAMILY_MEMBER_MESSAGES !== 'false'}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 text-saffron-600 focus:ring-saffron-500 border-slate-300 rounded cursor-pointer"
              />
              <div>
                <label htmlFor="ENABLE_FAMILY_MEMBER_MESSAGES" className="text-xs font-bold text-slate-900 cursor-pointer flex items-center gap-1.5">
                  <span>Send Automated Wishes & Greetings to Devotee Family Members</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${settings.ENABLE_FAMILY_MEMBER_MESSAGES !== 'false' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                    {settings.ENABLE_FAMILY_MEMBER_MESSAGES !== 'false' ? 'Active' : 'Disabled'}
                  </span>
                </label>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  When enabled, registered family members with active phone numbers also receive individual birthday wishes and festival greetings with their personalized name. When disabled, automated wishes are sent strictly to the primary devotee/donor.
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="AUTO_WHATSAPP_ENABLED"
                name="AUTO_WHATSAPP_ENABLED"
                checked={settings.AUTO_WHATSAPP_ENABLED === 'true'}
                onChange={handleChange}
                className="h-4 w-4 text-saffron-600 focus:ring-saffron-500 border-slate-300 rounded"
              />
              <label htmlFor="AUTO_WHATSAPP_ENABLED" className="ml-2.5 text-xs font-semibold text-slate-800">
                Enable Automated Birthday WhatsApp Greetings (Daily 08:00 AM IST)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="AUTO_RECEIPT_ENABLED"
                name="AUTO_RECEIPT_ENABLED"
                checked={settings.AUTO_RECEIPT_ENABLED === 'true'}
                onChange={handleChange}
                className="h-4 w-4 text-saffron-600 focus:ring-saffron-500 border-slate-300 rounded"
              />
              <label htmlFor="AUTO_RECEIPT_ENABLED" className="ml-2.5 text-xs font-semibold text-slate-800">
                Enable Instant WhatsApp Seva Receipts upon recording donation
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="AUTO_SMS_ENABLED"
                name="AUTO_SMS_ENABLED"
                checked={settings.AUTO_SMS_ENABLED === 'true'}
                onChange={handleChange}
                className="h-4 w-4 text-saffron-600 focus:ring-saffron-500 border-slate-300 rounded"
              />
              <label htmlFor="AUTO_SMS_ENABLED" className="ml-2.5 text-xs font-semibold text-slate-800">
                Enable Fallback SMS Gateway for non-WhatsApp devotees
              </label>
            </div>
          </div>
        </div>

        {/* Major Hindu & ISKCON Festival Templates Catalog */}
        <div className="glass-panel rounded-2xl p-6 border border-saffron-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={18} className="text-saffron-600" />
                Major Hindu & ISKCON Festival Meta WhatsApp Templates
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pre-configured temple blessing templates formatted for Meta WhatsApp Cloud API with dynamic <code className="text-saffron-700 bg-saffron-50 px-1 py-0.5 rounded font-mono font-bold">&#123;&#123;name&#125;&#125;</code> variable substitution.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowFestivalsCatalog(!showFestivalsCatalog)}
              className="text-xs font-semibold text-saffron-700 hover:text-saffron-800 bg-saffron-50 px-3 py-1.5 rounded-lg border border-saffron-200"
            >
              {showFestivalsCatalog ? 'Collapse List' : `View All (${festivalTemplatesList.length}) Festivals`}
            </button>
          </div>

          {showFestivalsCatalog && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-3 border-t border-slate-100">
              {festivalTemplatesList.map((fest) => (
                <div key={fest.templateName} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{fest.hindi}</h4>
                      <p className="text-[10px] text-slate-500">{fest.name}</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      {fest.templateName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-hindi bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/80 leading-relaxed">
                    {fest.preview}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Infrastructure Health Status */}
        <div className="glass-panel rounded-2xl p-6 bg-slate-50/60">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Server size={18} className="text-purple-600" />
            Deployment & Database Health
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-700">Supabase (PostgreSQL)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Prisma client wired for pooled port 6543</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-700">Render 15-Min Sync</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Runs */15 * * * * & Keep-Alive endpoint</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-700">Meta Cloud API</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                  v20.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Supports templates & webhook delivery</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
