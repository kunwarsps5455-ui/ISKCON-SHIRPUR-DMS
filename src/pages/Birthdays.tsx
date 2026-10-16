import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Cake, Sparkles, RefreshCw, Send, CheckCircle2, Baby, CalendarCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function Birthdays() {
  const { user } = useAuth();
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [festivals, setFestivals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'TODAY' | 'FESTIVALS' | 'MESSAGES'>('TODAY');

  // Global Automation Toggles
  const [familyMessagingEnabled, setFamilyMessagingEnabled] = useState(true);
  const [autoFestivalEnabled, setAutoFestivalEnabled] = useState(true);
  const [messagingTime, setMessagingTime] = useState('08:00');
  const [togglingFamily, setTogglingFamily] = useState(false);
  const [togglingAutoFestival, setTogglingAutoFestival] = useState(false);

  // Festival Broadcast & Schedule State
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [includeFamilyInBroadcast, setIncludeFamilyInBroadcast] = useState(true);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);
  const [savingScheduleId, setSavingScheduleId] = useState<string | null>(null);
  const [broadcastResult, setBroadcastResult] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bdayRes, msgRes, festRes, settingsRes] = await Promise.all([
        api.get('/birthdays/today?autoSync=true'),
        api.get('/birthdays/messages'),
        api.get('/festivals/templates'),
        api.get('/settings').catch(() => ({ data: {} }))
      ]);

      setBirthdays(bdayRes.data);
      setMessages(msgRes.data);
      setFestivals(festRes.data);

      const famSetting = settingsRes.data?.ENABLE_FAMILY_MEMBER_MESSAGES;
      const isFamEnabled = famSetting !== 'false';
      setFamilyMessagingEnabled(isFamEnabled);
      setIncludeFamilyInBroadcast(isFamEnabled);

      const festAutoSetting = settingsRes.data?.AUTO_FESTIVAL_ENABLED;
      setAutoFestivalEnabled(festAutoSetting !== 'false');

      if (settingsRes.data?.MESSAGING_TIME) {
        setMessagingTime(settingsRes.data.MESSAGING_TIME);
      }
    } catch (error) {
      console.error('Failed to fetch birthday and festival data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleGlobalFamily = async () => {
    setTogglingFamily(true);
    const newStatus = !familyMessagingEnabled;
    try {
      await api.put('/settings', {
        ENABLE_FAMILY_MEMBER_MESSAGES: newStatus ? 'true' : 'false'
      });
      setFamilyMessagingEnabled(newStatus);
      setIncludeFamilyInBroadcast(newStatus);
    } catch (error) {
      alert('Failed to update family messaging setting');
    } finally {
      setTogglingFamily(false);
    }
  };

  const handleToggleGlobalAutoFestival = async () => {
    setTogglingAutoFestival(true);
    const newStatus = !autoFestivalEnabled;
    try {
      await api.put('/settings', {
        AUTO_FESTIVAL_ENABLED: newStatus ? 'true' : 'false'
      });
      setAutoFestivalEnabled(newStatus);
      fetchData();
    } catch (error) {
      alert('Failed to update automated festival setting');
    } finally {
      setTogglingAutoFestival(false);
    }
  };

  const handleUpdateFestivalSchedule = async (
    festivalId: string,
    updates: { scheduledDate?: string; autoSendEnabled?: boolean }
  ) => {
    setSavingScheduleId(festivalId);
    try {
      const res = await api.put(`/festivals/${festivalId}/schedule`, updates);
      if (res.data?.autoCheckResult?.festivalsTriggered?.length > 0) {
        const triggered = res.data.autoCheckResult.festivalsTriggered[0];
        setBroadcastResult({
          message: `Auto-Pilot automatically dispatched ${triggered.festivalName} blessings!`,
          dispatchedToDonors: triggered.dispatchedToDonors,
          dispatchedToFamily: triggered.dispatchedToFamily,
          familyIncluded: triggered.familyIncluded,
          failures: triggered.failures
        });
      }
      await fetchData();
    } catch (error) {
      alert('Failed to update festival auto-schedule');
    } finally {
      setSavingScheduleId(null);
    }
  };

  const handleTriggerRun = async () => {
    try {
      const [bdayRun, festRun] = await Promise.all([
        api.post('/birthdays/trigger-run'),
        api.post('/festivals/trigger-auto-check')
      ]);
      const sentCount = bdayRun.data?.sent || 0;
      const skippedCount = bdayRun.data?.skipped || 0;
      const festTriggered = festRun.data?.festivalsTriggered?.length || 0;
      alert(
        `Automated Sync Complete!\n• Birthdays Auto-Sent Now: ${sentCount} (${skippedCount} already sent today)\n• Scheduled Festivals Triggered Today: ${festTriggered}`
      );
      fetchData();
    } catch (error) {
      alert('Failed to trigger automated check');
    }
  };

  const handleBroadcastFestival = async (festival: any) => {
    const confirmMsg = `Manual Override: Immediately broadcast ${festival.hindiName} (${festival.name}) blessings to ${selectedCategory === 'ALL' ? 'ALL active devotees' : selectedCategory + ' devotees'}${includeFamilyInBroadcast && familyMessagingEnabled ? ' AND their permitted family members' : ' (EXCLUDING family members)'} via Meta WhatsApp API?`;
    if (!confirm(confirmMsg)) return;

    setBroadcastingId(festival.id);
    setBroadcastResult(null);

    try {
      const res = await api.post('/festivals/broadcast', {
        festivalId: festival.id,
        includeFamilyMembers: includeFamilyInBroadcast,
        donorCategoryFilter: selectedCategory
      });
      setBroadcastResult(res.data);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to dispatch festival broadcast');
    } finally {
      setBroadcastingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FAILED':
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'QUEUED':
      case 'PENDING':
      case 'SCHEDULED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-temple-900 flex items-center font-serif">
            <Sparkles size={24} className="mr-3 text-saffron-500" />
            Automated Birthdays & Major Hindu Festivals
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            100% hands-free WhatsApp blessings sent automatically to Donors & Permitted Family Members on Birthdays and Scheduled Hindu Festivals.
          </p>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Family Member Master Switch */}
            <div className="flex items-center bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-xs font-semibold text-gray-600 mr-2 flex items-center">
                <Baby size={14} className="mr-1 text-saffron-600" />
                Family Auto-Wishes:
              </span>
              <button
                onClick={handleToggleGlobalFamily}
                disabled={togglingFamily}
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-all border ${
                  familyMessagingEnabled
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                }`}
                title="Master switch: automatically send birthday & festival WhatsApp messages to permitted family members"
              >
                {familyMessagingEnabled ? '✓ Auto-Enabled' : '✕ Disabled'}
              </button>
            </div>

            {/* Festival Auto-Pilot Switch */}
            <div className="flex items-center bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-xs font-semibold text-gray-600 mr-2 flex items-center">
                <CalendarCheck size={14} className="mr-1 text-saffron-600" />
                Festival Auto-Pilot:
              </span>
              <button
                onClick={handleToggleGlobalAutoFestival}
                disabled={togglingAutoFestival}
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-all border ${
                  autoFestivalEnabled
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                }`}
                title="Automatically send festival WhatsApp templates on each festival's scheduled date"
              >
                {autoFestivalEnabled ? '✓ Auto-Enabled' : '✕ Disabled'}
              </button>
            </div>

            <button
              onClick={handleTriggerRun}
              className="flex items-center px-3.5 py-2 bg-temple-900 hover:bg-temple-800 text-white rounded-xl transition-colors shadow-sm text-xs font-semibold"
              title="Force an immediate check of today's birthdays and scheduled festivals (respects zero-duplicate safety)"
            >
              <RefreshCw size={14} className="mr-1.5" />
              Sync Auto-Queue Now
            </button>
          </div>
        )}
      </div>

      {/* Zero-Touch Automation Status Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-amber-50/60 to-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Zero-Touch WhatsApp Auto-Pilot is Running Automatically
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                No Manual Sending Required
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              • <strong>Birthdays:</strong> Automatically dispatches template <code className="font-mono text-emerald-800">iskcon_birthday_blessing_hi</code> daily at <strong>{messagingTime}</strong> (and every 15 mins) to all active Donors {familyMessagingEnabled ? 'and Permitted Family Members' : '(Family Members currently disabled)'} whose DOB is today.<br />
              • <strong>Major Hindu Festivals:</strong> Automatically dispatches each festival&apos;s pre-approved Meta WhatsApp template to all active Donors {familyMessagingEnabled ? 'and Permitted Family Members' : ''} on the festival&apos;s scheduled calendar date below.
            </p>
          </div>
        </div>
      </div>

      {/* Broadcast Result Banner */}
      {broadcastResult && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <CheckCircle2 size={20} className="text-emerald-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold">{broadcastResult.message}</h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                Delivered to <strong>{broadcastResult.dispatchedToDonors}</strong> primary devotees
                {broadcastResult.familyIncluded ? ` and ${broadcastResult.dispatchedToFamily} registered family members` : ' (family members excluded)'}.
                {broadcastResult.failures > 0 && ` (${broadcastResult.failures} skipped / no mobile)`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setBroadcastResult(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-2 bg-white p-1 rounded-xl shadow-xs border border-gray-100 w-fit">
        <button
          onClick={() => setActiveTab('TODAY')}
          className={`flex items-center px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'TODAY' ? 'bg-saffron-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Cake size={14} className="mr-2" />
          Today&apos;s Auto-Birthdays ({birthdays.length})
        </button>
        <button
          onClick={() => setActiveTab('FESTIVALS')}
          className={`flex items-center px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'FESTIVALS' ? 'bg-saffron-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Sparkles size={14} className="mr-2" />
          Major Hindu Festivals Schedule ({festivals.length})
        </button>
        <button
          onClick={() => setActiveTab('MESSAGES')}
          className={`flex items-center px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'MESSAGES' ? 'bg-saffron-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Automated Message Log ({messages.length})
        </button>
      </div>

      {/* TAB CONTENT */}
      {loading ? (
        <div className="p-16 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
          <RefreshCw size={24} className="animate-spin mx-auto text-saffron-600 mb-2" />
          Loading automated schedule...
        </div>
      ) : activeTab === 'TODAY' ? (
        /* TODAY'S BIRTHDAYS */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devotee Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auto-Pilot Delivery Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {birthdays.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No devotee or family birthdays today. When a birthday occurs, WhatsApp blessings are dispatched automatically at {messagingTime}.
                    </td>
                  </tr>
                ) : (
                  birthdays.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{b.fullName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {b.type === 'DONOR' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Primary Devotee
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            Family ({b.relationship}{b.donorName ? ` of ${b.donorName}` : ''})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{format(new Date(b.dob), 'dd MMM yyyy')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.mobile || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${b.whatsappPermission !== 'NOT_ALLOWED' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                          {b.whatsappPermission !== 'NOT_ALLOWED' ? '✓ Permitted' : '✕ Opted Out'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {b.autoDeliveryStatus === 'SENT' || b.autoDeliveryStatus === 'DELIVERED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 size={13} />
                            Auto-Sent via WhatsApp {b.autoSentAt ? `(${format(new Date(b.autoSentAt), 'HH:mm')})` : ''}
                          </span>
                        ) : b.whatsappPermission === 'NOT_ALLOWED' || (b.type === 'FAMILY_MEMBER' && !familyMessagingEnabled) ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            Skipped (Permission Disabled)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            ⏰ Auto-Scheduled ({messagingTime})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'FESTIVALS' ? (
        /* MAJOR HINDU & ISKCON FESTIVALS AUTO-SCHEDULE & BROADCAST */
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <span className="text-xs font-semibold text-gray-700 uppercase">Target Devotees:</span>
              <div className="flex items-center space-x-1 bg-gray-50 p-1 rounded-lg border border-gray-200 text-xs">
                {['ALL', 'PLATINUM', 'GOLD', 'SILVER', 'SUDAMA'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-md transition-all font-medium ${
                      selectedCategory === cat
                        ? 'bg-saffron-600 text-white shadow-xs font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Devotees' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-amber-50/70 px-3.5 py-2 rounded-xl border border-amber-200/80">
              <input
                type="checkbox"
                id="includeFamilyInBroadcast"
                checked={includeFamilyInBroadcast && familyMessagingEnabled}
                disabled={!familyMessagingEnabled}
                onChange={(e) => setIncludeFamilyInBroadcast(e.target.checked)}
                className="h-4 w-4 text-saffron-600 focus:ring-saffron-500 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="includeFamilyInBroadcast" className="text-xs font-bold text-gray-800 cursor-pointer flex items-center">
                <Baby size={13} className="mr-1 text-saffron-600" />
                Include Permitted Family Members ({familyMessagingEnabled ? 'Auto-Enabled' : 'Disabled in Global Switch'})
              </label>
            </div>
          </div>

          {/* Festival Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {festivals.map((fest) => {
              const isBroadcasting = broadcastingId === fest.id;
              const isSavingSchedule = savingScheduleId === fest.id;
              const isAutoActive = fest.autoSendEnabled !== false && autoFestivalEnabled;

              return (
                <div key={fest.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-temple-900 font-serif flex items-center">
                          <Sparkles size={16} className="text-saffron-500 mr-2 shrink-0" />
                          {fest.hindiName}
                        </h3>
                        <p className="text-xs text-gray-500">{fest.name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          {fest.templateName}
                        </span>
                        {fest.autoSentAt && (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                            ✓ Auto-Sent ({format(new Date(fest.autoSentAt), 'dd MMM')})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Automatic Festival Date Scheduler Row */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <CalendarCheck size={15} className={isAutoActive ? 'text-emerald-600' : 'text-slate-400'} />
                        <span className="font-semibold text-slate-700">Auto-Send Date:</span>
                        <input
                          type="date"
                          value={fest.scheduledDate || fest.defaultDate || ''}
                          disabled={user?.role !== 'ADMIN' || isSavingSchedule}
                          onChange={(e) =>
                            handleUpdateFestivalSchedule(fest.id, { scheduledDate: e.target.value })
                          }
                          className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-saffron-500"
                        />
                      </div>

                      {user?.role === 'ADMIN' ? (
                        <button
                          onClick={() =>
                            handleUpdateFestivalSchedule(fest.id, {
                              autoSendEnabled: !fest.autoSendEnabled
                            })
                          }
                          disabled={isSavingSchedule}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                            isAutoActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                          }`}
                          title="Toggle automatic WhatsApp broadcast on this festival date"
                        >
                          {isAutoActive ? '✓ Auto-Send ON' : '✕ Auto-Send OFF'}
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700">
                          {isAutoActive ? '✓ Auto-Send ON' : 'Paused'}
                        </span>
                      )}
                    </div>

                    <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/60 text-xs text-gray-800 font-hindi leading-relaxed">
                      <div className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider mb-1 font-sans">
                        Automated WhatsApp Template Preview (&#123;&#123;1&#125;&#125; = Devotee / Family Member Name):
                      </div>
                      <p className="whitespace-pre-line text-slate-800">
                        {fest.defaultMessage.replace('{{name}}', 'रमेश')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-gray-500">
                      Automatically dispatches on <strong>{fest.scheduledDate || fest.defaultDate}</strong> at {messagingTime}
                    </span>
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => handleBroadcastFestival(fest)}
                        disabled={isBroadcasting}
                        className="inline-flex items-center px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-all"
                        title="Optional manual override to send this festival greeting right now"
                      >
                        <Send size={12} className="mr-1.5" />
                        {isBroadcasting ? 'Sending...' : 'Send Now (Manual)'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* MESSAGE HISTORY */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Channel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message Content</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {messages.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No message history recorded yet.</td></tr>
                ) : (
                  messages.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(m.createdAt), 'dd MMM yyyy, HH:mm')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{m.recipient}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-gray-500">{m.channel || 'WHATSAPP'}</td>
                      <td className="px-6 py-4 text-xs text-gray-600 max-w-sm truncate">{m.message}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(m.status)}`}>
                          {m.status}
                        </span>
                        {m.failureReason && <p className="text-xs text-red-500 mt-1">{m.failureReason}</p>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
