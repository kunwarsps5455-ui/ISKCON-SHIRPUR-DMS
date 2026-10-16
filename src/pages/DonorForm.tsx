import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ArrowLeft, Save, HeartHandshake, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DonorForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    email: '',
    dob: '',
    gender: 'Male',
    address: '',
    city: '',
    state: '',
    pincode: '',
    stage: 'REGULAR',
    preferredChannel: 'WHATSAPP',
    whatsappPermission: 'ALLOWED',
    smsPermission: 'ALLOWED',
    notes: ''
  });

  // Optional Initial Donation State
  const [recordInitialDonation, setRecordInitialDonation] = useState(false);
  const [initialDonation, setInitialDonation] = useState({
    amount: '',
    paymentMethod: 'UPI',
    purpose: 'Temple Deity Seva & Annadanam',
    transactionRef: '',
    sendReceiptNow: true
  });

  const quickAmounts = [500, 1100, 2100, 5100, 11000, 21000, 51000];

  if (user?.role !== 'ADMIN') {
    return <div className="text-red-500 p-8">You do not have permission to access this page.</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDonationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setInitialDonation({ ...initialDonation, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const payload: any = { ...formData };
      if (recordInitialDonation && initialDonation.amount && parseFloat(initialDonation.amount) > 0) {
        payload.initialAmount = initialDonation.amount;
        payload.initialPaymentMethod = initialDonation.paymentMethod;
        payload.initialPurpose = initialDonation.purpose;
        payload.initialTransactionRef = initialDonation.transactionRef;
        payload.sendReceiptNow = initialDonation.sendReceiptNow;
      }

      const res = await api.post('/donors', payload);
      navigate(`/donors/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save donor');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/donors" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-temple-900 font-serif">Add New Devotee / Donor</h1>
          <p className="text-sm text-gray-500">Register a new devotee in the system and optionally record their initial seva contribution.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <h3 className="text-lg font-medium text-temple-900 border-b pb-2">Personal Information</h3>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name *</label>
            <input required type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="e.g. Radheshyam Das" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Mobile Number *</label>
            <input required type="text" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="e.g. 9822012345" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="e.g. devotee@iskcon.org" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <select name="gender" value={formData.gender} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm">
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="col-span-2 mt-2">
            <h3 className="text-lg font-medium text-temple-900 border-b pb-2">Address</h3>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Address Line</label>
            <input type="text" name="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="Shirpur" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">State</label>
            <input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="Maharashtra" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Pincode</label>
            <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} placeholder="425405" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>

          <div className="col-span-2 mt-2">
            <h3 className="text-lg font-medium text-temple-900 border-b pb-2">CRM & Communication Preferences</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Devotee Stage</label>
            <select name="stage" value={formData.stage} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm">
              <option value="PROSPECT">Prospect (New Devotee)</option>
              <option value="FIRST_TIME">First Time Donor</option>
              <option value="REGULAR">Regular Donor</option>
              <option value="PATRON">Patron</option>
              <option value="LIFE_PATRON">Life Patron</option>
              <option value="LAPSED">Lapsed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Preferred Channel</label>
            <select name="preferredChannel" value={formData.preferredChannel} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm">
              <option value="WHATSAPP">WhatsApp</option>
              <option value="SMS">SMS</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">WhatsApp Notification Permission</label>
            <select name="whatsappPermission" value={formData.whatsappPermission} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm">
              <option value="ALLOWED">Allowed (Direct Receipts & Seva Updates)</option>
              <option value="NOT_ALLOWED">Not Allowed</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">SMS Notification Permission</label>
            <select name="smsPermission" value={formData.smsPermission} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm">
              <option value="ALLOWED">Allowed</option>
              <option value="NOT_ALLOWED">Not Allowed</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Internal Devotee Notes</label>
            <textarea name="notes" rows={2} value={formData.notes} onChange={handleChange} placeholder="e.g. Interested in Sunday Feast preaching and Book Distribution" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>

          {/* INITIAL DONATION SECTION */}
          <div className="col-span-2 mt-4 bg-amber-50/60 border border-amber-200/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-saffron-100 flex items-center justify-center text-saffron-700 shadow-xs">
                  <HeartHandshake size={20} />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-temple-900 font-serif">Record Initial Donation / Contribution</h4>
                  <p className="text-xs text-gray-600">Optionally record an opening seva amount right now during registration.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={recordInitialDonation} 
                  onChange={(e) => setRecordInitialDonation(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-saffron-600"></div>
              </label>
            </div>

            {recordInitialDonation && (
              <div className="pt-4 border-t border-amber-200/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Quick Seva Amount Presets</label>
                  <div className="flex flex-wrap gap-2">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setInitialDonation({ ...initialDonation, amount: String(amt) })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          initialDonation.amount === String(amt)
                            ? 'bg-saffron-600 text-white border-saffron-700 shadow-xs font-semibold'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-amber-100/60'
                        }`}
                      >
                        ₹{amt.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Donation Amount (₹) *</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-bold">₹</span>
                    <input 
                      type="number" 
                      min="1"
                      name="amount"
                      value={initialDonation.amount} 
                      onChange={handleDonationChange}
                      placeholder="e.g. 5100" 
                      className="pl-8 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm font-medium text-gray-900" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
                  <select 
                    name="paymentMethod" 
                    value={initialDonation.paymentMethod} 
                    onChange={handleDonationChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm"
                  >
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="CASH">Cash Seva</option>
                    <option value="BANK_TRANSFER">NEFT / RTGS / IMPS Bank Transfer</option>
                    <option value="CHEQUE">Cheque / Demand Draft</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Seva Purpose</label>
                  <select 
                    name="purpose" 
                    value={initialDonation.purpose} 
                    onChange={handleDonationChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm"
                  >
                    <option value="Temple Deity Seva & Annadanam">Temple Deity Seva & Annadanam</option>
                    <option value="Sri Sri Radha Gopinath Janmashtami Seva">Sri Sri Radha Gopinath Janmashtami Seva</option>
                    <option value="Gita Daan & Shastra Seva">Gita Daan & Shastra Seva</option>
                    <option value="Sadhu & Vaishnava Seva">Sadhu & Vaishnava Seva</option>
                    <option value="Temple Construction & Renovation">Temple Construction & Renovation</option>
                    <option value="Govardhan Puja Annakut Seva">Govardhan Puja Annakut Seva</option>
                    <option value="Life Patron Seva">Life Patron Seva</option>
                    <option value="General Temple Donation">General Temple Donation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Transaction Reference / UTR</label>
                  <input 
                    type="text" 
                    name="transactionRef" 
                    value={initialDonation.transactionRef} 
                    onChange={handleDonationChange}
                    placeholder="e.g. UPI Ref / Cheque No / Cash Voucher" 
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" 
                  />
                </div>

                <div className="col-span-2 pt-2 flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="sendReceiptNow"
                    checked={initialDonation.sendReceiptNow} 
                    onChange={(e) => setInitialDonation({ ...initialDonation, sendReceiptNow: e.target.checked })}
                    className="h-4 w-4 text-saffron-600 focus:ring-saffron-500 border-gray-300 rounded" 
                  />
                  <label htmlFor="sendReceiptNow" className="text-xs text-gray-700 flex items-center font-medium">
                    <CheckCircle2 size={14} className="text-emerald-600 mr-1.5" />
                    Dispatch automated WhatsApp receipt with Sri Sri Radha Gopinath blessings immediately
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-5 border-t border-gray-200 flex justify-end">
          <Link to="/donors" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-saffron-500 mr-3">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="inline-flex justify-center py-2 px-5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-saffron-600 hover:bg-saffron-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-saffron-500 disabled:opacity-70 transition-all font-serif">
            <Save size={18} className="mr-2" />
            {loading ? 'Registering...' : recordInitialDonation && initialDonation.amount ? 'Register Devotee & Record Seva' : 'Save Devotee'}
          </button>
        </div>
      </form>
    </div>
  );
}
