import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import WhatsAppModal from '../components/WhatsAppModal';
import {
  ArrowLeft,
  Edit,
  Plus,
  Trash2,
  HeartHandshake,
  Baby,
  History,
  MessageSquare,
  PhoneCall,
  CalendarCheck,
  ShieldCheck,
  Send,
  X
} from 'lucide-react';
import { format } from 'date-fns';

export default function DonorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [donor, setDonor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'donations' | 'crm' | 'family' | 'tasks'>('donations');

  // Modals state
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);

  // New Donation Modal State
  const [donationAmount, setDonationAmount] = useState('');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [donationPurpose, setDonationPurpose] = useState('Temple Deity Seva & Annadanam');

  // Interactions and Tasks State
  const [interactions, setInteractions] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newInteraction, setNewInteraction] = useState({
    type: 'PHONE_CALL',
    subject: '',
    notes: '',
    outcome: '',
  });

  // Edit Donor State
  const [editForm, setEditForm] = useState({
    fullName: '',
    mobile: '',
    email: '',
    dob: '',
    gender: 'Male',
    address: '',
    city: '',
    state: '',
    pincode: '',
    notes: '',
    whatsappPermission: 'ALLOWED',
    smsPermission: 'ALLOWED'
  });

  // Add Family Member State
  const [familyForm, setFamilyForm] = useState({
    fullName: '',
    relationship: 'Spouse',
    dob: '',
    mobile: '',
    email: '',
    whatsappPermission: 'ALLOWED',
    notes: ''
  });

  useEffect(() => {
    fetchDonor();
    fetchCrmDetails();
  }, [id]);

  const fetchDonor = async () => {
    try {
      const res = await api.get(`/donors/${id}`);
      setDonor(res.data);
      if (res.data) {
        setEditForm({
          fullName: res.data.fullName || '',
          mobile: res.data.mobile || '',
          email: res.data.email || '',
          dob: res.data.dob ? res.data.dob.split('T')[0] : '',
          gender: res.data.gender || 'Male',
          address: res.data.address || '',
          city: res.data.city || '',
          state: res.data.state || '',
          pincode: res.data.pincode || '',
          notes: res.data.notes || '',
          whatsappPermission: res.data.whatsappPermission || 'ALLOWED',
          smsPermission: res.data.smsPermission || 'ALLOWED'
        });
      }
    } catch (error) {
      console.error("Failed to fetch donor");
    } finally {
      setLoading(false);
    }
  };

  const fetchCrmDetails = async () => {
    try {
      const [interRes, taskRes] = await Promise.all([
        api.get(`/crm/interactions/donor/${id}`),
        api.get(`/crm/tasks?donorId=${id}`)
      ]);
      setInteractions(interRes.data || []);
      setTasks(taskRes.data || []);
    } catch (err) {
      console.error("Failed to fetch CRM details for donor:", err);
    }
  };

  const handleAddDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/donations/donor/${id}`, {
        amount: parseFloat(donationAmount),
        donationDate,
        paymentMethod,
        purpose: donationPurpose,
        sendReceiptNow: true
      });
      setShowDonationModal(false);
      setDonationAmount('');
      fetchDonor();
      fetchCrmDetails();
      alert("Donation recorded! Automated WhatsApp receipt dispatched.");
    } catch (error) {
      alert("Failed to add donation");
    }
  };

  const handleLogInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/crm/interactions/donor/${id}`, newInteraction);
      setShowInteractionModal(false);
      setNewInteraction({ type: 'PHONE_CALL', subject: '', notes: '', outcome: '' });
      fetchCrmDetails();
    } catch (err) {
      alert("Failed to log interaction");
    }
  };

  const handleUpdateDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/donors/${id}`, editForm);
      setShowEditModal(false);
      fetchDonor();
      alert("Devotee details updated successfully!");
    } catch (err) {
      alert("Failed to update devotee details");
    }
  };

  const handleAddFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/family/donor/${id}`, familyForm);
      setShowFamilyModal(false);
      setFamilyForm({
        fullName: '',
        relationship: 'Spouse',
        dob: '',
        mobile: '',
        email: '',
        whatsappPermission: 'ALLOWED',
        notes: ''
      });
      fetchDonor();
      alert("Family member added successfully!");
    } catch (err) {
      alert("Failed to add family member");
    }
  };

  const handleStageChange = async (newStage: string) => {
    try {
      await api.patch(`/crm/donor/${id}/stage`, { stage: newStage });
      setDonor({ ...donor, stage: newStage });
    } catch (err) {
      alert("Failed to update stage");
    }
  };

  const handleSendReceipt = async (donationId: string) => {
    try {
      await api.post(`/donations/${donationId}/send-receipt`);
      alert("WhatsApp Seva Receipt dispatched to donor's mobile!");
      fetchDonor();
    } catch (err) {
      alert("Failed to dispatch receipt");
    }
  };

  const handleToggleFamilyPermission = async (famId: string, currentPerm: string) => {
    const newPerm = currentPerm === 'NOT_ALLOWED' ? 'ALLOWED' : 'NOT_ALLOWED';
    try {
      await api.patch(`/family/${famId}/messaging-permission`, { whatsappPermission: newPerm });
      fetchDonor();
    } catch (err) {
      alert("Failed to update family member WhatsApp permission");
    }
  };

  const handleDeleteFamilyMember = async (fam: any) => {
    if (user?.role !== 'ADMIN') return;
    const confirmed = window.confirm(
      `Are you sure you want to remove family member "${fam.fullName}" (${fam.relationship})? This will stop all automated wishes for them.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/family/${fam.id}`);
      fetchDonor();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove family member');
    }
  };

  const handleDeleteDonor = async () => {
    if (!donor) return;
    const confirmed = window.confirm(
      `⚠️ PERMANENT DELETION:\n\nAre you sure you want to permanently delete devotee "${donor.fullName}" (${donor.donorId})?\n\nThis will remove their profile, family members, donations, and completely stop all automated WhatsApp messages. This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/donors/${donor.id}`);
      alert(`Devotee ${donor.fullName} has been removed. All WhatsApp messaging has ceased.`);
      navigate('/donors');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete donor');
    }
  };

  if (loading) return <div className="p-16 text-center text-slate-500 font-medium">Loading Devotee Profile...</div>;
  if (!donor) return <div className="p-16 text-center text-red-500 font-bold">Donor record not found</div>;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'LIFE_PATRON':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PATRON':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'REGULAR':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'FIRST_TIME':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Breadcrumb & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/donors" className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors">
            <ArrowLeft size={18} className="text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-heading text-slate-900">{donor.fullName}</h1>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStageBadge(donor.stage)}`}>
                {donor.stage || 'REGULAR'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Devotee ID: {donor.donorId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowWhatsAppModal(true)}
            title="Birthdays & Festivals are sent automatically. Click here only for an extra 1-on-1 custom message."
            className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <MessageSquare size={15} className="mr-1.5" />
            Custom 1-on-1 WhatsApp
          </button>
          <button
            onClick={() => setShowInteractionModal(true)}
            className="flex items-center px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <PhoneCall size={15} className="mr-1.5 text-saffron-600" />
            Log Call / Visit
          </button>
          {user?.role === 'ADMIN' && (
            <>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition-all"
                title="Edit Devotee Details"
              >
                <Edit size={14} className="mr-1 text-slate-500" />
                Edit Info
              </button>
              <button
                onClick={() => setShowDonationModal(true)}
                className="flex items-center px-4 py-2 saffron-gradient hover:opacity-95 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                <Plus size={15} className="mr-1.5" />
                Record Donation
              </button>
              <button
                onClick={handleDeleteDonor}
                className="flex items-center px-3.5 py-2 bg-white hover:bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-xl shadow-sm transition-all"
                title="Permanently Delete Devotee from Database"
              >
                <Trash2 size={14} className="mr-1 text-red-500" />
                Delete Devotee
              </button>
            </>
          )}
        </div>
      </div>

      {/* Devotee Header Glass Card */}
      <div className="glass-panel rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-saffron-500 to-amber-400 text-white text-2xl font-bold flex items-center justify-center shadow-md shadow-orange-500/20">
            {donor.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{donor.fullName}</h2>
              {user?.role === 'ADMIN' && (
                <select
                  value={donor.stage || 'REGULAR'}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white font-medium text-slate-700 focus:outline-none"
                >
                  <option value="LIFE_PATRON">Life Patron</option>
                  <option value="PATRON">Annual Patron</option>
                  <option value="REGULAR">Regular Donor</option>
                  <option value="FIRST_TIME">First Time</option>
                  <option value="PROSPECT">Prospect</option>
                  <option value="LAPSED">Lapsed</option>
                </select>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-medium border border-slate-200">
                📱 {donor.mobile || 'No Mobile'}
              </span>
              {donor.email && (
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-medium border border-slate-200">
                  ✉️ {donor.email}
                </span>
              )}
              {donor.dob && (
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-medium border border-slate-200">
                  🎂 {format(new Date(donor.dob), 'dd MMM yyyy')}
                </span>
              )}
              <span
                className={`px-2.5 py-1 rounded-lg font-semibold border flex items-center gap-1 ${
                  donor.whatsappPermission === 'NOT_ALLOWED'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                <ShieldCheck size={13} />
                {donor.whatsappPermission === 'NOT_ALLOWED' ? 'WhatsApp Opted Out' : 'Auto-Wishes Enabled (Birthdays & Festivals)'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 text-center min-w-[200px]">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Seva Contribution</p>
          <p className="text-2xl font-black text-slate-900 mt-1 font-heading">{formatCurrency(donor.totalDonation || 0)}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200/80 gap-6 text-sm font-semibold">
        {[
          { key: 'donations', label: `Donations (${donor.donations?.length || 0})`, icon: HeartHandshake },
          { key: 'crm', label: `CRM Timeline (${interactions.length})`, icon: PhoneCall },
          { key: 'family', label: `Family (${donor.familyMembers?.length || 0})`, icon: Baby },
          { key: 'tasks', label: `Follow-up Tasks (${tasks.length})`, icon: CalendarCheck },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 pb-3 transition-colors relative ${
              activeTab === tab.key
                ? 'text-saffron-600 font-bold border-b-2 border-saffron-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'donations' && (
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-heading">
              <HeartHandshake size={18} className="text-emerald-600" />
              Recorded Seva Contributions
            </h3>
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => setShowDonationModal(true)}
                className="flex items-center px-3 py-1.5 saffron-gradient text-white text-xs font-semibold rounded-lg hover:opacity-95"
              >
                <Plus size={14} className="mr-1" />
                Add Donation
              </button>
            )}
          </div>

          {donor.donations?.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <History size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No donations recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 px-4">Receipt ID</th>
                    <th className="pb-3 px-4">Purpose</th>
                    <th className="pb-3 px-4">Method</th>
                    <th className="pb-3 px-4 text-right">Amount</th>
                    <th className="pb-3 pl-4 text-right">WhatsApp Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {donor.donations.map((d: any) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 pr-4 text-slate-900 font-medium">{format(new Date(d.donationDate), 'dd MMM yyyy')}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{d.donationId}</td>
                      <td className="py-3.5 px-4 text-slate-700">{d.purpose || 'General Temple Seva'}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold text-slate-600">
                          {d.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700 text-right font-heading">
                        {formatCurrency(d.amount)}
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <button
                          onClick={() => handleSendReceipt(d.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1 ml-auto"
                        >
                          <Send size={11} />
                          {d.receiptSent ? 'Resend Receipt' : 'Send WhatsApp'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'crm' && (
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">Devotee Engagement Timeline</h3>
              <p className="text-xs text-slate-500">Chronological history of phone calls, temple visits, and communications</p>
            </div>
            <button
              onClick={() => setShowInteractionModal(true)}
              className="flex items-center px-3.5 py-2 saffron-gradient text-white text-xs font-semibold rounded-xl hover:opacity-95"
            >
              <Plus size={14} className="mr-1" />
              Log Engagement
            </button>
          </div>

          {interactions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <PhoneCall size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No engagement notes recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {interactions.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-900 text-sm">{item.subject}</span>
                    <span className="text-slate-400 font-medium">
                      {format(new Date(item.interactionDate), 'dd MMM yyyy, hh:mm a')}
                    </span>
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px] uppercase mb-2">
                    {item.type}
                  </span>
                  {item.notes && <p className="text-slate-600 leading-relaxed mb-2">{item.notes}</p>}
                  {item.outcome && (
                    <p className="text-emerald-700 font-medium bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                      Outcome: {item.outcome}
                    </p>
                  )}
                  <p className="text-slate-400 text-[10px] mt-2">Recorded by: {item.createdBy}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'family' && (
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">Family Members & Seva Anniversaries</h3>
              <p className="text-xs text-slate-500">Record family members for automated festival & birthday wishes</p>
            </div>
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => setShowFamilyModal(true)}
                className="flex items-center px-3.5 py-2 saffron-gradient text-white text-xs font-semibold rounded-xl hover:opacity-95"
              >
                <Plus size={14} className="mr-1" />
                Add Family Member
              </button>
            )}
          </div>

          {donor.familyMembers?.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Baby size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No family members listed</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {donor.familyMembers.map((fam: any) => (
                <div key={fam.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-sm text-slate-900">{fam.fullName}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={user?.role !== 'ADMIN'}
                        onClick={() => handleToggleFamilyPermission(fam.id, fam.whatsappPermission)}
                        title={user?.role === 'ADMIN' ? 'Click to toggle Automated Birthday & Festival WhatsApp Wishes' : undefined}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                          fam.whatsappPermission === 'NOT_ALLOWED'
                            ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {fam.whatsappPermission === 'NOT_ALLOWED' ? 'Auto-Wishes Opted Out' : '✓ Auto-Wishes ON (Birthdays & Festivals)'}
                      </button>
                      {user?.role === 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFamilyMember(fam)}
                          className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Remove family member"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-500">Relationship: <span className="font-semibold text-slate-700">{fam.relationship}</span></p>
                  <p className="text-slate-500">DOB: <span className="font-semibold text-slate-700">{fam.dob ? format(new Date(fam.dob), 'dd MMM yyyy') : 'Not Recorded'}</span></p>
                  <p className="text-slate-500">
                    WhatsApp Number:{' '}
                    <span className="font-semibold text-slate-700">
                      {fam.mobile || `${donor.mobile} (Donor's Mobile)`}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4 font-heading">Associated Follow-up Tasks</h3>
          {tasks.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No pending follow-ups for this devotee.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="p-3.5 rounded-xl border border-slate-200 bg-white flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{task.title}</p>
                    <p className="text-slate-500 mt-0.5">{task.description}</p>
                    <p className="text-slate-400 text-[11px] mt-1">Due: {task.dueDate ? format(new Date(task.dueDate), 'dd MMM yyyy') : 'No due date'}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${task.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        donor={donor}
        onSuccess={() => fetchCrmDetails()}
      />

      {/* Edit Devotee Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel-elevated rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-white/80 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold font-heading text-slate-900">Edit Devotee Information</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateDonor} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Mobile *</label>
                  <input
                    required
                    type="text"
                    value={editForm.mobile}
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editForm.dob}
                    onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">WhatsApp Permission</label>
                  <select
                    value={editForm.whatsappPermission}
                    onChange={(e) => setEditForm({ ...editForm, whatsappPermission: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  >
                    <option value="ALLOWED">Allowed</option>
                    <option value="NOT_ALLOWED">Not Allowed</option>
                    <option value="UNKNOWN">Unknown</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Pincode</label>
                  <input
                    type="text"
                    value={editForm.pincode}
                    onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl saffron-gradient text-white shadow-md hover:opacity-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Family Member Modal */}
      {showFamilyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel-elevated rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/80">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold font-heading text-slate-900">Add Family Member</h3>
              <button onClick={() => setShowFamilyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddFamilyMember} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Radhika Sharma"
                  value={familyForm.fullName}
                  onChange={(e) => setFamilyForm({ ...familyForm, fullName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Relationship *</label>
                  <select
                    value={familyForm.relationship}
                    onChange={(e) => setFamilyForm({ ...familyForm, relationship: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={familyForm.dob}
                    onChange={(e) => setFamilyForm({ ...familyForm, dob: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Mobile</label>
                  <input
                    type="text"
                    placeholder="9822000000"
                    value={familyForm.mobile}
                    onChange={(e) => setFamilyForm({ ...familyForm, mobile: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">WhatsApp Permission</label>
                  <select
                    value={familyForm.whatsappPermission}
                    onChange={(e) => setFamilyForm({ ...familyForm, whatsappPermission: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  >
                    <option value="ALLOWED">Allowed</option>
                    <option value="NOT_ALLOWED">Not Allowed</option>
                    <option value="UNKNOWN">Unknown</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowFamilyModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl saffron-gradient text-white shadow-md hover:opacity-95"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interaction Modal */}
      {showInteractionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel-elevated rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/80">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold font-heading text-slate-900">Log Devotee Interaction</h3>
              <button onClick={() => setShowInteractionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLogInteraction} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Type *</label>
                <select
                  value={newInteraction.type}
                  onChange={(e) => setNewInteraction({ ...newInteraction, type: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                >
                  <option value="PHONE_CALL">Phone Call</option>
                  <option value="TEMPLE_VISIT">Temple Visit / Darshan</option>
                  <option value="MEETING">Meeting / Prasadam Discussion</option>
                  <option value="WHATSAPP_CHAT">WhatsApp Communication</option>
                  <option value="PRASADAM_SEVA">Prasadam Seva Delivery</option>
                  <option value="NOTE">General Note</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Subject *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Sunday feast discussion"
                  value={newInteraction.subject}
                  onChange={(e) => setNewInteraction({ ...newInteraction, subject: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Notes / Discussion Details</label>
                <textarea
                  rows={3}
                  value={newInteraction.notes}
                  onChange={(e) => setNewInteraction({ ...newInteraction, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Outcome / Agreed Next Step</label>
                <input
                  type="text"
                  placeholder="e.g. Devotee agreed to sponsor 108 bhoga plates"
                  value={newInteraction.outcome}
                  onChange={(e) => setNewInteraction({ ...newInteraction, outcome: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowInteractionModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl saffron-gradient text-white shadow-md hover:opacity-95"
                >
                  Save Engagement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Donation Modal */}
      {showDonationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel-elevated rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/80">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold font-heading text-slate-900">Record Seva Donation</h3>
              <button onClick={() => setShowDonationModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDonation} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Amount (₹) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  className="w-full text-sm font-bold rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Date *</label>
                <input
                  required
                  type="date"
                  value={donationDate}
                  onChange={(e) => setDonationDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Seva Purpose</label>
                <input
                  type="text"
                  value={donationPurpose}
                  onChange={(e) => setDonationPurpose(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="BANK_TRANSFER">Bank NEFT/RTGS</option>
                  <option value="CASH">Cash in Temple Hundi/Office</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDonationModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                >
                  Record & Send WhatsApp Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
