import { useState } from 'react';
import api from '../services/api';
import { MessageSquare, Send, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  donor: {
    id: string;
    fullName: string;
    mobile?: string;
    stage?: string;
  };
  onSuccess?: () => void;
}

export default function WhatsAppModal({ isOpen, onClose, donor, onSuccess }: WhatsAppModalProps) {
  const [mode, setMode] = useState<'text' | 'template'>('text');
  const [message, setMessage] = useState(
    `प्रिय ${donor?.fullName?.split(' ')[0] || ''} जी,\n\nहरे कृष्ण! 🙏\n\nश्री श्री राधा गोपीनाथ जी की कृपा से आपका जीवन सदैव भक्तिमय एवं आनंदमय रहे।\n\n- इस्कॉन शिरपुर (ISKCON Shirpur)`
  );
  const [templateName, setTemplateName] = useState('iskcon_birthday_blessing_hi');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donor.mobile) {
      setStatusMessage({ type: 'error', text: 'Donor does not have a mobile number recorded.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      if (mode === 'text') {
        const res = await api.post('/whatsapp/send-text', {
          phone: donor.mobile,
          message,
          donorId: donor.id
        });
        if (res.data.success) {
          setStatusMessage({
            type: 'success',
            text: res.data.isMock
              ? 'Message sent via Mock Simulator (Configure Meta Token in Settings for live WhatsApp)'
              : 'Message dispatched successfully via Meta WhatsApp Cloud API!'
          });
          if (onSuccess) onSuccess();
        } else {
          setStatusMessage({ type: 'error', text: res.data.error || 'Failed to dispatch WhatsApp message' });
        }
      } else {
        const res = await api.post('/whatsapp/send-template', {
          phone: donor.mobile,
          templateName,
          language: 'hi',
          donorId: donor.id
        });
        if (res.data.success) {
          setStatusMessage({
            type: 'success',
            text: res.data.isMock
              ? 'Template sent via Mock Simulator'
              : 'Template dispatched successfully via Meta WhatsApp Cloud API!'
          });
          if (onSuccess) onSuccess();
        } else {
          setStatusMessage({ type: 'error', text: res.data.error || 'Failed to dispatch template' });
        }
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.error || err.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-panel-elevated rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-white/80">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Meta WhatsApp Direct Dispatch
              </h3>
              <p className="text-xs text-slate-500">
                To: <span className="font-semibold text-slate-800">{donor.fullName}</span> ({donor.mobile || 'No Mobile'})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Message Type Toggle */}
        <div className="flex gap-2 my-4 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'text' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Custom Text Message
          </button>
          <button
            type="button"
            onClick={() => setMode('template')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'template' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Official Meta HSM Template
          </button>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          {mode === 'text' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                WhatsApp Message (Hindi / English)
              </label>
              <textarea
                rows={6}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-200 py-2.5 px-3.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Supports emojis (🙏, 🪷) and devotional formatting.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Registered Template Name
              </label>
              <select
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-200 py-2.5 px-3.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="iskcon_birthday_blessing_hi">iskcon_birthday_blessing_hi (Birthday Blessing)</option>
                <option value="iskcon_seva_receipt_hi">iskcon_seva_receipt_hi (Donation Seva Receipt)</option>
                <option value="iskcon_festival_invite_hi">iskcon_festival_invite_hi (Festival Invitation)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Pre-approved by Meta for business-initiated WhatsApp delivery.
              </p>
            </div>
          )}

          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading || !donor.mobile}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <Send size={15} />
              {loading ? 'Dispatching...' : 'Send WhatsApp Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
